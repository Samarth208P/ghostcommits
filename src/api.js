import { sign } from './identity.js';
let token = null;
let tokenExpires = 0;
let tokenOwner = null;
export function clearSession() {
  token = null;
  tokenExpires = 0;
  tokenOwner = null;
}
export async function request(path, { data, authorization } = {}) {
  const response = await fetch(`/api${path}`, {
    method: data ? 'POST' : 'GET',
    headers: {
      ...(data ? { 'Content-Type': 'application/json' } : {}),
      ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The server did not return a valid response.');
  }
  if (!response.ok)
    throw Object.assign(new Error(result?.error || 'Request failed. Please try again.'), {
      status: response.status,
    });
  return result;
}

export async function authenticated(identity, path, data) {
  if (!identity) throw new Error('Create a Ghost identity first.');
  if (!token || tokenOwner !== identity.publicKey || Date.now() >= tokenExpires) {
    const challenge = await request('/auth/challenge', { data: { publicKey: identity.publicKey } });
    const result = await request('/auth/verify', {
      data: { id: challenge.id, signature: await sign(identity, challenge.message) },
    });
    token = result.token;
    tokenOwner = identity.publicKey;
    tokenExpires = Date.now() + 3500000;
  }
  try {
    return await request(path, { data, authorization: token });
  } catch (error) {
    // Only GETs are replayed automatically; mutations require an explicit retry.
    if (error.status === 401) {
      clearSession();
      if (data === undefined) {
        const challenge = await request('/auth/challenge', {
          data: { publicKey: identity.publicKey },
        });
        const session = await request('/auth/verify', {
          data: { id: challenge.id, signature: await sign(identity, challenge.message) },
        });
        token = session.token;
        tokenOwner = identity.publicKey;
        tokenExpires = Date.now() + 3500000;
        return request(path, { authorization: token });
      }
    }
    throw error;
  }
}
