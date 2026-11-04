import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPayment, sendPayment } from '../src/wallet.js';

function syntheticAddress() {
  const alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  const prefix = 'ztestsapling';
  const data = Array(69).fill(0);
  let checksum = 1;
  for (const value of [...prefix]
    .map((c) => c.charCodeAt(0) >> 5)
    .concat(
      0,
      [...prefix].map((c) => c.charCodeAt(0) & 31),
      data,
      Array(6).fill(0),
    )) {
    const top = checksum >>> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3].forEach((g, i) => {
      if ((top >>> i) & 1) checksum ^= g;
    });
  }
  checksum ^= 1;
  return `${prefix}1${'q'.repeat(69)}${Array.from({ length: 6 }, (_, i) => alphabet[(checksum >>> (5 * (5 - i))) & 31]).join('')}`;
}

test('Noir requests shielded testnet funds and rejects insufficient funds or account changes', async () => {
  const address = syntheticAddress();
  const claim = { address, amount: '0.01000001' };
  let account = { shielded: address, transparent: 'tmSyntheticTestOnly' };
  let maximum = '0.01000000';
  let sent = null;
  const wallet = {
    zcash: {
      getAccounts: async () => account,
      getMaxTransfer: async (input) => {
        assert.deepEqual(input, { to: address, fundingSource: 'shielded' });
        return { maxAmount: maximum };
      },
      sendTransaction: async (input) => {
        sent = input;
        return 'a'.repeat(64);
      },
    },
  };
  await assert.rejects(checkPayment(wallet, claim), /Insufficient/);
  assert.equal(sent, null);
  maximum = '1';
  await checkPayment(wallet, claim);
  assert.equal(await sendPayment(wallet, claim), 'a'.repeat(64));
  assert.deepEqual(sent, { to: address, amount: '0.01000001', fundingSource: 'shielded' });
  account = { shielded: 'zs1mainnet', transparent: 't1mainnet' };
  await assert.rejects(sendPayment(wallet, claim), /Mainnet payments are disabled/);
  await assert.rejects(checkPayment(wallet, claim), /Mainnet payments are disabled/);
  account = { shielded: address, transparent: 'tmSyntheticTestOnly' };
  await assert.rejects(
    checkPayment(wallet, { ...claim, address: 'ztestsapling1invalid' }),
    /valid shielded/,
  );
});
