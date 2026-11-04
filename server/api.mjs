import { randomUUID } from 'node:crypto';
import { snapshot, transact, storageMode } from './store.mjs';
import { createPullRequest, verifyMerge, revisePullRequest } from './github.mjs';
import { githubReady, appConfigured, installationUrl, checkConnection } from './github-app.mjs';
import {
  fail,
  issueChallenge,
  consumeChallenge,
  createSession,
  authenticate,
  authenticateSponsor,
} from './auth.mjs';
import { isSaplingTestnetAddress } from './zcash.mjs';
import {
  maintainer,
  maintainerConfigured,
  login,
  finishLogin,
  logout,
  repositories,
} from './maintainers.mjs';
import { awardTaken, publishBounty, authorizeClaim, sponsorClaims } from './bounties.mjs';

const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
const bounty = {
  id: 'bounty-001',
  title: process.env.BOUNTY_TITLE || 'Improve wallet synchronization',
  description:
    process.env.BOUNTY_DESCRIPTION ||
    'Help a wallet pick up where it left off. Improve reconnect handling so synchronization resumes without losing progress.',
  criteria: (
    process.env.BOUNTY_CRITERIA ||
    'Resume sync after a connection interruption|Preserve existing synchronization progress|Document the reconnect behavior'
  ).split('|'),
  repository: process.env.GITHUB_REPOSITORY || 'example/zcash-wallet',
  amount: process.env.BOUNTY_AMOUNT || '0.5',
  issueUrl: /^https:\/\/github\.com\//.test(process.env.BOUNTY_ISSUE_URL || '')
    ? process.env.BOUNTY_ISSUE_URL
    : '',
  configured: githubReady,
  network: 'testnet',
};
if (!/^\d+(\.\d{1,8})?$/.test(bounty.amount) || Number(bounty.amount) <= 0)
  throw new Error(
    'BOUNTY_AMOUNT must be a positive ZEC decimal with at most eight decimal places.',
  );
const requests = new Map();
function rateLimit(request) {
  const now = Date.now();
  for (const [ip, record] of requests) if (record.until < now) requests.delete(ip);
  const ip = request.socket.remoteAddress;
  const record = requests.get(ip) || { count: 0, until: now + 60000 };
  record.count += 1;
  requests.set(ip, record);
  if (record.count > 120) fail('Too many requests. Please wait a minute.', 429);
}
async function body(request) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 180000) fail('Submission exceeds the 180 KB request limit.', 413);
    chunks.push(chunk);
  }
  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString() || '{}');
  } catch {
    fail('Request must contain valid JSON.');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input))
    fail('Request must contain a JSON object.');
  return input;
}
function text(value, name, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    fail(`${name} is required and must be under ${max} characters.`);
  return value.trim();
}
function owned(state, id, publicKey) {
  const item = state.submissions.find((s) => s.id === id && s.publicKey === publicKey);
  if (!item) fail('Contribution not found.', 404);
  return item;
}
function visibleClaim(claim) {
  if (!claim) return null;
  const { signature, ...publicRecord } = claim;
  return publicRecord;
}

export async function api(request, pathname, response) {
  rateLimit(request);
  if (request.headers.origin && request.headers.origin !== origin)
    fail('This origin is not allowed.', 403);
  const method = request.method;
  if (method === 'GET' && pathname === '/api/health') {
    await snapshot();
    return {
      ok: true,
      storage: storageMode,
      githubConfigured: maintainerConfigured,
      network: 'testnet',
    };
  }
  if (method === 'GET' && pathname === '/api/config') {
    const state = await snapshot();
    const available = state.bounties.map((b) => ({
      ...b,
      awardAvailable: !awardTaken(state, b.id),
    }));
    return {
      bounty: available[0] || {
        ...bounty,
        configured: githubReady,
        awardAvailable: !awardTaken(state, bounty.id),
      },
      bounties: available,
      githubAppConfigured: appConfigured,
      maintainerConfigured,
      sponsorConfigured: Boolean(process.env.SPONSOR_TOKEN),
    };
  }
  if (method === 'GET' && pathname === '/api/github/login')
    return { redirect: await login(response) };
  if (method === 'GET' && pathname === '/api/github/callback')
    return { redirect: await finishLogin(request, response, new URL(request.url, origin)) };
  if (method === 'GET' && pathname === '/api/maintainer') {
    const user = await maintainer(request, false);
    return { user: user ? { id: user.id, login: user.login } : null };
  }
  const input = method === 'POST' ? await body(request) : {};
  if (method === 'POST' && pathname === '/api/auth/challenge')
    return issueChallenge(input.publicKey, 'login');
  if (method === 'POST' && pathname === '/api/auth/verify') {
    const challenge = await consumeChallenge(input.id, input.signature, 'login');
    return { token: await createSession(challenge.publicKey) };
  }
  if (method === 'POST' && pathname === '/api/maintainer/logout') return logout(request, response);
  if (pathname.startsWith('/api/sponsor')) {
    const user = await maintainer(request, false);
    if (!user) authenticateSponsor(request);
    if (method === 'GET' && pathname === '/api/sponsor/repositories') {
      if (!user) fail('Sign in with GitHub to choose repositories.', 401);
      return repositories(user);
    }
    if (method === 'POST' && pathname === '/api/sponsor/bounties') {
      if (!user) fail('Sign in with GitHub to publish bounties.', 401);
      return publishBounty(user, input);
    }
    if (method === 'POST' && pathname === '/api/sponsor/reject')
      return transact((state) => {
        const claim = authorizeClaim(state, input.id, user);
        if (claim.status !== 'awaiting-sponsor') fail('Only pending claims can be rejected.', 409);
        claim.reason = text(input.reason, 'Reason', 1000);
        claim.status = 'rejected';
        return visibleClaim(claim);
      });
    if (method === 'POST' && pathname === '/api/sponsor/github/connect') return installationUrl();
    if (method === 'POST' && pathname === '/api/sponsor/github/check') return checkConnection();
    if (method === 'GET' && pathname === '/api/sponsor/claims') return sponsorClaims(user);
    if (method === 'POST' && pathname === '/api/sponsor/reserve')
      return transact((state) => {
        const claim = authorizeClaim(state, input.id, user);
        if (!claim) fail('Claim not found.', 404);
        if (claim.status !== 'awaiting-sponsor')
          fail(
            'This payout is already reserved or recorded. Reconcile it before any further transfer.',
            409,
          );
        if (awardTaken(state, claim.bountyId))
          fail('This bounty already has a selected award. Reconcile that transfer first.', 409);
        claim.status = 'payment-reserved';
        claim.reservedAt = new Date().toISOString();
        return visibleClaim(claim);
      });
    if (method === 'POST' && pathname === '/api/sponsor/record')
      return transact((state) => {
        const claim = authorizeClaim(state, input.id, user);
        if (!claim) fail('Claim not found.', 404);
        if (typeof input.txid !== 'string' || !/^[a-fA-F0-9]{64}$/.test(input.txid))
          fail('Enter the 64-character Zcash transaction ID.');
        if (claim.status === 'recorded-unverified' && claim.txid === input.txid.toLowerCase())
          return visibleClaim(claim);
        if (claim.status !== 'payment-reserved')
          fail('Reserve this payout before recording a transaction.', 409);
        if (state.claims.some((c) => c.txid === input.txid.toLowerCase()))
          fail('That transaction is already associated with a claim.', 409);
        claim.txid = input.txid.toLowerCase();
        claim.status = 'recorded-unverified';
        claim.recordedAt = new Date().toISOString();
        return visibleClaim(claim);
      });
    fail('Endpoint not found.', 404);
  }
  const publicKey = await authenticate(request);
  if (method === 'GET' && pathname === '/api/submissions') {
    const state = await snapshot();
    return state.submissions
      .filter((s) => s.publicKey === publicKey)
      .map((s) => ({
        ...s,
        claim: visibleClaim(state.claims.find((c) => c.submissionId === s.id)),
      }));
  }
  if (method === 'POST' && pathname === '/api/submissions') {
    const saved = (await snapshot()).bounties.find((b) => b.id === input.bountyId);
    const terms = saved || (input.bountyId === bounty.id || !input.bountyId ? bounty : null);
    if (!terms || (!saved && !githubReady))
      fail('Choose a published, connected bounty before creating a PR.', 503);
    const title = text(input.title, 'Title', 160);
    const description = text(input.description, 'Description', 6000);
    const path = text(input.path, 'File path', 240);
    if (
      !/^[\w./-]+$/.test(path) ||
      path.startsWith('/') ||
      path.split('/').some((p) => !p || p === '.' || p === '..' || p.toLowerCase() === '.git') ||
      path.toLowerCase().startsWith('.github/workflows/')
    )
      fail('Choose a relative repository file path outside Git internals and workflows.');
    if (typeof input.content !== 'string' || !input.content.length || input.content.length > 120000)
      fail('File contents must be between 1 and 120,000 characters.');
    const requestId = text(input.requestId, 'Request identifier', 80);
    const item = await transact((state) => {
      const previous = state.submissions.find(
        (s) => s.requestId === requestId && s.publicKey === publicKey,
      );
      if (previous) return previous;
      if (state.submissions.filter((s) => s.publicKey === publicKey).length >= 50)
        fail('This identity has reached the MVP submission limit.', 429);
      if (!saved) {
        const previous = state.submissions.find((s) => s.bountyId === terms.id && s.terms);
        if (previous && JSON.stringify(previous.terms) !== JSON.stringify(terms))
          fail('Existing bounty terms have changed. Restore the original configuration.', 409);
      }
      const submission = {
        id: randomUUID(),
        requestId,
        publicKey,
        bountyId: terms.id,
        repository: terms.repository,
        baseBranch: terms.baseBranch || process.env.GITHUB_BASE_BRANCH || 'main',
        terms: structuredClone(terms),
        title,
        description,
        path,
        content: input.content,
        status: 'creating',
        createdAt: new Date().toISOString(),
      };
      state.submissions.push(submission);
      return submission;
    });
    if (item.pr) return item;
    // Serialized external creation prevents concurrent retries duplicating PRs.
    return transact(async (state) => {
      const current = owned(state, item.id, publicKey);
      if (!current.pr) {
        current.pr = await createPullRequest(current);
        current.status = 'in-review';
      }
      return current;
    });
  }
  if (method === 'POST' && pathname === '/api/submissions/revise') {
    if (typeof input.content !== 'string' || !input.content.length || input.content.length > 120000)
      fail('File contents must be between 1 and 120,000 characters.');
    return transact(async (state) => {
      const item = owned(state, input.id, publicKey);
      if (!item.pr) fail('Create the PR before revising.');
      if (item.content === input.content) return item;
      item.revisionSha = await revisePullRequest(item, input.content);
      item.content = input.content;
      item.updatedAt = new Date().toISOString();
      return item;
    });
  }
  if (method === 'POST' && pathname === '/api/submissions/verify') {
    const submission = owned(await snapshot(), input.id, publicKey);
    if (!submission.pr) fail('The PR has not been created yet. Retry the original submission.');
    const evidence = await verifyMerge(submission);
    return transact((state) => {
      const item = owned(state, input.id, publicKey);
      item.evidence = evidence;
      item.status = evidence.merged ? 'merged' : evidence.closed ? 'closed' : 'in-review';
      return item;
    });
  }
  if (method === 'POST' && pathname === '/api/claims/challenge') {
    const state = await snapshot();
    const submission = owned(state, input.submissionId, publicKey);
    if (!submission.evidence?.merged) fail('Verify the merged PR before requesting a reward.');
    // Limit the MVP to checksum-validated Sapling testnet recipients.
    const address = text(input.address, 'Shielded testnet address', 200);
    if (!isSaplingTestnetAddress(address))
      fail(
        'Use a valid Sapling testnet address beginning ztestsapling1. Unified addresses are not supported in this MVP.',
      );
    if (awardTaken(state, submission.bountyId))
      fail('This bounty already has a selected award.', 409);
    if (state.claims.some((c) => c.submissionId === submission.id))
      fail('This contribution already has a claim.', 409);
    return issueChallenge(publicKey, 'claim', {
      submissionId: submission.id,
      rewardId: submission.bountyId,
      amount: submission.terms?.amount || bounty.amount,
      network: 'testnet',
      address,
    });
  }
  if (method === 'POST' && pathname === '/api/claims') {
    if (typeof input.id !== 'string' || typeof input.signature !== 'string')
      fail('A claim challenge and signature are required.', 400);
    return transact(async (state) => {
      // Return an already-persisted claim after a lost response, without creating
      // another award or allowing a different identity/signature to replay it.
      const existing = state.claims.find((claim) => claim.challengeId === input.id);
      if (existing && existing.publicKey === publicKey && existing.signature === input.signature)
        return visibleClaim(existing);
      const challenge = await consumeChallenge(input.id, input.signature, 'claim');
      if (challenge.publicKey !== publicKey) fail('Claim identity mismatch.', 403);
      const submission = owned(state, challenge.submissionId, publicKey);
      if (!submission.evidence?.merged) fail('The contribution is not eligible.');
      if (awardTaken(state, challenge.rewardId))
        fail('This bounty already has a selected award.', 409);
      if (state.claims.some((c) => c.submissionId === submission.id))
        fail('This contribution already has a claim.', 409);
      const claim = {
        id: randomUUID(),
        challengeId: challenge.id,
        submissionId: submission.id,
        bountyId: challenge.rewardId,
        publicKey,
        address: challenge.address,
        amount: challenge.amount,
        status: 'awaiting-sponsor',
        createdAt: new Date().toISOString(),
        signedMessage: challenge.message,
        signature: input.signature,
      };
      state.claims.push(claim);
      return visibleClaim(claim);
    });
  }
  fail('Endpoint not found.', 404);
}
