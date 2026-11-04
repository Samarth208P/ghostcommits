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
