import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, relative, isAbsolute } from 'node:path';
import { handleApi } from './handler.mjs';
const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
createServer(async (request, response) => {
  const url = new URL(request.url, origin);
  if (url.pathname.startsWith('/api/')) {
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers))
      if (value) headers.set(key, String(value));
    const webRequest = new Request(url, {
      method: request.method,
      headers,
      ...(request.method === 'GET' || request.method === 'HEAD'
        ? {}
        : { body: request, duplex: 'half' }),
    });
    const result = await handleApi(webRequest, request.socket.remoteAddress);
    response.writeHead(result.status, {
      ...Object.fromEntries(result.headers),
      ...(result.headers.getSetCookie().length
        ? { 'set-cookie': result.headers.getSetCookie() }
        : {}),
    });
    response.end(Buffer.from(await result.arrayBuffer()));
    return;
  }
  try {
    if (!['GET', 'HEAD'].includes(request.method)) throw new Error('Method not allowed');
    const file = resolve(
      'dist',
      '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
    );
    const path = relative(resolve('dist'), file);
    if (path.startsWith('..') || isAbsolute(path)) throw new Error('Invalid path');
    const content = await readFile(file);
    response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(404);
    response.end('Not found. Run npm run build first.');
  }
}).listen(Number(process.env.PORT || 3001), '127.0.0.1', function () {
  console.log(`GhostCommits backend: http://127.0.0.1:${this.address().port}`);
});
