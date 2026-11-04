import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getDatabase } from '@netlify/database';
import { AsyncLocalStorage } from 'node:async_hooks';

const context = new AsyncLocalStorage();
const remote = Boolean(process.env.NETLIFY || process.env.NETLIFY_DB_URL || globalThis.Netlify);
let database;
function db() {
  if (!database) {
    database = getDatabase();
    database.pool.on('error', () => console.error('An idle database connection closed.'));
  }
  return database;
}
export async function closeStore() {
  if (database) {
    await database.pool.end();
    database = undefined;
  }
}
function normalize(value) {
  return Object.assign(
    {
      submissions: [],
      claims: [],
      bounties: [],
      challenges: {},
      sessions: {},
      oauth: {},
      maintainers: {},
    },
    value,
  );
}

const directory = resolve('data');
const filename = resolve(directory, 'store.json');
let queue = Promise.resolve();
if (!remote) await mkdir(directory, { recursive: true });
let state;
try {
  state = remote ? null : normalize(JSON.parse(await readFile(filename, 'utf8')));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  state = normalize({});
}

export async function snapshot() {
  if (context.getStore()) return structuredClone(context.getStore());
  if (remote) {
    const { rows } = await db().pool.query('SELECT payload FROM ghostcommits_state WHERE id = 1');
    if (!rows[0]) throw new Error('Database migration is missing.');
    return normalize(rows[0].payload);
  }
  return structuredClone(state);
}

// One server process owns this store. A failed write never changes in-memory state.
export async function transact(operation) {
  if (context.getStore()) return operation(context.getStore());
  if (remote) {
    const client = await db().pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL lock_timeout = '15s'");
      const { rows } = await client.query(
        'SELECT payload FROM ghostcommits_state WHERE id = 1 FOR UPDATE',
      );
      if (!rows[0]) throw new Error('Database migration is missing.');
      const draft = normalize(rows[0].payload);
      const value = await context.run(draft, () => operation(draft));
      await client.query('UPDATE ghostcommits_state SET payload = $1::jsonb WHERE id = 1', [
        JSON.stringify(draft),
      ]);
      await client.query('COMMIT');
      return structuredClone(value);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  const result = queue.then(async () => {
    const draft = structuredClone(state);
    const value = await context.run(draft, () => operation(draft));
    await writeFile(`${filename}.tmp`, JSON.stringify(draft, null, 2), { mode: 0o600 });
    await rename(`${filename}.tmp`, filename);
    state = draft;
    return structuredClone(value);
  });
  queue = result.catch(() => {});
  return result;
}
