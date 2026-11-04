import { spawn } from 'node:child_process';
const processes = [
  spawn(process.execPath, ['--env-file-if-exists=.env', '--watch', 'server/index.mjs'], {
    stdio: 'inherit',
  }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' }),
];
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of processes) child.kill();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const child of processes) child.on('exit', stop);
