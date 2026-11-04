import { bech32m } from '@scure/base';
import { blake2b } from '@noble/hashes/blake2b';

// Sapling payment addresses encode a 43-byte receiver using Bech32 (not Bech32m).
const alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

export function isSaplingTestnetAddress(address) {
  if (
    typeof address !== 'string' ||
    !address.startsWith('ztestsapling1') ||
    address.length !== 88 ||
    address !== address.toLowerCase()
  )
    return false;
  const separator = address.lastIndexOf('1');
  const prefix = address.slice(0, separator);
  const data = [...address.slice(separator + 1)].map((char) => alphabet.indexOf(char));
  if (data.some((value) => value < 0)) return false;
  const expanded = [...prefix]
    .map((char) => char.charCodeAt(0) >> 5)
    .concat(
      0,
      [...prefix].map((char) => char.charCodeAt(0) & 31),
    );
  let checksum = 1;
  for (const value of expanded.concat(data)) {
    const top = checksum >>> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    for (let index = 0; index < 5; index += 1)
      if ((top >>> index) & 1) checksum ^= generators[index];
  }
  // 344 receiver bits occupy 69 groups; the last group has one zero padding bit.
  return checksum === 1 && (data[data.length - 7] & 1) === 0;
}

// ZIP 316 revision 0: verify Bech32m, inverse F4Jumble, network padding,
// canonical receiver ordering/lengths, and the presence of a shielded receiver.
// The wallet remains responsible for cryptographic receiver validity and sending.
export function isUnifiedTestnetAddress(address) {
  if (typeof address !== 'string' || address.length > 1024 || !address.startsWith('utest1'))
    return false;
  try {
    const { prefix, words } = bech32m.decode(address, 1024);
    if (prefix !== 'utest') return false;
    const bytes = bech32m.fromWords(words);
    if (bytes.length < 48) return false;
    const left = bytes.subarray(0, Math.min(64, Math.floor(bytes.length / 2)));
    const right = bytes.subarray(left.length);
    const xor = (target, mask) =>
      target.forEach((value, i) => {
        target[i] = value ^ mask[i];
      });
    const personal = (kind, round, block = 0) => {
      const result = new Uint8Array(16);
      result.set(new TextEncoder().encode(`UA_F4Jumble_${kind}`));
      result.set([round, block & 255, block >>> 8], 13);
      return result;
    };
    for (const round of [1, 0]) {
      xor(left, blake2b(right, { dkLen: left.length, personalization: personal('H', round) }));
      for (let offset = 0; offset < right.length; offset += 64)
        xor(
          right.subarray(offset, offset + 64),
          blake2b(left, {
            dkLen: 64,
            personalization: personal('G', round, offset / 64),
          }),
        );
    }
    const padding = new Uint8Array(16);
    padding.set(new TextEncoder().encode(prefix));
    const end = bytes.length - 16;
    if (!padding.every((value, i) => bytes[end + i] === value)) return false;
    let cursor = 0;
    const compact = () => {
      if (cursor >= end) throw new Error('Truncated receiver');
      const first = bytes[cursor++];
      if (first < 253) return first;
      const size = first === 253 ? 2 : first === 254 ? 4 : 8;
      if (size === 8 || cursor + size > end) throw new Error('Invalid CompactSize');
      let value = 0;
      for (let i = 0; i < size; i++) value += bytes[cursor++] * 2 ** (8 * i);
      if (value < (size === 2 ? 253 : 65536) || value > 0x2000000)
        throw new Error('Noncanonical CompactSize');
      return value;
    };
    let last = -1;
    let transparent = false;
    let shielded = false;
    while (cursor < end) {
      const type = compact();
      const length = compact();
      if (type <= last || cursor + length > end) return false;
      last = type;
      if (type <= 1) {
        if (transparent || length !== 20) return false;
        transparent = true;
      } else if (type === 2 || type === 3) {
        if (length !== 43) return false;
        shielded = true;
      } else {
        // Fail closed for receiver types this application has not validated.
        return false;
      }
      cursor += length;
    }
    return shielded && cursor === end;
  } catch {
    return false;
  }
}

export function isShieldedTestnetAddress(address) {
  return isSaplingTestnetAddress(address) || isUnifiedTestnetAddress(address);
}
