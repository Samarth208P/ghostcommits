import { bech32m } from '@scure/base';
import { blake2b } from '@noble/hashes/blake2b';
// Synthetic encoding fixtures only; never fund these addresses.
export function unifiedFixture({
  prefix = 'utest',
  receivers = [[3, 43]],
  paddingPrefix = prefix,
} = {}) {
  const raw = Uint8Array.from(
    receivers
      .flatMap(([type, length]) => [type, length, ...Array(length).fill(0)])
      .concat(Array(16).fill(0)),
  );
  raw.set(new TextEncoder().encode(paddingPrefix), raw.length - 16);
  const left = raw.slice(0, Math.min(64, Math.floor(raw.length / 2)));
  const right = raw.slice(left.length);
  for (let round = 0; round < 2; round++) {
    for (let block = 0; block < Math.ceil(right.length / 64); block++) {
      const personalization = Uint8Array.from([
        ...new TextEncoder().encode('UA_F4Jumble_G'),
        round,
        block & 255,
        block >> 8,
      ]);
      const mask = blake2b(left, { personalization, dkLen: 64 });
      for (let i = block * 64; i < Math.min((block + 1) * 64, right.length); i++)
        right[i] ^= mask[i % 64];
    }
    const personalization = Uint8Array.from([
      ...new TextEncoder().encode('UA_F4Jumble_H'),
      round,
      0,
      0,
    ]);
    const mask = blake2b(right, { personalization, dkLen: left.length });
    for (let i = 0; i < left.length; i++) left[i] ^= mask[i];
  }
  return bech32m.encode(prefix, bech32m.toWords(Uint8Array.from([...left, ...right])), 1024);
}
