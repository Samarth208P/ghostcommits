import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync } from 'node:crypto';

test('GitHub installation, token caching, interrupted PR retry and merge verification (mocked)', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'ghostcommits-github-'));
  const originalFetch = globalThis.fetch;
  t.after(async () => {
    globalThis.fetch = originalFetch;
    await rm(directory, { recursive: true, force: true });
  });
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const keyPath = join(directory, 'test.pem');
  await writeFile(keyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  process.env.GITHUB_APP_ID = '123';
  process.env.GITHUB_APP_PRIVATE_KEY_PATH = keyPath;
  process.env.GITHUB_REPOSITORY = 'owner/repo';
  process.env.GITHUB_BASE_BRANCH = 'main';
  let tokenRequests = 0;
  let createdPR = false;
  let createAttempts = 0;
  let mergeOverride = {};
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    if (path === '/repos/owner/repo/installation')
      return Response.json({ id: 1, permissions: { contents: 'write', pull_requests: 'write' } });
    if (path === '/app/installations/1/access_tokens') {
      tokenRequests++;
      assert.deepEqual(JSON.parse(options.body).repositories, ['repo']);
      return Response.json({
        token: 'mock-token',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });
    }
    if (path === '/repos/owner/repo/pulls' && options.method === 'GET')
      return Response.json(
        createdPR ? [{ number: 42, html_url: 'https://github.com/owner/repo/pull/42' }] : [],
      );
    if (path.includes('/git/ref/heads/')) return Response.json({ object: { sha: 'head-sha' } });
    if (path === '/repos/owner/repo/git/commits/head-sha')
      return Response.json({ tree: { sha: 'tree-sha' } });
    if (path === '/repos/owner/repo/git/trees') return Response.json({ sha: 'new-tree' });
    if (path === '/repos/owner/repo/git/commits') return Response.json({ sha: 'new-commit' });
    if (path === '/repos/owner/repo/git/refs')
      return Response.json({ ref: 'refs/heads/ghost/id-1' });
    if (path === '/repos/owner/repo/pulls' && options.method === 'POST') {
      createAttempts++;
      createdPR = true;
      throw new Error('Connection interrupted after GitHub created the PR');
    }
    if (path === '/repos/owner/repo/pulls/42')
      return Response.json({
        base: { ref: 'main', repo: { full_name: 'owner/repo' } },
        head: { ref: 'ghost/id-1', repo: { full_name: 'owner/repo' } },
        merged: true,
        state: 'closed',
        merge_commit_sha: 'a'.repeat(40),
        ...mergeOverride,
      });
    throw new Error(`Unexpected GitHub request: ${options.method} ${url}`);
  };
  const app = await import('../server/github-app.mjs');
  const github = await import('../server/github.mjs');
  assert.equal((await app.checkConnection()).connected, true);
  const submission = {
    id: 'id-1',
    repository: 'owner/repo',
    title: 'Fix',
    description: 'Details',
    path: 'file.js',
    content: 'fixed',
  };
  await assert.rejects(github.createPullRequest(submission), /interrupted/);
  submission.pr = await github.createPullRequest(submission);
  assert.equal(submission.pr.number, 42);
  assert.equal(createAttempts, 1);
  assert.equal(tokenRequests, 1);
  assert.equal((await github.verifyMerge(submission)).sha, 'a'.repeat(40));
  for (const override of [
    { base: { ref: 'other', repo: { full_name: 'owner/repo' } } },
    { head: { ref: 'ghost/id-1', repo: { full_name: 'other/repo' } } },
    { merge_commit_sha: null },
    { base: null },
  ]) {
    mergeOverride = override;
    await assert.rejects(github.verifyMerge(submission), /does not match/);
  }
  await assert.rejects(
    github.createPullRequest({ ...submission, repository: '../invalid' }),
    /Invalid repository/,
  );
});
