# Proposed architecture

Status: original architecture proposal, retained for design context. Source implementation, automated regression checks, and a passing production build now exist; see [implementation status](IMPLEMENTATION_STATUS.md) for current scope and limits. Proposed records and open questions below are historical, not a description of unresolved implementation work. Live GitHub and wallet validation remains outstanding.

## Components

| Component | Proposed responsibility |
|---|---|
| Browser client | Generate an Ed25519 identity, export recovery material, prepare submissions, sign claims, and display progress. |
| Node.js backend | Bind authenticated submissions to public keys, create bot PRs, verify merge evidence, issue challenges, and coordinate payout records. |
| Local JSON storage | Persist MVP identities, bounties, submissions, merge evidence, and claim/payment state. |
| GitHub | Host public changes, bot commits, reviews, CI results, and canonical merge evidence. |
| Sponsor wallet | Obtain sponsor approval and send shielded Zcash testnet funds. |
| Recipient wallet | Receive testnet funds and provide evidence of receipt. |

HTML/JavaScript, Node.js, local JSON, the GitHub REST API, and WebCrypto Ed25519 are the PRD's proposed MVP stack. Browser support, wallet APIs, testnet support, and hosting constraints require validation before implementation decisions become final.

## Intended flow

1. The browser generates an identity; only the public key is registered with the backend.
2. The contributor selects the configured bounty and reviews submitted text and code for identifying content.
3. The backend authenticates submission ownership and creates sanitized bot commits and a PR in the configured repository.
4. The maintainer reviews and merges through GitHub.
5. The backend verifies repository identity, PR number, merged state, merge commit SHA, and the associated submission.
6. Verified, deduplicated merge evidence updates the contributor's profile.
7. The backend issues a claim challenge bound to the submission, reward, receiving address, domain, nonce, and expiry.
8. The browser signs it; the backend verifies ownership and eligibility and prevents reuse.
9. The sponsor authorizes a shielded testnet payout.
10. Payment status advances only as supporting evidence becomes available.

## Planned records

| Record | Required information |
|---|---|
| Identity | Public key and display pseudonym. The display pseudonym is not an authentication credential. |
| Bounty | Repository, issue, acceptance criteria, amount, network, sponsor, and availability. |
| Submission | Identifier, owning public key, bounty, repository, PR reference, and lifecycle state. |
| Merge evidence | Repository identity, PR number, verified merged state, merge SHA, and verification time. |
| Claim | Submission/reward references, address, challenge, nonce, expiry, signature, and processing status. |
| Payment | Claim reference, approval state, transaction reference if available, and confirmation/receipt evidence. |

Exact schemas and endpoint contracts remain undecided. Receiving addresses and claim/payment records require restricted access. Private identity keys must never enter backend records.

## State and evidence

- Contribution submission, PR creation, merge verification, and reputation credit are separate events.
- A rejected or unmerged PR does not earn a merged-contribution achievement.
- A valid signature proves control of a key; eligibility also requires verified contribution ownership and bounty acceptance.
- Sponsor approval, broadcast, recorded transaction ID, confirmed payment, and recipient receipt are distinct payment facts.
- Manual transaction recording alone must never set payment to confirmed.
- Duplicate requests, retries, and concurrent claims must not create duplicate rewards or reputation credit.

## Decisions to resolve before building

- Which controlled test repository, bot permissions, and sample bounty will be used?
- How will initial submissions authenticate ownership, including exact signed message encoding?
- How will browser identity storage, recovery import, and export work?
- Which wallet integration supports the required shielded testnet flow, and how will confirmation and recipient receipt be verified?
- How will sponsor authentication and payout authorization be enforced?
- How will JSON writes, nonce consumption, and payout idempotency remain safe across crashes and concurrent requests?
- What address retention policy and public profile visibility will apply?

Signed portable credentials are a later enhancement. Any such credential is issuer-backed verification, not trustless proof of GitHub history.
