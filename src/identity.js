const storageKey = 'ghostcommits.identity.v1';
const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decode = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
export function loadIdentity() {
  try { const identity = JSON.parse(localStorage.getItem(storageKey)); return identity?.publicKey && identity?.privateKey ? identity : null; } catch { return null; }
}
export async function createIdentity() {
  if (!crypto.subtle) throw new Error('Use localhost or HTTPS to create a signing identity.');
  const key = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
  const identity = { version: 1, publicKey: encode(await crypto.subtle.exportKey('raw', key.publicKey)), privateKey: encode(await crypto.subtle.exportKey('pkcs8', key.privateKey)), createdAt: new Date().toISOString(), backedUp: false };
  localStorage.setItem(storageKey, JSON.stringify(identity)); return identity;
}
export async function sign(identity, message) {
  const key = await crypto.subtle.importKey('pkcs8', decode(identity.privateKey), 'Ed25519', false, ['sign']);
  return encode(await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(message)));
}
export async function importIdentity(file) {
  if (file.size > 10000) throw new Error('Choose a GhostCommits recovery JSON file under 10 KB.');
  const identity = JSON.parse(await file.text());
  if (identity.version !== 1 || !identity.publicKey || !identity.privateKey) throw new Error('This is not a GhostCommits recovery file.');
  const probe = 'ghostcommits-recovery-validation';
  const signature = await sign(identity, probe);
  const publicKey = await crypto.subtle.importKey('raw', decode(identity.publicKey), 'Ed25519', false, ['verify']);
  if (!await crypto.subtle.verify('Ed25519', publicKey, decode(signature), new TextEncoder().encode(probe))) throw new Error('Recovery keys do not match.');
  const clean = { version: 1, publicKey: identity.publicKey, privateKey: identity.privateKey, createdAt: identity.createdAt, backedUp: true };
  localStorage.setItem(storageKey, JSON.stringify(clean)); return clean;
}
export function exportIdentity(identity) {
  const blob = new Blob([JSON.stringify(identity, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'ghostcommits-recovery.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  identity.backedUp = true; localStorage.setItem(storageKey, JSON.stringify(identity));
}
export async function fingerprint(identity) {
  const hash = await crypto.subtle.digest('SHA-256', decode(identity.publicKey));
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}
