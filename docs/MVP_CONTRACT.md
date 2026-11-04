> Historical prototype notes. The Netlify MVP now uses maintainer GitHub sign-in, multiple public repositories, durable Netlify Blobs storage, revisions, and atomic award selection. See [current implementation status](IMPLEMENTATION_STATUS.md) and [deployment guide](NETLIFY_DEPLOYMENT.md) for current behavior and remaining live checks.

# Final MVP contract and product audit

Audited November 4, 2026 against the local source. This document defines the final MVP promise and release criteria. It supersedes the original PRD for MVP scope; it does not claim the outstanding work is implemented.

## Product promise

For a small pilot with one consenting repository maintainer and one sponsor, GhostCommits lets a developer submit a one-file contribution through a GitHub bot without a personal GitHub login, track GitHub-verified merges under a local-key identity, and request a sponsor-approved shielded Zcash testnet reward.

The final demo must show a real accepted contribution and actual recipient-wallet receipt. Testnet rewards have no monetary value. The app must distinguish a recorded transaction ID from verified payment. Manual wallet evidence is acceptable for the pilot; automatic confirmation is not promised.

The maintainer and sponsor may be the same person. The operator configures the repository, bounty terms, credentials, and local service. Contributors do not get arbitrary repository access. This is a controlled contribution workflow, not a marketplace.

## Core product problems

### 1. Privacy language exceeds the protection

The bot separates personal GitHub attribution. It does not hide code content, IP addresses from the operator, timing, or relationships between submissions under one Ghost key. Pseudonyms can already be used on GitHub, so the proposed value must be the integrated no-personal-login contribution and reward workflow, not a claim that pseudonymity itself is novel.

Use “no personal GitHub login required” and explain the operator boundary near onboarding and payout. Do not market the MVP as safe anonymity for people facing targeted surveillance. Demand for this integrated workflow remains a hypothesis until pilot users complete it and explain why they prefer it.

### 2. Identity control is not code authorship or portable reputation

Signed login authenticates a key; the server associates submissions with it. A signed claim proves control of the associated key. Neither proves that the claimant originally wrote the code. A merge confirms acceptance, not originality, security, or quality.

The current history is visible inside the authenticated workspace and depends on operator storage. There is no public profile, exported signed credential, independent history verifier, or selective disclosure. Call this “contribution history,” not a permanent professional reputation or portable portfolio. Those broader capabilities are excluded from the final MVP.

### 3. The award currently goes to the first claimant, before sponsor selection

The backend permits only one claim for the bounty. The first eligible contributor to sign blocks all others, even if the sponsor does not accept that work for the award. There is no rejection state. This contradicts meaningful sponsor selection and can leave the bounty stuck.

Required before release: allow eligible submissions to request review without consuming the award; let the sponsor reject with a reason or select one claim. Selection/reservation must be atomic and prevent two payouts. Existing selected or uncertain transfers must never be reopened automatically. The contributor must see that a merged PR is not a guaranteed reward. Until implemented, the current first-claim behavior is a blocker, not a fair award mechanism.

### 4. The contribution flow stops when a maintainer requests changes

There is no contributor-side revision or review-reply workflow. Retrying PR creation does not update a successfully created PR. Requiring a personal GitHub login for follow-up would break the core promise.

Required before release: display or retrieve maintainer feedback and let the owning Ghost revise the same one-file PR under bot attribution, with closed/merged PRs protected against updates. At minimum, contributors must be able to read feedback on the public PR and submit a revision in GhostCommits. The pilot should use a public repository because anonymous contributors cannot necessarily read private repository reviews. Multi-file patches and normal Git transport remain excluded.

### 5. A payment request is not a completed bounty

Wallet request code exists, but live approval, shielding, broadcast, and receipt remain unverified. A pasted transaction ID does not prove amount, recipient, network, shielding, or receipt. No escrow guarantees that the sponsor will pay.

Required before release: demonstrate a sponsor-approved shielded testnet transfer and matching recipient-wallet receipt. Keep app status “recorded-unverified” unless a genuine verification mechanism is added. A wallet-declined or interrupted request must have a documented, rehearsed reconciliation procedure. The current reservation prevents duplicates but can leave a workflow stuck; never solve this by blindly enabling another send.

### 6. Bounty terms can drift and setup can look more ready than it is

The bounty has a fixed ID but terms come from environment variables. Changing the repository or amount can change what existing work appears eligible for. GitHub readiness alone does not mean sponsor access, wallet funding, or a payout path is ready.

Required before release: persist or version the bounty terms used by each submission and claim, and reject incompatible configuration changes. Show contribution readiness separately from reward readiness. Do not describe a connected repository as a funded bounty; no escrow or balance guarantee exists. Use a task small enough to finish in one file rather than the broad sample wallet-synchronization task.

## Claim-to-evidence matrix

| Final MVP claim | Current implementation | Required release evidence |
|---|---|---|
| Create and recover a Ghost identity | Local Ed25519 keys and recovery import/export | Browser creation, export, restore, and successful ownership login |
| Submit without personal GitHub login | GitHub App creates bot commits and PRs | Real PR in the controlled public repository; inspect author metadata |
| Complete a reviewed contribution | Initial submission only; revision missing | Maintainer requests a change; same Ghost revises same PR without personal login |
| Track accepted contributions | API merge checks and authenticated history | Real merge updates history once; mismatched and unmerged PRs do not qualify |
| Prove control of the submission identity | Signed login and claims | Correct key succeeds; wrong key, tampered message, and expired challenge fail |
| Sponsor chooses one award | First claim blocks bounty; rejection missing | Two eligible claims; reject/select flow; concurrent selection yields at most one reservation |
| Request a shielded testnet reward | Noir SDK request and transaction recording | Live sponsor approval and receipt shown in recipient wallet |
| Report payout status accurately | Transaction IDs remain unverified | Manual recording never displays paid/confirmed; interrupted transfer is reconciled safely |
| Preserve agreed reward terms | Environment-derived terms; mutation warning only | Changing configuration cannot silently change existing contribution terms |
| Explain privacy honestly | Boundary screen and revised copy | UI walkthrough includes operator visibility, public code, unencrypted keys, and no monetary value |

## Explicit exclusions

- Guaranteed anonymity, network anonymity, or automatic identity-leak prevention.
- Proof of original code authorship, copyright ownership, code quality, or identity uniqueness.
- Public/shareable reputation profiles, permanent history guarantees, portable credentials, or zero-knowledge proofs.
- Arbitrary repositories, repository discovery, multiple simultaneous bounties, multi-file patch submission, or a Git remote.
- Mainnet payments, real earnings, escrow, guaranteed sponsor funding, or automatic payment confirmation.
- Production security, encrypted local keys, multi-process persistence, or independent security-audit claims.

## Release gate

Automated tests and a passing build establish only their covered behavior. They do not close the live GitHub, browser, or wallet gates. Final MVP release requires all required evidence above, including the missing selection, revision, and immutable-terms behavior. Keep evidence in a release checklist with date, result, and a redacted reference; do not include private keys, sponsor secrets, or private payment addresses in public demo materials.

Do not call the MVP complete while a core advertised flow cannot finish. If a requirement is intentionally deferred, revise the promise and obtain an explicit scope decision rather than quietly treating the missing flow as implemented.
