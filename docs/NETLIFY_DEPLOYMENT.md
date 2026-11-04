# Netlify deployment and live demo

## 1. Connect the repository

Import `Samarth208P/ghostcommits` into Netlify using Git integration. Deploy branch: `main`. The repository supplies the build command (`npm run build`), publish directory (`dist`), Node 22, function directory, and API routing.

The backend uses Netlify Blobs for durable storage. There is no Postgres dependency, database provisioning step, or SQL migration. Blobs access is supplied automatically to Netlify Functions; no database connection string or storage token needs to be added. A static-only deploy is insufficient.

Keep a stable production site URL. Do not use a deploy-preview URL as the production OAuth callback. Production uses a site-wide Blobs store that persists across deployments. Previews use deploy-specific stores and cannot read or modify production records. Omit production GitHub credentials from preview contexts. This workflow does not need production secrets in previews.

## 2. Register one public GitHub App

In GitHub **Settings > Developer settings > GitHub Apps > New GitHub App**:

| Setting | Value |
|---|---|
| App name | A unique name such as GhostCommits Demo |
| Homepage URL | `https://YOUR-SITE.netlify.app` |
| Callback URL | `https://YOUR-SITE.netlify.app/api/github/callback` |
| Setup URL | `https://YOUR-SITE.netlify.app/#sponsor` |
| Webhooks | Disable Active; this MVP verifies merge state on demand |
| Repository Contents | Read and write |
| Repository Pull requests | Read and write |
| Repository Metadata | Read-only (automatic) |
| Installation availability | Any account (public app) |

Enable expiring user access tokens. The app uses OAuth authorization code flow with state, a browser-bound HttpOnly cookie, and PKCE. No extra OAuth scopes are requested. Do not configure an OAuth App instead of a GitHub App: bot installation credentials and user authorization are both required.

Generate a private key and a client secret. Copy the App ID and Client ID. Keep the PEM and secret private. There is no need to grant access to all repositories; maintainers can select only the repositories used for the demo.

## 3. Add Netlify environment variables

Add these under project environment variables for **Production**, with the **Functions** scope. If your UI only offers all scopes, that is sufficient; never prefix secrets with `VITE_`.

| Variable | Value |
|---|---|
| `APP_ORIGIN` | Exact HTTPS origin, e.g. `https://YOUR-SITE.netlify.app`, no trailing slash |
| `GITHUB_APP_ID` | Numeric GitHub App ID |
| `GITHUB_CLIENT_ID` | GitHub App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub App client secret |
| `GITHUB_APP_PRIVATE_KEY` | Entire PEM, including BEGIN/END lines; literal `\n` separators also work |
| `SESSION_ENCRYPTION_KEY` | 32 random bytes encoded as 64 hex characters |

Generate the encryption key locally:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep it stable across deploys: existing encrypted GitHub tokens require the same key. Netlify supplies Blobs access automatically. No `NETLIFY_DB_URL` is required. Do not set `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, or `SPONSOR_TOKEN` for the hosted maintainer flow.

Redeploy after setting the variables. These values are runtime settings; `netlify.toml` cannot carry the secrets for you.

## 4. Check the deployed service

Visit `/api/health`. Expect `ok: true`, `storage: "blobs"`, `githubConfigured: true`, and `network: "testnet"`.

- If an old build still attempts database provisioning, deploy the latest `main` commit with a cleared build cache. The current package manifest and repository contain no database dependency or migrations.
- If Blobs access fails, inspect the function logs and confirm this is a Netlify Functions deployment. Do not put storage credentials in frontend variables.
- Concurrent writes use a version check. A conflict returns HTTP 409 without overwriting newer data or automatically repeating the operation. Refresh and retry; after any attempted wallet transfer, inspect wallet history before taking another payment action.
- `githubConfigured: false` means one of the required app values or encryption key is missing/invalid.
- A GitHub callback error commonly means the registered URL and `APP_ORIGIN` differ. Use the exact same scheme and hostname.
- An empty repository list means the app is not installed, installation is suspended, the repository is private/archived, or the signed-in user lacks admin/maintainer rights. Install the app, return to the desk, and refresh.
- Sessions expire after at most eight hours; sign in again if GitHub access expires or is revoked.

No fake bounty is published automatically. The first maintainer publishes the first real task.

## 5. Rehearse the real demo

Use a small public demo repository with an existing default branch and README. Prepare two separate browser profiles: a GitHub maintainer and a contributor. Install the official Noir testnet extension in both profiles, synchronize both wallets, and fund the maintainer with shielded testnet ZEC sufficient for the reward plus fees. Use a supported recent Noir build with `getMaxTransfer` and shielded `fundingSource` support.

1. Sign in on the sponsor desk and install the GitHub App on the demo repository.
2. Refresh repositories and publish a tiny task, such as adding a working usage example to README. Choose a small testnet reward (e.g. 0.01 ZEC).
3. In the contributor profile, open the bounty link, create a Ghost, and export its recovery key.
4. Submit updated file contents. Inspect the actual GitHub PR and bot commit author.
5. Leave a review comment as maintainer. From GhostCommits, open the PR feedback and use **Revise this contribution**. Verify the same PR updates.
6. Merge on GitHub, then **Check merge status** in GhostCommits.
7. Select **Use my Noir Wallet address**, review the claim, and sign it with the Ghost key. A manual valid Sapling testnet address also works.
8. Maintainer connects Noir, reviews the claim, and selects **Approve in wallet**. The app checks spendable shielded funds, reserves the single award, and requests wallet approval.
9. Record the returned transaction ID and verify receipt in the recipient wallet. The app intentionally keeps the status unverified.
10. Reload both profiles and confirm the bounty, contribution, claim, and transaction ID persist.

For a cancelled, failed, timed-out, or interrupted send: the reservation remains. Do not send again blindly. Inspect the originating wallet history; if a transaction exists, copy its 64-character ID into **Record transaction**. A definitive no-transfer outcome currently requires operator reconciliation; the app has no automated reservation reset. Rehearse this before a public demo and use a fresh bounty for a new independent demonstration.

## Evidence to record

Record the production URL, GitHub PR URL, bot authorship check, revision/merge checks, successful reload, transaction ID, and recipient wallet receipt. Keep private keys, secrets, recovery files, and private wallet details out of public evidence. Automated tests use simulated GitHub/wallet responses and cannot replace these live checks.

References: [GitHub App user access tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), [Noir provider API](https://docs.zknoir.com/developers/provider-api/).

## Storage limits

The small demo stores its aggregate state in one strongly consistent blob. Each mutation commits once using an ETag condition (or create-only for the first record). Conflicts fail explicitly instead of automatically repeating operations that may call GitHub. GitHub side effects are not rolled back if a later storage write conflicts: refresh and retry PR creation to discover an already-created PR. No wallet send begins until the payout reservation is successfully persisted. This design favors a low-traffic testnet demo; it is not a general relational database or a high-throughput payment service. Existing local JSON data is not automatically imported.
