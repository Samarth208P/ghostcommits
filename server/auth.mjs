import { createPublicKey, randomBytes, randomUUID, timingSafeEqual, verify } from 'node:crypto';

import { snapshot, transact } from './store.mjs';
const domain = process.env.APP_ORIGIN || 'http://localhost:5173';
export function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
export async function issueChallenge(publicKey, purpose, payload = {}) {
  return transact((state) => {
    const challenges = state.challenges;
    if (typeof publicKey !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(publicKey))
      fail('Invalid Ed25519 public key.');
    const now = Date.now();
    for (const [key, item] of Object.entries(challenges))
      if (item.expiresAt < now) delete challenges[key];
    if (Object.keys(challenges).length >= 5000)
      fail('Too many active challenges. Try again shortly.', 429);
    const challenge = {
      id: randomUUID(),
      publicKey,
      purpose,
      domain,
      nonce: randomBytes(24).toString('hex'),
      expiresAt: now + 300000,
      ...payload,
    };
    const message = JSON.stringify(challenge);
    challenges[challenge.id] = { ...challenge, message };
    return { id: challenge.id, message, expiresAt: challenge.expiresAt };
  });
}
export async function consumeChallenge(id, signature, purpose) {
  return transact((state) => {
    const item = state.challenges[id];
    if (!item || item.expiresAt < Date.now() || item.purpose !== purpose)
      fail('Challenge expired or already used. Please try again.', 401);
    if (typeof signature !== 'string' || signature.length > 100) fail('Invalid signature.', 401);
    const key = createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'),
        Buffer.from(item.publicKey, 'base64'),
      ]),
      format: 'der',
      type: 'spki',
    });
    if (!verify(null, Buffer.from(item.message), key, Buffer.from(signature, 'base64')))
      fail('Ownership signature could not be verified.', 401);
    delete state.challenges[id];
    return item;
  });
}
export async function createSession(publicKey) {
  return transact((state) => {
    for (const [key, session] of Object.entries(state.sessions))
      if (session.expiresAt < Date.now()) delete state.sessions[key];
    const token = randomBytes(32).toString('hex');
    state.sessions[token] = { publicKey, expiresAt: Date.now() + 3600000 };
    return token;
  });
}
export async function authenticate(request) {
  const token = request.headers.authorization?.replace(/^Bearer /, '');
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
    fail('Unlock your Ghost identity again to continue.', 401);
  const session = (await snapshot()).sessions[token];
  if (!session || session.expiresAt < Date.now())
    fail('Unlock your Ghost identity again to continue.', 401);
  return session.publicKey;
}
export function authenticateSponsor(request) {
  const expected = process.env.SPONSOR_TOKEN;
  const actual = request.headers.authorization?.replace(/^Bearer /, '') || '';
  if (!expected) fail('Set SPONSOR_TOKEN on the server to enable sponsor access.', 503);
  if (
    Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    fail('Sponsor access key is incorrect.', 401);
}
