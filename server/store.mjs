import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve('data');
const filename = resolve(directory, 'store.json');
let queue = Promise.resolve();
await mkdir(directory, { recursive: true });
let state;
try {
  state = JSON.parse(await readFile(filename, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  state = { submissions: [], claims: [] };
}

export function snapshot() {
  return structuredClone(state);
}

// One server process owns this store. A failed write never changes in-memory state.
export function transact(operation) {
  const result = queue.then(async () => {
    const draft = structuredClone(state);
    const value = await operation(draft);
    await writeFile(`${filename}.tmp`, JSON.stringify(draft, null, 2), { mode: 0o600 });
    await rename(`${filename}.tmp`, filename);
    state = draft;
    return value;
  });
  queue = result.catch(() => {});
  return result;
}
