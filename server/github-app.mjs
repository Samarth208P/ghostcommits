import { readFile } from 'node:fs/promises';
import { createPrivateKey, sign } from 'node:crypto';
import { fail } from './auth.mjs';

const repository = process.env.GITHUB_REPOSITORY || '';
const appId = process.env.GITHUB_APP_ID || '';
const keyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH || '';
export const appConfigured = Boolean(appId && (keyPath || process.env.GITHUB_APP_PRIVATE_KEY));
export let githubReady = false;
const tokens = new Map();
const pending = new Map();

async function appJwt() {
  if (!appConfigured) fail('Configure the GitHub App ID and private key first.', 503);
  let key;
  try {
    key = createPrivateKey(
      process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n') || (await readFile(keyPath)),
    );
    if (key.asymmetricKeyType !== 'rsa') throw new Error('RSA key required');
  } catch {
    fail('The GitHub App private key could not be loaded. Check its PEM file and path.', 503);
  }
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const message = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat: now - 60, exp: now + 540, iss: appId })}`;
  return `${message}.${sign('RSA-SHA256', Buffer.from(message), key).toString('base64url')}`;
}

export async function githubRequest(path, token, method = 'GET', body) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
    redirect: 'error',
  });
  if (!response.ok) {
    if ([401, 403, 404].includes(response.status)) {
      tokens.clear();
      githubReady = false;
    }
    fail(
      `GitHub returned ${response.status}. Check the app installation, repository permissions, and base branch.`,
      502,
    );
  }
  return response.json();
}

export async function installationToken(target = repository) {
  if (!/^[A-Za-z0-9][\w.-]*\/[A-Za-z0-9_][\w.-]*$/.test(target)) fail('Invalid repository.');
  let cachedToken = tokens.get(target);
  let pendingToken = pending.get(target);
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) return cachedToken.token;
  if (pendingToken) return pendingToken;
  pendingToken = (async () => {
    const jwt = await appJwt();
    // Discover the installation from GitHub, never from a browser-supplied ID.
    const installation = await githubRequest(`/repos/${target}/installation`, jwt);
    if (
      installation.suspended_at ||
      installation.permissions?.contents !== 'write' ||
      installation.permissions?.pull_requests !== 'write'
    )
      fail(
        'Install the app with Contents and Pull requests read/write access on this repository.',
        503,
      );
    const result = await githubRequest(
      `/app/installations/${installation.id}/access_tokens`,
      jwt,
      'POST',
      {
        repositories: [target.split('/')[1]],
        permissions: { contents: 'write', pull_requests: 'write' },
      },
    );
    if (!result.token || !Number.isFinite(Date.parse(result.expires_at)))
      fail('GitHub returned an invalid installation token.', 502);
    cachedToken = { token: result.token, expiresAt: Date.parse(result.expires_at) };
    tokens.set(target, cachedToken);
    return result.token;
  })();
  pending.set(target, pendingToken);
  try {
    return await pendingToken;
  } catch (error) {
    githubReady = false;
    throw error;
  } finally {
    pending.delete(target);
  }
}

export async function installationUrl() {
  const app = await githubRequest('/app', await appJwt());
  if (!/^[a-zA-Z0-9-]+$/.test(app.slug)) fail('GitHub returned an invalid app name.', 502);
  return { url: `https://github.com/apps/${app.slug}/installations/new` };
}

export async function checkConnection() {
  githubReady = false;
  tokens.delete(repository);
  const token = await installationToken();
  await githubRequest(
    `/repos/${repository}/git/ref/heads/${encodeURIComponent(process.env.GITHUB_BASE_BRANCH || 'main')}`,
    token,
  );
  githubReady = true;
  return { connected: true, repository };
}
