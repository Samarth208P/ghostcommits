import { getNoirWallet } from '@noir-wallet/sdk';

export async function connectWallet() {
  const wallet = getNoirWallet();
  if (!wallet) throw new Error('Install the official Noir Wallet testnet extension, then reload this page.');
  const account = await wallet.zcash.connect();
  // Fail closed: never authorize a mainnet payout from this testnet-only app.
  const addresses = [account.shielded, account.transparent].filter(value => typeof value === 'string');
  if (!addresses.some(address => /^(ztestsapling1|utest1|tm|t2)/.test(address))) throw new Error('Connect the testnet build of Noir Wallet. Mainnet payments are disabled.');
  return { wallet, account };
}

export async function sendPayment(wallet, claim) {
  if (!claim.address.startsWith('ztestsapling1')) throw new Error('Only shielded Sapling testnet recipients are supported.');
  const connection = await wallet.zcash.getAccounts();
  if (![connection?.shielded, connection?.transparent].some(value => typeof value === 'string' && /^(ztestsapling1|utest1|tm|t2)/.test(value))) throw new Error('The active wallet is not on testnet.');
  return wallet.zcash.sendTransaction({ to: claim.address, amount: claim.amount, fundingSource: 'shielded' });
}
