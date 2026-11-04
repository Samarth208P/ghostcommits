# GhostCommits

**Public code. A separate identity. Testnet rewards.**

GhostCommits is a developer workspace for bot-authored GitHub contributions, pseudonymous contribution ownership, and shielded Zcash testnet bounty requests.

The final MVP contract and release blockers are defined in [MVP scope and claim audit](docs/MVP_CONTRACT.md). A capability is not release-ready merely because source exists. This is a single-repository pilot, not a public bounty marketplace, anonymous portfolio service, or real-money payment product.

## Project status

Application source is implemented. The automated regression suite and production build pass. Browser interaction checks remain incomplete, and real GitHub and Noir Wallet flows still require live verification. See [implementation status](docs/IMPLEMENTATION_STATUS.md) for the current evidence and limits.

The initial target is a one-day MVP for the Free Society Hack, Zcash Privacy Track, using Zcash testnet exclusively.

## Documentation

- [Product requirements](docs/PRD.md): the supplied PRD, preserved verbatim.
- [Proposed architecture](docs/ARCHITECTURE.md): components, data boundaries, and unresolved integration decisions.
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md): future phases and acceptance checks.
- [Privacy and security](docs/SECURITY.md): intended protections, limitations, and requirements.

## Implemented in source

1. Generate a local signing identity and export a recovery key.
2. Submit a patch to one configured repository through a GitHub bot.
3. Verify the resulting PR's merge using GitHub evidence.
4. Display verified contributions under a pseudonymous identity.
5. Sign a bounty claim and have the sponsor approve a shielded testnet payment.
6. Reserve payouts and record transaction IDs as unverified. Confirmation and receipt must be checked in the wallet; independent verification is not implemented.

The MVP excludes mainnet, arbitrary repository support, trustless escrow, and zero-knowledge selective disclosure.

## Reading the PRD

The supplied PRD is preserved as the original product proposal. Its checkboxes, prototype descriptions, and roadmap are not the current implementation status. In particular, GitHub App connection and wallet request code now exist, while live integrations remain unverified. Use the implementation status document to distinguish implemented, tested, and deferred capabilities. External research claims in the PRD have not been independently verified.

## Run locally

Use Node.js 22.12 or later. Dependencies are installed; use `npm ci` when reinstalling.

```powershell
Copy-Item .env.example .env
npm run dev
```

Open [the local workspace](http://localhost:5173). Vite uses port 5173 and proxies the API to port 3001. Without credentials, the interface shows a labeled sample bounty; identity generation and submission preparation are available, while publishing is disabled.

Set these values in `.env` and restart:

| Variable | Purpose |
|---|---|
| `GITHUB_APP_ID` | App ID from your registered GitHub App. |
| `GITHUB_APP_PRIVATE_KEY_PATH` | Path to its private PEM signing key, kept outside public assets. |
| `GITHUB_REPOSITORY` | Existing controlled repository in `owner/name` form. |
| `GITHUB_BASE_BRANCH` | Existing branch; defaults to `main`. |
| `SPONSOR_TOKEN` | Long randomly generated sponsor access secret. |
| `BOUNTY_TITLE`, `BOUNTY_DESCRIPTION` | Actual task details. |
| `BOUNTY_CRITERIA` | Acceptance criteria separated by a pipe character. |
| `BOUNTY_AMOUNT` | Positive testnet ZEC amount with up to eight decimal places. |
| `BOUNTY_ISSUE_URL` | Optional GitHub issue URL. |
| `APP_ORIGIN` | Exact browser origin; defaults to `http://localhost:5173`. |

Follow [GitHub App setup](docs/GITHUB_APP_SETUP.md) to register the app once, then connect it from the sponsor desk. Owners approve access on GitHub; contributors never need a GitHub login or personal access token. Check the connection again after restarting the backend.

Do not commit `.env` or private PEM keys. The bot creates branches in the configured repository; arbitrary repositories and fork workflows are unsupported. Each submission replaces one complete file on a new branch. Workflow files and Git internals are excluded. The review screen shows full file contents, not a calculated Git diff.

## Identity and payouts

Create a Ghost in **My Ghost** and export its recovery file. The MVP stores private keys unencrypted in browser storage. Recovery exports contain the private key; keep them private. Losing the key means losing access to that identity.

After a maintainer merges your PR, use **Check merge status**, then review and sign a reward claim. Claims bind the origin, submission, reward, amount, receiving address, nonce, and expiry. One claim is allowed for this single-award bounty. Retrying the same persisted claim with the same identity and signature returns the existing claim. The bounty displays whether its award has already been claimed; a claim is not proof of payment.

Install the official [Noir Wallet testnet extension](https://docs.zknoir.com/noir-sdk-integration/), synchronize it, and fund it with shielded testnet ZEC. Open the sponsor desk, enter `SPONSOR_TOKEN`, connect the wallet, and review the work before approving. The integration follows the [Noir provider API](https://docs.zknoir.com/developers/provider-api/).

Recipients must use a Sapling testnet address beginning `ztestsapling1`. Unified-address recipients are unsupported. Checksum validation follows [ZIP 173](https://zips.z.cash/zip-0173).

The server reserves a claim before requesting wallet approval. Interrupted or declined requests leave the reservation in place to prevent duplicate transfers. Reconcile wallet history before recording a transaction. There is no automatic retry or reservation reset. Recovery beyond recording an existing transaction requires operator reconciliation with the server stopped and storage backed up.

Recorded transactions remain **unverified**. Check confirmation and receipt in the wallet.

## Production-style local serving

When you are ready to build:

```powershell
npm run build
```

Set `APP_ORIGIN=http://localhost:3001` in `.env`, then run `npm start`. The backend serves `dist/` and the API. Remote deployment needs HTTPS, a reverse proxy to the loopback listener, the correct origin, and further security work. No deployment has been created.

## Code organization

- `src/main.js`: state, events, routes.
- `src/views.js`: escaped screen templates.
- `src/styles.css`: responsive visual system.
- `src/identity.js`, `src/api.js`, `src/wallet.js`: keys, signed sessions, Noir integration.
- `server/index.mjs`: routes and configuration.
- `server/auth.mjs`, `server/github.mjs`, `server/zcash.mjs`: ownership, PRs, address checks.
- `server/store.mjs`: serialized atomic JSON writes.

Runtime records live in Git-ignored `data/`. Run one backend process per data directory. Sessions and challenges expire on restart; contributions, claims, and payout reservations persist. Storage contains sensitive receiving addresses and must not be made public.

See [implementation status](docs/IMPLEMENTATION_STATUS.md) for scope and remaining limitations.


## Regression checks

Run `npm test` for isolated API, client-session, rendering, and mocked GitHub integration checks. Tests use temporary storage and do not load `.env` or send GitHub/wallet requests. Run `npm run build` to verify the production bundle. These checks do not replace live GitHub installation and wallet validation.
