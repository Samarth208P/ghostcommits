# Implementation status

Updated November 4, 2026. Source is implemented; runtime behavior remains unverified. The user requested no tests or trial runs. No build, preview, browser checks, GitHub operations, or Zcash transfers were executed during implementation.

## Source implementation

- Responsive bounty, submission review, contribution timeline, recovery, sponsor desk, and privacy screens.
- Local Ed25519 generation, fingerprint, recovery export/import, and signed sessions.
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
