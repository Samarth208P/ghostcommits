import test from 'node:test';
import assert from 'node:assert/strict';
import { request, authenticated, clearSession } from '../src/api.js';

test('client rejects non-JSON success responses and recovers a restarted session', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
    clearSession();
  });
  globalThis.fetch = async () => new Response('<html>Proxy error</html>');
  await assert.rejects(request('/config'), /valid response/);
  const key = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
  const identity = {
    publicKey: Buffer.from(await crypto.subtle.exportKey('raw', key.publicKey)).toString('base64'),
    privateKey: Buffer.from(await crypto.subtle.exportKey('pkcs8', key.privateKey)).toString(
      'base64',
    ),
  };
  let logins = 0;
  let expired = false;
  let writes = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/challenge'))
      return Response.json({ id: 'challenge', message: 'signed challenge' });
    if (url.endsWith('/auth/verify')) return Response.json({ token: `token-${++logins}` });
    if (expired && options.headers.Authorization === 'Bearer token-1')
      return Response.json({ error: 'Expired' }, { status: 401 });
    if (options.method === 'POST') {
      writes++;
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json([]);
  };
  await authenticated(identity, '/submissions');
  expired = true;
  assert.deepEqual(await authenticated(identity, '/submissions'), []);
  assert.equal(logins, 2);
  await assert.rejects(authenticated(identity, '/submissions', { title: 'draft' }), /Unauthorized/);
  assert.equal(writes, 1, 'A failed mutation must not be automatically replayed');
  await authenticated(identity, '/submissions');
  assert.equal(logins, 3);
});
