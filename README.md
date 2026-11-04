# GhostCommits

Public code. A separate identity. Testnet rewards.

GhostCommits lets maintainers sign in with their own GitHub account, install a GitHub App on a public repository, and publish a one-file bounty. Contributors use a local Ghost signing identity to open and revise bot-authored PRs without a personal GitHub login. After a merge, contributors sign reward requests and the maintainer selects one award for a shielded Zcash testnet transfer in Noir Wallet.

## Deploy on Netlify

See **[Netlify deployment and demo setup](docs/NETLIFY_DEPLOYMENT.md)** for the exact GitHub App settings, environment variables, and live walkthrough.

Connect this repository in Netlify and deploy `main`. The committed `netlify.toml` builds the Vite frontend into `dist` and routes `/api/*` to a Netlify Function. `@netlify/database` and the committed SQL migration provision the durable Postgres store on supported Netlify accounts. No local backend or persistent filesystem is required on Netlify.

The site operator registers one public GitHub App and configures its secrets. Each maintainer signs in on the site and installs that app on their own repositories. Maintainers do not share an operator password or paste GitHub tokens into the site.

Required function environment variables:

- `APP_ORIGIN`: exact deployed HTTPS origin, without a trailing slash.
- `GITHUB_APP_ID`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.
- `GITHUB_APP_PRIVATE_KEY`: full PEM private key, stored as a Netlify secret.
- `SESSION_ENCRYPTION_KEY`: 64 hexadecimal characters, generated once and kept stable.

Netlify supplies the database connection. Keep secrets out of `VITE_*` variables and out of Git. Adding or changing environment variables requires redeployment.

## Demo workflow

1. Maintainer opens **Sponsor desk**, signs in with GitHub, installs the app, and refreshes repositories.
2. Maintainer publishes a small task with acceptance criteria and a testnet ZEC reward. Published terms are immutable.
3. Contributor creates a Ghost, exports a recovery key, chooses the bounty, and submits one complete file.
4. Maintainer reviews on GitHub. Contributor reads feedback on the public PR and revises the same file from **My contributions**.
5. Maintainer merges the PR; contributor checks merge status and signs a claim using their Noir testnet Sapling address.
6. Maintainer connects a funded Noir testnet wallet, chooses an eligible claim, and approves the shielded transfer in the extension.
7. Both parties check wallet history and recipient receipt. The app labels transaction IDs **recorded-unverified**; it does not claim independent chain confirmation.

Multiple contributors may request review without locking the reward. Selection atomically reserves one award per bounty. A declined or interrupted wallet request leaves the reservation in place; check wallet history before recording an existing transaction. There is deliberately no automatic second send or reset.

## Local development

Requires Node 22.12+.

```sh
npm ci
# Copy .env.example to .env and set the GitHub App values for live integrations.
npm run dev
```

Vite serves `http://localhost:5173` and proxies the backend. Without a database connection, local development uses Git-ignored `data/store.json`. One local backend process may own that file. Netlify always uses Postgres. Do not copy local prototype data to a public folder.

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The API regression suite runs against local JSON and an isolated Netlify Postgres-compatible test database, with mocked GitHub responses. Browser tests run against the built frontend with mocked API responses. These do not establish that a real GitHub installation or Noir transfer has completed; follow the live deployment checklist.

## Scope and privacy

This is a demoable testnet MVP, not a production-audited payment service. Public repositories only; one file per submission; one award per bounty; Sapling testnet recipients (`ztestsapling1…`) only. Testnet ZEC has no monetary value. No mainnet, escrow, guaranteed funding, or automatic payment verification.

Ghost keys are stored unencrypted in browser storage and recovery exports. The bot removes the need for personal GitHub attribution; it does not hide public code, timing, network metadata from the operator, or the relationship between a Ghost and its claims. The maintainer and operator see reward addresses. GitHub user access tokens are encrypted at rest; HttpOnly cookies identify maintainer sessions. Sessions expire after at most eight hours and require GitHub sign-in again.

The demo stores its aggregate state in one locked Postgres row to serialize award decisions and PR retries. This favors correctness for a small pilot over throughput; split into indexed tables and background jobs before high-volume operation. Review [security boundaries](docs/SECURITY.md) and [current implementation status](docs/IMPLEMENTATION_STATUS.md).
