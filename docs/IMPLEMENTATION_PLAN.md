# Implementation plan

Status: pending user instruction to begin building. All items below are future work, not completed capabilities.

## Phase 0: Validate prerequisites

- [ ] Confirm the controlled GitHub repository and restricted bot access.
- [ ] Define one bounty with explicit acceptance criteria and a testnet reward.
- [ ] Verify browser support for the proposed identity primitives.
- [ ] Verify wallet SDK availability, shielded testnet support, and confirmation options against current official documentation.
- [ ] Establish sponsor and recipient testnet wallets, funding, and synchronization.
- [ ] Resolve the open decisions in [the architecture](ARCHITECTURE.md).

Acceptance: the proposed end-to-end demo is feasible with the chosen repository, browser, and wallets.

## Phase 1: GitHub contribution flow

- [ ] Accept a bounded patch or file-content submission for the configured repository.
- [ ] Show a privacy review before publishing.
- [ ] Remove identifying commit metadata and use bot attribution.
- [ ] Create a real PR and retain its submission association.
- [ ] Verify a real merge through GitHub, including repository, PR, and merge SHA.

Acceptance: an actual bot-authored PR is merged and independently checked by the application.

## Phase 2: Identity and reputation

- [ ] Generate an Ed25519 identity locally and support recovery key export.
- [ ] Authenticate submission ownership and bind it to the public key.
- [ ] Show verified, deduplicated merged contributions on the profile.
- [ ] Issue bounded, expiring signing challenges for claims.
- [ ] Verify signatures and consume nonces safely.
- [ ] Reject wrong-key claims, altered addresses/reward identifiers, expired challenges, and replays.

Acceptance: the original identity can prove ownership; another identity cannot claim the submission; repeated merge checks cannot inflate reputation.

## Phase 3: Zcash testnet payout

- [ ] Validate the destination for the selected shielded testnet flow.
- [ ] Restrict payout requests to the authorized sponsor.
- [ ] Require sponsor authorization before sending funds.
- [ ] Execute a real shielded testnet payment.
- [ ] Distinguish approval, broadcast, manual recording, and verified confirmation.
- [ ] Verify recipient receipt with appropriate wallet evidence.
- [ ] Prevent duplicate payouts across retries and concurrent requests.

Acceptance: actual testnet funds reach the recipient; a pasted transaction ID cannot falsely mark a claim paid. If wallet integration or confirmation remains incomplete, document it as an unmet MVP requirement.

## Phase 4: Usability and privacy review

- [ ] Explain identity recovery and key-loss consequences.
- [ ] Display contribution and payment lifecycles accurately.
- [ ] Identify which information is public, operator-visible, and local.
- [ ] Check that public responses and logs do not expose private keys or receiving addresses.
- [ ] Present reputation as verified work counts, not an automatic quality score.

Acceptance: the interface's claims match demonstrated behavior and documented limitations.

## Phase 5: Demonstration

- [ ] Rehearse the PRD's three-minute sequence.
- [ ] Capture real GitHub creation/merge evidence.
- [ ] Demonstrate successful ownership verification and wrong-key rejection.
- [ ] Capture real testnet payment and receiving-wallet evidence.
- [ ] Prepare a clearly identified backup recording.
- [ ] Check the hackathon's submission requirements before submitting.

Acceptance: all eight success criteria in PRD section 14 are demonstrated; any gaps are stated explicitly.

## Deferred scope

Git remote transport, arbitrary repositories, GitHub App migration, stronger key recovery, signed credential export, selective disclosure, and production hardening remain outside the initial implementation unless scope is explicitly revised. Mainnet payments remain out of scope.
