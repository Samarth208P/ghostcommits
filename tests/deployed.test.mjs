import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';
import { BlobsServer } from '@netlify/blobs/server';
import { setEnvironmentContext } from '@netlify/blobs';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('Netlify API: durable OAuth, tenant isolation, immutable bounties, revisions and atomic awards', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'ghostcommits-blobs-'));
  const blobs = new BlobsServer({ directory, logger() {} });
  const serverAddress = await blobs.start();
  const blobURL = `http://127.0.0.1:${serverAddress.port}`;
  setEnvironmentContext({
    siteID: 'test-site',
    deployID: '0123456789abcdef01234567',
    primaryRegion: 'us-east-2',
    token: 'test-token',
    edgeURL: blobURL,
    uncachedEdgeURL: blobURL,
  });
  process.env.CONTEXT = 'production';
  const originalFetch = globalThis.fetch;
  let writes = Promise.resolve();
  const versions = new Map();
  t.after(async () => {
    globalThis.fetch = originalFetch;
    await blobs.stop();
    await rm(directory, { recursive: true, force: true });
  });
  process.env.APP_ORIGIN = 'https://ghostcommits.example';
  process.env.GITHUB_APP_ID = '123';
  process.env.GITHUB_APP_PRIVATE_KEY = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  }).privateKey.export({ type: 'pkcs8', format: 'pem' });
  process.env.GITHUB_CLIENT_ID = 'test-client';
  process.env.GITHUB_CLIENT_SECRET = 'test-secret';
  process.env.SESSION_ENCRYPTION_KEY = '01'.repeat(32);
  process.env.SPONSOR_TOKEN = '';
  const repo = 'owner/demo';
  let loginId = 1;
  let canMaintain = true;
  const prs = [];
  let revised = 0;
  globalThis.fetch = async (url, options = {}) => {
    const u = new URL(url);
    if (u.origin === blobURL) {
      // The filesystem emulator omits GET ETags and its check/write isn't atomic.
      // Supply its own returned PUT ETag and serialize access to model the hosted contract.
      const result = writes.then(async () => {
        const response = await originalFetch(url, options);
        if (options.method?.toUpperCase() === 'PUT' && response.ok)
          versions.set(u.pathname, response.headers.get('etag'));
        if (options.method?.toUpperCase() === 'GET' && response.ok && versions.has(u.pathname)) {
          const headers = new Headers(response.headers);
          headers.set('etag', versions.get(u.pathname));
          return new Response(await response.arrayBuffer(), { status: response.status, headers });
        }
        return response;
      });
      writes = result.catch(() => {});
      return result;
    }
    const path = u.pathname;
    if (path === '/login/oauth/access_token') {
      assert.ok(JSON.parse(options.body).code_verifier);
      return Response.json({ access_token: `private-token-${loginId}`, expires_in: 28800 });
    }
    if (path === '/user') return Response.json({ id: loginId, login: `maintainer-${loginId}` });
    if (path === '/user/installations') return Response.json({ installations: [{ id: 7 }] });
    if (path === '/user/installations/7/repositories')
      return Response.json({
        repositories: [
          { full_name: repo, default_branch: 'main', permissions: { maintain: true } },
        ],
      });
    if (path === `/repos/${repo}`)
      return Response.json({
        full_name: repo,
        default_branch: 'main',
        private: false,
        permissions: { maintain: canMaintain },
      });
    if (path === `/repos/${repo}/installation`)
      return Response.json({ id: 7, permissions: { contents: 'write', pull_requests: 'write' } });
    if (path === '/app/installations/7/access_tokens')
      return Response.json({
        token: 'installation-token',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });
    if (path === `/repos/${repo}/pulls` && options.method === 'GET')
      return Response.json(
        prs.filter((pr) => `${repo.split('/')[0]}:${pr.head.ref}` === u.searchParams.get('head')),
      );
    if (path.includes('/git/ref/heads/')) return Response.json({ object: { sha: 'head-sha' } });
    if (path.endsWith('/git/commits/head-sha')) return Response.json({ tree: { sha: 'tree-sha' } });
    if (path.endsWith('/git/trees')) return Response.json({ sha: 'tree-sha' });
    if (path.endsWith('/git/commits')) {
      assert.equal(JSON.parse(options.body).author.name, 'GhostCommits Bot');
      return Response.json({ sha: 'a'.repeat(40) });
    }
    if (path.endsWith('/git/refs')) return Response.json({});
    if (path.includes('/git/refs/heads/') && options.method === 'PATCH') {
      assert.equal(JSON.parse(options.body).force, false);
      revised++;
      return Response.json({});
    }
    if (path === `/repos/${repo}/pulls` && options.method === 'POST') {
      const input = JSON.parse(options.body);
      const pr = {
        number: prs.length + 1,
        html_url: `https://github.com/${repo}/pull/${prs.length + 1}`,
        head: { ref: input.head, repo: { full_name: repo } },
        base: { ref: 'main', repo: { full_name: repo } },
        merged: false,
        state: 'open',
      };
      prs.push(pr);
      return Response.json(pr);
    }
    if (path.match(/\/pulls\/\d+$/)) return Response.json(prs[Number(path.split('/').at(-1)) - 1]);
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };
  const { default: handler } = await import('../netlify/functions/api.mjs');
  const store = await import('../server/store.mjs');
  const { snapshot, transact } = store;
  const call = async (path, data, { cookie, token, origin = process.env.APP_ORIGIN } = {}) => {
    const response = await handler(
      new Request(`${process.env.APP_ORIGIN}/api${path}`, {
        method: data === undefined ? 'GET' : 'POST',
        headers: {
          Origin: origin,
          ...(cookie ? { Cookie: cookie } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      }),
      { ip: 'test-client', deploy: { context: 'production' } },
    );
    return {
      status: response.status,
      headers: response.headers,
      body: response.status === 302 ? null : await response.json(),
    };
  };
  assert.equal((await call('/health')).body.storage, 'blobs');
  assert.equal((await call('/config')).body.maintainerConfigured, true);
  assert.equal((await call('/submissions', undefined, { token: '__proto__' })).status, 401);
  const begin = await call('/github/login');
  const oauth = new URL(begin.headers.get('location'));
  assert.equal(oauth.searchParams.get('code_challenge_method'), 'S256');
  const oauthCookie = begin.headers.getSetCookie()[0].split(';')[0];
  assert.match(begin.headers.getSetCookie()[0], /HttpOnly.*SameSite=Lax.*Secure/);
  assert.equal(
    (await call(`/github/callback?state=${oauth.searchParams.get('state')}&code=code`, undefined))
      .status,
    400,
  );
  const done = await call(
    `/github/callback?state=${oauth.searchParams.get('state')}&code=code`,
    undefined,
    { cookie: oauthCookie },
  );
  assert.equal(done.status, 302);
  const cookie = done.headers
    .getSetCookie()
    .find((c) => c.startsWith('gc_maintainer='))
    .split(';')[0];
  assert.equal((await call('/maintainer', undefined, { cookie })).body.user.id, '1');
  assert.equal(
    (
      await call(`/github/callback?state=${oauth.searchParams.get('state')}&code=code`, undefined, {
        cookie: oauthCookie,
      })
    ).status,
    401,
  );
  assert.ok(!JSON.stringify(await snapshot()).includes('private-token-1'));
  assert.equal(
    (await call('/sponsor/repositories', undefined, { cookie })).body[0].repository,
    repo,
  );
  const input = {
    title: 'Improve README',
    description: 'Document the example',
    criteria: 'One clear example\nValid Markdown',
    repository: repo,
    amount: '0.01',
    requestId: 'bounty-create-1',
  };
  assert.equal(
    (await call('/sponsor/bounties', input, { cookie, origin: 'https://evil.example' })).status,
    403,
  );
  canMaintain = false;
  assert.equal((await call('/sponsor/bounties', input, { cookie })).status, 403);
  canMaintain = true;
  const bounty = (await call('/sponsor/bounties', input, { cookie })).body;
  assert.ok(bounty.id);
  assert.equal(
    (await call('/sponsor/bounties', { ...input, amount: '99' }, { cookie })).body.amount,
    '0.01',
  );
  const keys = generateKeyPairSync('ed25519');
  const publicKey = keys.publicKey
    .export({ type: 'spki', format: 'der' })
    .subarray(-32)
    .toString('base64');
  const proof = (challenge) => ({
    id: challenge.id,
    signature: sign(null, Buffer.from(challenge.message), keys.privateKey).toString('base64'),
  });
  const challenge = (await call('/auth/challenge', { publicKey })).body;
  const token = (await call('/auth/verify', proof(challenge))).body.token;
  assert.ok(token);
  const submissions = [];
  for (let i = 0; i < 3; i++) {
    const submission = (
      await call(
        '/submissions',
        {
          bountyId: bounty.id,
          title: 'README example',
          description: 'An example',
          path: 'README.md',
          content: 'Before',
          requestId: `submission-${i}`,
        },
        { token },
      )
    ).body;
    assert.ok(submission.pr, JSON.stringify(submission));
    assert.equal(submission.terms.amount, '0.01');
    submissions.push(submission);
  }
  const s = submissions[0];
  assert.equal(
    (await call('/submissions/revise', { id: s.id, content: 'After review' }, { token })).status,
    200,
  );
  assert.equal(revised, 1);
  for (const pr of prs) {
    pr.merged = true;
    pr.state = 'closed';
    pr.merge_commit_sha = 'b'.repeat(40);
  }
  assert.equal(
    (await call('/submissions/revise', { id: s.id, content: 'Too late' }, { token })).status,
    409,
  );
  // Generate a valid synthetic Sapling checksum; no real user's address is used.
  const alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  const prefix = 'ztestsapling';
  const data = Array(69).fill(0);
  let checksum = 1;
  for (const v of [...prefix]
    .map((c) => c.charCodeAt(0) >> 5)
    .concat(
      0,
      [...prefix].map((c) => c.charCodeAt(0) & 31),
      data,
      [0, 0, 0, 0, 0, 0],
    )) {
    const top = checksum >>> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ v;
    [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3].forEach((g, i) => {
      if ((top >>> i) & 1) checksum ^= g;
    });
  }
  checksum ^= 1;
  const address = `${prefix}1${data.map((v) => alphabet[v]).join('')}${Array.from({ length: 6 }, (_, i) => alphabet[(checksum >>> (5 * (5 - i))) & 31]).join('')}`;
  const claims = [];
  for (const submission of submissions) {
    assert.equal((await call('/submissions/verify', { id: submission.id }, { token })).status, 200);
    const c = (await call('/claims/challenge', { submissionId: submission.id, address }, { token }))
      .body;
    assert.ok(c.message, JSON.stringify(c));
    const signed = proof(c);
    const claim = (await call('/claims', signed, { token })).body;
    assert.ok(claim.id, JSON.stringify(claim));
    claims.push(claim);
    assert.equal((await call('/claims', signed, { token })).body.id, claim.id);
  }
  assert.equal((await call('/config')).body.bounties[0].awardAvailable, true);
  assert.equal(
    (
      await call(
        '/sponsor/reject',
        { id: claims[2].id, reason: 'Example does not match task' },
        { cookie },
      )
    ).body.status,
    'rejected',
  );
  const foreignSession = 'a'.repeat(64);
  await transact((state) => {
    state.maintainers[createHash('sha256').update(foreignSession).digest('hex')] = {
      id: '2',
      login: 'other',
      expiresAt: Date.now() + 60000,
    };
  });
  const foreign = { cookie: `gc_maintainer=${foreignSession}` };
  assert.deepEqual((await call('/sponsor/claims', undefined, foreign)).body, []);
  assert.equal((await call('/sponsor/reserve', { id: claims[0].id }, foreign)).status, 404);
  const reserved = await Promise.all(
    claims.slice(0, 2).map((c) => call('/sponsor/reserve', { id: c.id }, { cookie })),
  );
  assert.deepEqual(reserved.map((r) => r.status).sort(), [200, 409]);
  const selected = reserved.find((r) => r.status === 200).body;
  const txid = 'c'.repeat(64);
  assert.equal(
    (await call('/sponsor/record', { id: selected.id, txid }, { cookie })).body.status,
    'recorded-unverified',
  );
  assert.equal((await call('/sponsor/record', { id: selected.id, txid }, { cookie })).status, 200);
  assert.equal((await call('/config')).body.bounties[0].awardAvailable, false);
  // A fresh store module reads durable data rather than a warm-instance cache.
  const fresh = await import(`../server/store.mjs?cold=${Date.now()}`);
  assert.equal((await fresh.snapshot()).claims.find((c) => c.id === selected.id).txid, txid);
  assert.ok((await fresh.snapshot()).sessions[token]);
  const preview = await handler(new Request(`${process.env.APP_ORIGIN}/api/config`), {
    ip: 'preview-client',
    deploy: { context: 'deploy-preview' },
  });
  assert.deepEqual((await preview.json()).bounties, []);
  assert.equal((await call('/config')).body.bounties.length, 1);
  let effects = 0;
  // A stale writer must fail instead of overwriting another instance or rerunning effects.
  await assert.rejects(
    transact(async (draft) => {
      effects++;
      draft.bounties[0].title = 'Must not persist';
      await fresh.transact((other) => {
        other.bounties[0].description = 'Concurrent durable update';
      });
    }),
    (error) => error.status === 409,
  );
  assert.equal(effects, 1);
  assert.equal((await snapshot()).bounties[0].title, input.title);
  assert.equal((await snapshot()).bounties[0].description, 'Concurrent durable update');
  let ready = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const previewContext = { deploy: { context: 'deploy-preview' } };
  const firstWrites = await Promise.allSettled(
    [store, fresh].map((instance, index) =>
      instance.withStorageContext(previewContext, () =>
        instance.transact(async (draft) => {
          ready++;
          if (ready === 2) release();
          await gate;
          draft.bounties.push({ id: `preview-${index}` });
        }),
      ),
    ),
  );
  assert.equal(firstWrites.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(firstWrites.find((r) => r.status === 'rejected').reason.status, 409);
  assert.equal(
    (await store.withStorageContext(previewContext, () => snapshot())).bounties.length,
    1,
  );
  assert.equal((await snapshot()).bounties[0].id, bounty.id);
  assert.equal((await call('/maintainer/logout', {}, { cookie })).status, 200);
  assert.equal((await call('/maintainer', undefined, { cookie })).body.user, null);
});
