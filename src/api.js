import { sign } from './identity.js';
let token = null;
let tokenExpires = 0;
export function clearSession() { token = null; tokenExpires = 0; }
export async function request(path, { data, authorization } = {}) {
  const response = await fetch(`/api${path}`, { method: data ? 'POST' : 'GET', headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}) }, body: data ? JSON.stringify(data) : undefined });
  const result = await response.json().catch(() => ({ error: 'The server did not return a valid response.' }));
  if (!response.ok) throw new Error(result.error || 'Request failed. Please try again.');
  return result;
}
export async function authenticated(identity, path, data) {
  if (!identity) throw new Error('Create a Ghost identity first.');
  if (!token || Date.now() >= tokenExpires) {
    const challenge = await request('/auth/challenge', { data: { publicKey: identity.publicKey } });
    const result = await request('/auth/verify', { data: { id: challenge.id, signature: await sign(identity, challenge.message) } });
    token = result.token; tokenExpires = Date.now() + 3500000;
  }
  return request(path, { data, authorization: token });
}
