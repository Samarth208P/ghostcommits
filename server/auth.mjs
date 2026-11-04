import { createPublicKey, randomBytes, randomUUID, timingSafeEqual, verify } from 'node:crypto';

const challenges = new Map();
const sessions = new Map();
const domain = process.env.APP_ORIGIN || 'http://localhost:5173';
export function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
export function issueChallenge(publicKey, purpose, payload = {}) {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(publicKey || '')) fail('Invalid Ed25519 public key.');
  const now = Date.now();
  for (const [key, item] of challenges) if (item.expiresAt < now) challenges.delete(key);
  if (challenges.size >= 5000) fail('Too many active challenges. Try again shortly.', 429);
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
  challenges.set(challenge.id, { ...challenge, message });
  return { id: challenge.id, message, expiresAt: challenge.expiresAt };
}
export function consumeChallenge(id, signature, purpose) {
  const item = challenges.get(id);
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
  challenges.delete(id);
  return item;
}
export function createSession(publicKey) {
  for (const [key, session] of sessions) if (session.expiresAt < Date.now()) sessions.delete(key);
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { publicKey, expiresAt: Date.now() + 3600000 });
  return token;
}
export function authenticate(request) {
  const token = request.headers.authorization?.replace(/^Bearer /, '');
  const session = sessions.get(token);
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
