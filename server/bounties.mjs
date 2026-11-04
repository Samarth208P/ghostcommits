import { randomUUID } from 'node:crypto';
import { fail } from './auth.mjs';
import { snapshot, transact } from './store.mjs';
import { authorizeRepository } from './maintainers.mjs';

export const awardTaken = (state, id) =>
  state.claims.some(
    (c) => c.bountyId === id && ['payment-reserved', 'recorded-unverified'].includes(c.status),
  );
export function requiredText(value, name, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    fail(`${name} is required and must be under ${max} characters.`);
  return value.trim();
}
export async function publishBounty(user, input) {
  const title = requiredText(input.title, 'Title', 160);
  const description = requiredText(input.description, 'Description', 6000);
  const criteria = requiredText(input.criteria, 'Acceptance criteria', 3000)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const amount = requiredText(input.amount, 'Reward amount', 30);
  if (!/^\d+(\.\d{1,8})?$/.test(amount) || Number(amount) <= 0 || Number(amount) > 100)
    fail('Use a testnet ZEC amount above zero and at most 100, with up to eight decimal places.');
  const requestId = requiredText(input.requestId, 'Request identifier', 80);
  const repo = await authorizeRepository(user, input.repository);
  return transact((state) => {
    const existing = state.bounties.find(
      (b) => b.maintainerId === user.id && b.requestId === requestId,
    );
    if (existing) return existing;
    if (state.bounties.filter((b) => b.maintainerId === user.id).length >= 25)
      fail('The demo supports up to 25 bounties per maintainer.', 429);
    const bounty = {
      id: randomUUID(),
      requestId,
      ...repo,
      title,
      description,
      criteria,
      amount,
      maintainerId: user.id,
      maintainerLogin: user.login,
      network: 'testnet',
      configured: true,
      createdAt: new Date().toISOString(),
    };
    state.bounties.push(bounty);
    return bounty;
  });
}
export function authorizeClaim(state, id, user) {
  const claim = state.claims.find((c) => c.id === id);
  const bounty = claim && state.bounties.find((b) => b.id === claim.bountyId);
  if (!claim || (user ? bounty?.maintainerId !== user.id : Boolean(bounty?.maintainerId)))
    fail('Claim not found.', 404);
  return claim;
}
export async function sponsorClaims(user) {
  const state = await snapshot();
  return state.claims
    .filter((c) => {
      const b = state.bounties.find((b) => b.id === c.bountyId);
      return user ? b?.maintainerId === user.id : !b?.maintainerId;
    })
    .map(({ signature, ...claim }) => ({
      ...claim,
      submission: state.submissions.find((s) => s.id === claim.submissionId),
    }));
}
