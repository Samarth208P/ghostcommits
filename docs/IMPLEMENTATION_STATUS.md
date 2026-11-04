# Implementation status

Updated November 4, 2026. The Netlify MVP replaces the original single-repository local pilot.

## Implemented

- Vite frontend and modern Netlify API function, with committed deployment configuration and Postgres migration.
- Durable Ghost challenges/sessions, encrypted GitHub user tokens, browser-bound OAuth state/PKCE, HttpOnly maintainer sessions, expiry, and logout.
- Maintainer-owned public-repository bounties, repository permission checks, fixed terms, and tenant-scoped claim access.
- Bot-authored one-file PRs, safe retries, same-PR revisions, and GitHub merge verification.
- Multiple eligible claims, reasoned rejection, and atomic selection of one award per bounty.
- Noir testnet account connection, recipient address autofill, balance display, shielded spendability checks, wallet approval, and transaction recording.
- Payout reservations survive restarts and function instances; interrupted sends remain reserved for reconciliation.

## Verification boundaries

Automated tests cover local API behavior, the Netlify handler with an isolated Postgres-compatible database, mocked OAuth and GitHub operations, tenant isolation, revisions, competing claims, persistence, and client rendering. Browser checks use mocked APIs. GitHub and Noir approvals remain external user-controlled steps.

Deployment is performed by the repository owner. A live GitHub installation, actual bot PR/revision/merge, real Noir testnet transfer, and recipient receipt must still be demonstrated after configuration. Follow [Netlify deployment](NETLIFY_DEPLOYMENT.md) and record evidence there or in the release notes. Do not present these as already verified.

## Limits

Public repositories, one file per PR, one award per bounty, Sapling testnet recipients, no mainnet, no escrow, no independently verified transaction receipt. Local keys remain unencrypted. The small-demo aggregate database row serializes writes, including GitHub operations; this is not intended for high traffic. No automatic payout retry/reset, user-token refresh, or multi-file patches.

The prior [MVP audit](MVP_CONTRACT.md) is retained as historical context; its original missing-feature findings are superseded by this implementation status and the deployment guide.
