# Implementation status

Updated November 4, 2026. Dhananjay's frontend redesign is integrated with the GitHub App connection flow. The local production build and automated regression suite pass.

## Verification

- `npm test`: four regression groups cover identity rendering during startup, escaped draft previews, disabled publishing without configuration, session recovery after a server restart, JSON validation, signed login and replay rejection, origin restrictions, sponsor authorization, concurrent payout reservations, payment-record retry recovery, and disk persistence.
- GitHub installation discovery, scoped token caching, interrupted PR creation retries, and merge evidence are checked with mocked GitHub responses and a temporary test signing key. No real GitHub writes occur in tests.
- `npm run build` passes. Tests use isolated temporary storage and do not load the project's `.env`.
- Browser interaction verification remains incomplete: the computer-use tool stopped because it could not reliably determine the current Chrome URL.
- Live installation permissions, real PR creation and merge verification, Noir Wallet approval, and testnet receipt still require the configured environment and live verification.

## Source implementation

- Responsive bounty, submission review, contribution timeline, recovery, sponsor desk, and privacy screens.
- Local Ed25519 generation, fingerprint, recovery export/import, and signed sessions.
- GitHub App installation connection from the sponsor desk; server-only, repository-restricted installation tokens with expiry refresh. Recheck connection after backend restart.
- Configured-repository branches, bot commits, real PR creation, retry lookup, and merge evidence checks.
- Reputation counts from stored verified merges and signed reward claims.
- Sponsor authorization, persistent payout reservation, Noir testnet payment requests, and transaction recording.
- Serialized atomic JSON storage, request limits, nonce consumption, expiry, and Sapling address checksum validation.

## Limits

- One bounty, award, and repository. Do not repurpose persisted bounty terms by changing configuration mid-run.
- One complete file per submission; no arbitrary patches, Git transport, or calculated Git diff.
- Sapling testnet recipients only; no Unified-address decoding or mainnet.
- No independent confirmation verification. Payment records stop at `recorded-unverified`.
- Interrupted or declined wallet requests leave reservations requiring reconciliation, not a repeat-send button.
- No portable signed credentials, selective disclosure, quality scores, or public profile publishing.
- Private keys are unencrypted in browser storage; recovery files contain the private key.
- No production key rotation, encrypted server storage, automatic retention deletion, multi-process database, or network anonymity.
- Rate limiting uses socket addresses. Reverse-proxy deployment requires a trusted-proxy and abuse-control design.
- Sponsor approval accepts the work for payout; a merge alone never sends funds.

## Configuration and references

No credentials are embedded. Configure `.env` yourself. No repository access, wallet balance, real PR, or actual payment was assumed to exist.

GitHub code follows the official [commit API](https://docs.github.com/en/rest/git/commits), [tree API](https://docs.github.com/en/rest/git/trees), and [pull request API](https://docs.github.com/en/rest/pulls/pulls). Wallet code follows the [Noir integration guide](https://docs.zknoir.com/noir-sdk-integration/) and installed SDK declarations. Address validation follows [ZIP 173](https://zips.z.cash/zip-0173).
