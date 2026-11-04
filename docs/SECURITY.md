# Privacy and security requirements

Status: MVP requirements. Source implementation exists, and automated regression checks and the production build pass. No independent security audit has taken place; live GitHub and wallet verification remains outstanding. See [implementation status](IMPLEMENTATION_STATUS.md) for current limits.

## Intended privacy boundary

GhostCommits aims to hide personal GitHub attribution through bot submissions and protect payment details from public blockchain observers through shielded Zcash payments.

It does not promise anonymity against the service operator, network surveillance, coding-style analysis, self-identifying code, or compromised devices. Persistent pseudonymous profiles can link a contributor's activities together.

## Data boundaries

| Location | Intended data |
|---|---|
| Public GitHub repository | Submitted code, PR title/body, bot metadata, reviews, CI, and merge history. |
| GhostCommits backend | Public keys, submission associations, merge evidence, bounty state, and restricted claim/payment records. |
| Contributor browser | Private signing key, public key, and local identity information. |
| Sponsor access | Receiving address and information necessary to authorize a payout. |

The backend may observe network metadata and correlate submissions with receiving addresses. Shielded payments do not remove information already known to the operator or sponsor.

## Requirements before an MVP demonstration

- Keep private identity keys in the browser; never send them to the backend or include them in telemetry.
- Explain recovery-key backup and the consequences of key loss. Browser storage is a demo compromise, not a production storage guarantee.
- Authenticate ownership when a submission is created, not only when a reward is claimed.
- Restrict bot credentials to the configured repository and required operations; keep credentials server-side.
- Sanitize commit author/committer metadata and review code, text, paths, and URLs for identity leaks before publishing.
- Treat user content as untrusted. Constrain repository and file targets and avoid executing submitted code in the service.
- Verify GitHub merge evidence against the stored contribution association; do not accept client-declared merge status.
- Bind claim signatures to submission ID, reward ID, receiving address, application domain, unique nonce, and expiration.
- Define an unambiguous signed-message encoding and enforce single-use challenges, including concurrent requests.
- Require sponsor authentication and explicit payout authorization.
- Make reputation credit and payout processing idempotent; interrupted requests must not create duplicate rewards.
- Restrict receiving-address access and define retention limits. Keep sensitive claim data out of public profiles and logs.
- Use only Zcash testnet. Confirm that the selected sending and receiving flow uses shielded funds and a shielded recipient.
- Do not equate a recorded transaction ID with successful payment; retain evidence for confirmed or received states.

## Verification scenarios for future implementation

| Scenario | Expected result |
|---|---|
| Another key attempts to claim a submission | Rejected. |
| A signed address or reward identifier is changed | Rejected. |
| A challenge expires or is replayed | Rejected for a new action. An exact authenticated retry of a persisted claim returns the original record without creating another award. |
| Two claim requests arrive concurrently | At most one eligible claim is consumed for the reward. |
| The client reports an unmerged PR as merged | No reputation or payout eligibility granted. |
| Merge verification runs repeatedly | Reputation credited once. |
| A transaction ID is manually entered | Recorded as unverified until appropriate evidence is checked. |
| Payment processing retries after interruption | No automatic duplicate transfer. |
| Public profile or logs are inspected | No private keys or private receiving addresses exposed. |

## Later hardening

Production use would require stronger encrypted key storage and recovery, abuse controls, robust persistent storage, payment reconciliation, retention enforcement, and an independent security review. Repository-scoped GitHub App integration is implemented but still requires live validation. Selective disclosure and resistance to network-level correlation require additional design beyond this MVP.
