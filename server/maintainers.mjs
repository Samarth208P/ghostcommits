import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'node:crypto';
import { snapshot, transact } from './store.mjs';
import { fail } from './auth.mjs';
import { appConfigured, githubRequest, installationToken } from './github-app.mjs';

const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
const callback = `${origin}/api/github/callback`;
export const maintainerConfigured = Boolean(
  appConfigured &&
  process.env.GITHUB_CLIENT_ID &&
  process.env.GITHUB_CLIENT_SECRET &&
  /^[a-f0-9]{64}$/i.test(process.env.SESSION_ENCRYPTION_KEY || ''),
);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const cookie = (name, value, age) =>
  `${name}=${value}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${age}${origin.startsWith('https:') ? '; Secure' : ''}`;
function cookies(request) {
  return Object.fromEntries(
    (request.headers.cookie || '').split(';').map((v) => v.trim().split('=')),
  );
}
function encrypt(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    'aes-256-gcm',
    Buffer.from(process.env.SESSION_ENCRYPTION_KEY, 'hex'),
    iv,
  );
  return Buffer.concat([iv, cipher.update(value), cipher.final(), cipher.getAuthTag()]).toString(
    'base64',
  );
}
function decrypt(value) {
  const data = Buffer.from(value, 'base64');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(process.env.SESSION_ENCRYPTION_KEY, 'hex'),
    data.subarray(0, 12),
  );
  decipher.setAuthTag(data.subarray(-16));
  return Buffer.concat([decipher.update(data.subarray(12, -16)), decipher.final()]).toString();
}
export async function login(response) {
  if (!maintainerConfigured)
    fail('GitHub sign-in is not configured by the site operator yet.', 503);
  const state = randomBytes(32).toString('hex');
  const verifier = randomBytes(32).toString('base64url');
  await transact((data) => {
    for (const [key, value] of Object.entries(data.oauth))
      if (value.expiresAt < Date.now()) delete data.oauth[key];
    if (Object.keys(data.oauth).length > 5000) fail('Please try signing in later.', 429);
    data.oauth[digest(state)] = { verifier, expiresAt: Date.now() + 600000 };
  });
  response.setHeader('Set-Cookie', cookie('gc_oauth', state, 600));
  const query = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: callback,
    state,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  });
  return `https://github.com/login/oauth/authorize?${query}`;
}
export async function finishLogin(request, response, url) {
  const state = url.searchParams.get('state');
  if (!state || state !== cookies(request).gc_oauth || !url.searchParams.get('code'))
    fail('GitHub sign-in expired or was cancelled. Start again from the maintainer desk.', 400);
  const pending = await transact((data) => {
    const entry = data.oauth[digest(state)];
    if (!entry || entry.expiresAt < Date.now())
      fail('GitHub sign-in expired. Please try again.', 401);
    delete data.oauth[digest(state)];
    return entry;
  });
  const result = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: url.searchParams.get('code'),
      code_verifier: pending.verifier,
      redirect_uri: callback,
    }),
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
  });
  const token = await result.json();
  if (!result.ok || !token.access_token)
    fail('GitHub could not finish sign-in. Please reconnect.', 502);
  const user = await githubRequest('/user', token.access_token);
  if (!Number.isSafeInteger(user.id) || typeof user.login !== 'string')
    fail('Invalid GitHub account.', 502);
  const session = randomBytes(32).toString('hex');
  await transact((data) => {
    for (const [key, value] of Object.entries(data.maintainers))
      if (value.expiresAt < Date.now()) delete data.maintainers[key];
    data.maintainers[digest(session)] = {
      id: String(user.id),
      login: user.login,
      token: encrypt(token.access_token),
      expiresAt: Date.now() + Math.min(Number(token.expires_in) || 28800, 28800) * 1000,
    };
  });
  response.setHeader('Set-Cookie', [
    cookie('gc_maintainer', session, 28800),
    cookie('gc_oauth', '', 0),
  ]);
  return `${origin}/#sponsor`;
}
export async function maintainer(request, required = true) {
  const session = cookies(request).gc_maintainer;
  const user = session && (await snapshot()).maintainers[digest(session)];
  if (!user || user.expiresAt < Date.now()) {
    if (required) fail('Sign in with GitHub to open the maintainer desk.', 401);
    return null;
  }
  return user;
}
export async function logout(request, response) {
  const session = cookies(request).gc_maintainer;
  if (session)
    await transact((data) => {
      delete data.maintainers[digest(session)];
    });
  response.setHeader('Set-Cookie', cookie('gc_maintainer', '', 0));
  return { ok: true };
}
export async function repositories(user) {
  const token = decrypt(user.token);
  const result = [];
  for (let page = 1; page <= 10; page++) {
    const data = await githubRequest(`/user/installations?per_page=100&page=${page}`, token);
    for (const installation of data.installations || []) {
      if (installation.suspended_at) continue;
      for (let repoPage = 1; repoPage <= 10; repoPage++) {
        const repos = await githubRequest(
          `/user/installations/${installation.id}/repositories?per_page=100&page=${repoPage}`,
          token,
        );
        result.push(
          ...(repos.repositories || [])
            .filter(
              (r) => !r.private && !r.archived && (r.permissions?.admin || r.permissions?.maintain),
            )
            .map((r) => ({
              repository: r.full_name,
              baseBranch: r.default_branch,
              installationId: installation.id,
            })),
        );
        if ((repos.repositories || []).length < 100) break;
      }
    }
    if ((data.installations || []).length < 100) break;
  }
  return result;
}
export async function authorizeRepository(user, repository) {
  if (
    typeof repository !== 'string' ||
    !/^[A-Za-z0-9][\w.-]*\/[A-Za-z0-9_][\w.-]*$/.test(repository)
  )
    fail('Choose an installed repository.');
  const repo = await githubRequest(`/repos/${repository}`, decrypt(user.token));
  if (repo.private || repo.archived || !(repo.permissions?.admin || repo.permissions?.maintain))
    fail('You need maintainer or admin access to an active public repository.', 403);
  await installationToken(repository);
  return { repository: repo.full_name, baseBranch: repo.default_branch };
}
