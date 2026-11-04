import { getNoirWallet } from '@noir-wallet/sdk';
import { isShieldedTestnetAddress } from '../server/zcash.mjs';

function requireTestnet(account) {
  if (
    !account ||
    !isShieldedTestnetAddress(account.shielded) ||
    !/^(tm|t2)/.test(account.transparent || '')
  )
    throw new Error(
      'Connect a Noir testnet account with a shielded testnet address. Mainnet payments are disabled.',
    );
}

function zatoshis(value) {
  if (typeof value !== 'string' || !/^\d+(\.\d{1,8})?$/.test(value))
    throw new Error('The wallet returned an invalid ZEC amount.');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100000000n + BigInt(fraction.padEnd(8, '0'));
}

export async function checkPayment(wallet, claim) {
  requireTestnet(await wallet.zcash.getAccounts());
  if (!isShieldedTestnetAddress(claim.address))
    throw new Error('Use a valid shielded testnet recipient.');
  const amount = zatoshis(claim.amount);
  if (amount <= 0n) throw new Error('The reward must be positive.');
  const maximum = await wallet.zcash.getMaxTransfer({
    to: claim.address,
    fundingSource: 'shielded',
  });
  if (amount > zatoshis(maximum.maxAmount))
    throw new Error(
      'Insufficient spendable shielded testnet ZEC, including the network fee. Fund and synchronize Noir Wallet first.',
    );
}

export async function connectWallet() {
  const wallet = getNoirWallet();
  if (!wallet)
    throw new Error('Install the official Noir Wallet testnet extension, then reload this page.');
  const account = await wallet.zcash.connect();
  requireTestnet(account);
  return { wallet, account };
}

export async function sendPayment(wallet, claim) {
  if (!isShieldedTestnetAddress(claim.address))
    throw new Error('Only shielded testnet recipients are supported.');
  const connection = await wallet.zcash.getAccounts();
  requireTestnet(connection);
  return wallet.zcash.sendTransaction({
    to: claim.address,
    amount: claim.amount,
    fundingSource: 'shielded',
  });
}
