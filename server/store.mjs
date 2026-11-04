import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getStore, getDeployStore } from '@netlify/blobs';
import { AsyncLocalStorage } from 'node:async_hooks';

const transaction = new AsyncLocalStorage();
const deployment = new AsyncLocalStorage();
const remote = Boolean(
  process.env.NETLIFY ||
  process.env.NETLIFY_BLOBS_CONTEXT ||
  globalThis.Netlify ||
  globalThis.netlifyBlobsContext,
);
export const storageMode = remote ? 'blobs' : 'local';

export function withStorageContext(context, operation) {
  return deployment.run(context.deploy?.context || 'preview', operation);
}

function blobs() {
  // Preview deployments must never read or overwrite production state.
  const scope = deployment.getStore() || process.env.CONTEXT;
  const options = { name: 'ghostcommits-state-v1', consistency: 'strong' };
  return scope === 'production' ? getStore(options) : getDeployStore(options);
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
let state;
if (!remote) {
  await mkdir(directory, { recursive: true });
  try {
    state = normalize(JSON.parse(await readFile(filename, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    state = normalize({});
  }
}

export async function snapshot() {
  if (transaction.getStore()) return structuredClone(transaction.getStore());
  if (remote) return normalize(await blobs().get('state', { type: 'json' }));
  return structuredClone(state);
}

export async function transact(operation) {
  if (transaction.getStore()) return operation(transaction.getStore());
  if (remote) {
    const store = blobs();
    const entry = await store.getWithMetadata('state', { type: 'json' });
    if (entry && !entry.etag) throw new Error('Storage did not return a version.');
    const draft = normalize(entry?.data);
    const value = await transaction.run(draft, () => operation(draft));
    // Commit all changes (including nested challenge consumption) together.
    // Never retry the callback: it may have performed a GitHub operation.
    const result = await store.setJSON(
      'state',
      draft,
      entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true },
    );
    if (!result.modified)
      throw Object.assign(
        new Error(
          'Another request updated the workspace. Refresh and retry this request. If a wallet transfer was attempted, check wallet history before sending again.',
        ),
        { status: 409 },
      );
    return structuredClone(value);
  }
  // Local development has one process per data directory.
  const result = queue.then(async () => {
    const draft = structuredClone(state);
    const value = await transaction.run(draft, () => operation(draft));
    await writeFile(`${filename}.tmp`, JSON.stringify(draft, null, 2), { mode: 0o600 });
    await rename(`${filename}.tmp`, filename);
    state = draft;
    return structuredClone(value);
  });
  queue = result.catch(() => {});
  return result;
}
