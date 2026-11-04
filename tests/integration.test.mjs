import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { generateKeyPairSync, sign } from 'node:crypto';
import { once } from 'node:events';
import { identityView, submitView, sponsorView } from '../src/views.js';

test('identity renders while fingerprint is loading and draft HTML is escaped', () => {
  const state = {
    identity: { createdAt: new Date().toISOString() },
    fingerprint: '',
    submissions: [],
    config: { bounty: { configured: false, repository: 'owner/repo' } },
    draft: { title: '<script>alert(1)</script>', content: '</textarea><script>', path: 'a.js' },
  };
  assert.doesNotThrow(() => identityView(state));
  assert.ok(submitView(state).includes('&lt;script&gt;'));
  state.review = true;
  assert.match(submitView(state), /disabled/);
  state.sponsorToken = 'test';
  state.claims = [];
  state.config.githubAppConfigured = true;
  assert.match(sponsorView(state), /data-action="check-github"/);
});

test('isolated HTTP flow: authentication, validation, payout reservation and persistence', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'ghostcommits-test-'));
  await mkdir(join(cwd, 'data'));
  await writeFile(
    join(cwd, 'data/store.json'),
    JSON.stringify({
      submissions: [],
      claims: [{ id: 'claim-1', status: 'awaiting-sponsor', amount: '0.5' }],
    }),
  );
  const env = {
    ...process.env,
    PORT: '0',
    APP_ORIGIN: 'http://localhost:5173',
    SPONSOR_TOKEN: 'test-only-secret',
    GITHUB_APP_ID: '',
    GITHUB_APP_PRIVATE_KEY_PATH: '',
    GITHUB_REPOSITORY: '',
    BOUNTY_AMOUNT: '0.5',
  };
  const child = spawn(process.execPath, [resolve('server/index.mjs')], {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    const ended = once(child, 'exit');
    child.kill();
    await ended;
    await rm(cwd, { recursive: true, force: true });
  });
  const base = await new Promise((res, rej) => {
    const timeout = setTimeout(() => rej(new Error('Server startup timed out')), 10000);
    child.once('error', rej);
    child.stderr.on('data', (data) => rej(new Error(String(data))));
    child.stdout.on('data', (data) => {
      const match = String(data).match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) {
        clearTimeout(timeout);
        res(match[0]);
      }
    });
  });
  const call = async (path, data, token, origin) => {
    const response = await fetch(base + '/api' + path, {
      method: data === undefined ? 'GET' : 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(origin ? { Origin: origin } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    return { status: response.status, body: await response.json() };
  };
  assert.equal((await call('/config')).body.bounty.configured, false);
  assert.equal((await call('/config', undefined, undefined, 'https://other.invalid')).status, 403);
  for (const input of [null, [], 'text', 1])
    assert.equal((await call('/auth/challenge', input)).status, 400);
  assert.equal((await call('/submissions')).status, 401);
  const keys = generateKeyPairSync('ed25519');
  const publicKey = keys.publicKey
    .export({ type: 'spki', format: 'der' })
    .subarray(-32)
    .toString('base64');
  const challenge = (await call('/auth/challenge', { publicKey })).body;
  const proof = {
    id: challenge.id,
    signature: sign(null, Buffer.from(challenge.message), keys.privateKey).toString('base64'),
  };
  const token = (await call('/auth/verify', proof)).body.token;
  assert.ok(token);
  assert.equal((await call('/auth/verify', proof)).status, 401);
  assert.deepEqual((await call('/submissions', undefined, token)).body, []);
  assert.equal((await call('/submissions', {}, token)).status, 503);
  assert.equal((await call('/sponsor/claims', undefined, 'wrong')).status, 401);
  const reservations = await Promise.all([
    call('/sponsor/reserve', { id: 'claim-1' }, env.SPONSOR_TOKEN),
    call('/sponsor/reserve', { id: 'claim-1' }, env.SPONSOR_TOKEN),
  ]);
  assert.deepEqual(reservations.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    (await call('/sponsor/record', { id: 'claim-1', txid: 'invalid' }, env.SPONSOR_TOKEN)).status,
    400,
  );
  const recorded = await call(
    '/sponsor/record',
    { id: 'claim-1', txid: 'AB'.repeat(32) },
    env.SPONSOR_TOKEN,
  );
  assert.equal(recorded.body.status, 'recorded-unverified');
  assert.equal(recorded.body.txid, 'ab'.repeat(32));
  assert.equal(
    (await call('/sponsor/record', { id: 'claim-1', txid: 'AB'.repeat(32) }, env.SPONSOR_TOKEN))
      .status,
    200,
  );
  assert.equal(
    (await call('/sponsor/record', { id: 'claim-1', txid: 'CD'.repeat(32) }, env.SPONSOR_TOKEN))
      .status,
    409,
  );
  const disk = JSON.parse(await readFile(join(cwd, 'data/store.json'), 'utf8'));
  assert.equal(disk.claims[0].status, 'recorded-unverified');
});
