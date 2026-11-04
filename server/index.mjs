import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { snapshot, transact } from './store.mjs';
import { githubReady, createPullRequest, verifyMerge } from './github.mjs';
import { fail, issueChallenge, consumeChallenge, createSession, authenticate, authenticateSponsor } from './auth.mjs';

const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
const bounty = {
  id: 'bounty-001', title: process.env.BOUNTY_TITLE || 'Improve wallet synchronization',
  description: process.env.BOUNTY_DESCRIPTION || 'Help a wallet pick up where it left off. Improve reconnect handling so synchronization resumes without losing progress.',
  criteria: (process.env.BOUNTY_CRITERIA || 'Resume sync after a connection interruption|Preserve existing synchronization progress|Document the reconnect behavior').split('|'),
  repository: process.env.GITHUB_REPOSITORY || 'example/zcash-wallet', amount: process.env.BOUNTY_AMOUNT || '0.5',
  issueUrl: /^https:\/\/github\.com\//.test(process.env.BOUNTY_ISSUE_URL || '') ? process.env.BOUNTY_ISSUE_URL : '',
  configured: githubReady, network: 'testnet',
};
if (!/^\d+(\.\d{1,8})?$/.test(bounty.amount) || Number(bounty.amount) <= 0) throw new Error('BOUNTY_AMOUNT must be a positive ZEC decimal with at most eight decimal places.');
const requests = new Map();
function rateLimit(request) {
  const now = Date.now();
  for (const [ip, record] of requests) if (record.until < now) requests.delete(ip);
  const ip = request.socket.remoteAddress;
  const record = requests.get(ip) || { count: 0, until: now + 60000 };
  record.count += 1; requests.set(ip, record);
  if (record.count > 120) fail('Too many requests. Please wait a minute.', 429);
}
async function body(request) {
  let bytes = 0; const chunks = [];
  for await (const chunk of request) { bytes += chunk.length; if (bytes > 180000) fail('Submission exceeds the 180 KB request limit.', 413); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { fail('Request must contain valid JSON.'); }
}
function text(value, name, max) { if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`${name} is required and must be under ${max} characters.`); return value.trim(); }
function owned(state, id, publicKey) { const item = state.submissions.find(s => s.id === id && s.publicKey === publicKey); if (!item) fail('Contribution not found.', 404); return item; }
function visibleClaim(claim) { if (!claim) return null; const { signature, ...publicRecord } = claim; return publicRecord; }

async function api(request, pathname) {
  rateLimit(request);
  if (request.headers.origin && request.headers.origin !== origin) fail('This origin is not allowed.', 403);
  const method = request.method;
  if (method === 'GET' && pathname === '/api/config') return { bounty, sponsorConfigured: Boolean(process.env.SPONSOR_TOKEN) };
  const input = method === 'POST' ? await body(request) : {};
  if (method === 'POST' && pathname === '/api/auth/challenge') return issueChallenge(input.publicKey, 'login');
  if (method === 'POST' && pathname === '/api/auth/verify') { const challenge = consumeChallenge(input.id, input.signature, 'login'); return { token: createSession(challenge.publicKey) }; }
  if (pathname.startsWith('/api/sponsor')) {
    authenticateSponsor(request);
    if (method === 'GET' && pathname === '/api/sponsor/claims') return snapshot().claims.map(claim => ({ ...visibleClaim(claim), submission: snapshot().submissions.find(s => s.id === claim.submissionId) }));
    if (method === 'POST' && pathname === '/api/sponsor/reserve') return transact(state => {
      const claim = state.claims.find(c => c.id === input.id);
      if (!claim) fail('Claim not found.', 404);
      if (claim.status !== 'awaiting-sponsor') fail('This payout is already reserved or recorded. Reconcile it before any further transfer.', 409);
      claim.status = 'payment-reserved'; claim.reservedAt = new Date().toISOString(); return visibleClaim(claim);
    });
    if (method === 'POST' && pathname === '/api/sponsor/record') return transact(state => {
      const claim = state.claims.find(c => c.id === input.id);
      if (!claim) fail('Claim not found.', 404);
      if (claim.status !== 'payment-reserved') fail('Reserve this payout before recording a transaction.', 409);
      if (!/^[a-fA-F0-9]{64}$/.test(input.txid || '')) fail('Enter the 64-character Zcash transaction ID.');
      if (state.claims.some(c => c.txid === input.txid.toLowerCase())) fail('That transaction is already associated with a claim.', 409);
      claim.txid = input.txid.toLowerCase(); claim.status = 'recorded-unverified'; claim.recordedAt = new Date().toISOString(); return visibleClaim(claim);
    });
    fail('Endpoint not found.', 404);
  }
  const publicKey = authenticate(request);
  if (method === 'GET' && pathname === '/api/submissions') {
    const state = snapshot(); return state.submissions.filter(s => s.publicKey === publicKey).map(s => ({ ...s, claim: visibleClaim(state.claims.find(c => c.submissionId === s.id)) }));
  }
  if (method === 'POST' && pathname === '/api/submissions') {
    if (!githubReady) fail('Configure the GitHub repository before creating a PR.', 503);
    const title = text(input.title, 'Title', 160); const description = text(input.description, 'Description', 6000);
    const path = text(input.path, 'File path', 240);
    if (!/^[\w./-]+$/.test(path) || path.startsWith('/') || path.split('/').some(p => !p || p === '.' || p === '..' || p.toLowerCase() === '.git') || path.toLowerCase().startsWith('.github/workflows/')) fail('Choose a relative repository file path outside Git internals and workflows.');
    if (typeof input.content !== 'string' || !input.content.length || input.content.length > 120000) fail('File contents must be between 1 and 120,000 characters.');
    const requestId = text(input.requestId, 'Request identifier', 80);
    const item = await transact(state => {
      const previous = state.submissions.find(s => s.requestId === requestId && s.publicKey === publicKey);
      if (previous) return previous;
      if (state.submissions.filter(s => s.publicKey === publicKey).length >= 50) fail('This identity has reached the MVP submission limit.', 429);
      const submission = { id: randomUUID(), requestId, publicKey, bountyId: bounty.id, repository: bounty.repository, title, description, path, content: input.content, status: 'creating', createdAt: new Date().toISOString() };
      state.submissions.push(submission); return submission;
    });
    if (item.pr) return item;
    // Serialized external creation prevents concurrent retries duplicating PRs.
    return transact(async state => { const current = owned(state, item.id, publicKey); if (!current.pr) { current.pr = await createPullRequest(current); current.status = 'in-review'; } return current; });
  }
  if (method === 'POST' && pathname === '/api/submissions/verify') {
    const submission = owned(snapshot(), input.id, publicKey);
    if (!submission.pr) fail('The PR has not been created yet. Retry the original submission.');
    const evidence = await verifyMerge(submission);
    return transact(state => { const item = owned(state, input.id, publicKey); item.evidence = evidence; item.status = evidence.merged ? 'merged' : evidence.closed ? 'closed' : 'in-review'; return item; });
  }
  if (method === 'POST' && pathname === '/api/claims/challenge') {
    const state = snapshot(); const submission = owned(state, input.submissionId, publicKey);
    if (!submission.evidence?.merged) fail('Verify the merged PR before requesting a reward.');
    // Limit the MVP to Sapling testnet addresses. The wallet performs checksum validation.
    const address = text(input.address, 'Shielded testnet address', 200);
    if (!/^ztestsapling1[023456789acdefghjklmnpqrstuvwxyz]{76}$/.test(address)) fail('Use a Sapling testnet address beginning ztestsapling1. Unified addresses are not supported in this MVP.');
    if (state.claims.some(c => c.bountyId === bounty.id)) fail('This single-award bounty already has a claim.', 409);
    return issueChallenge(publicKey, 'claim', { submissionId: submission.id, rewardId: bounty.id, amount: bounty.amount, network: 'testnet', address });
  }
  if (method === 'POST' && pathname === '/api/claims') {
    const challenge = consumeChallenge(input.id, input.signature, 'claim');
    if (challenge.publicKey !== publicKey) fail('Claim identity mismatch.', 403);
    return transact(state => {
      const submission = owned(state, challenge.submissionId, publicKey);
      if (!submission.evidence?.merged) fail('The contribution is not eligible.');
      if (state.claims.some(c => c.bountyId === challenge.rewardId)) fail('This bounty already has a claim.', 409);
      const claim = { id: randomUUID(), submissionId: submission.id, bountyId: challenge.rewardId, publicKey, address: challenge.address, amount: challenge.amount, status: 'awaiting-sponsor', createdAt: new Date().toISOString(), signedMessage: challenge.message, signature: input.signature };
      state.claims.push(claim); return visibleClaim(claim);
    });
  }
  fail('Endpoint not found.', 404);
}

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Frame-Options', 'DENY');
  try {
    const pathname = new URL(request.url, origin).pathname;
    if (pathname.startsWith('/api/')) {
      response.setHeader('Content-Type', 'application/json'); response.setHeader('Cache-Control', 'no-store');
      response.end(JSON.stringify(await api(request, pathname))); return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) fail('Method not allowed.', 405);
    const file = resolve('dist', '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(resolve('dist') + '/ ') && !file.startsWith(resolve('dist') + '\\') && !file.startsWith(resolve('dist') + '/')) fail('Invalid file path.', 403);
    const content = await readFile(file);
    response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    response.statusCode = error.status || (error.code === 'ENOENT' ? 404 : 500);
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ error: error.status ? error.message : error.code === 'ENOENT' ? 'Run npm run build to serve the frontend here, or use npm run dev.' : 'The operation could not finish. Retry safely or check server configuration.' }));
  }
}).listen(Number(process.env.PORT || 3001), '127.0.0.1', () => console.log(`GhostCommits backend: http://localhost:${process.env.PORT || 3001}`));
