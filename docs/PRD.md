# GhostCommits — Product Requirements Document (PRD)

**Tagline:** Build in public. Stay private. Get paid.

**Project:** GhostCommits  
**Hackathon:** Free Society Hack — Zcash Privacy Track  
**Date:** November 4, 2026  
**Network:** Zcash Testnet  
**Goal:** Build a working, innovative MVP within one hackathon day.

---

# 1. Executive Summary

GhostCommits is a privacy-first platform that enables developers to contribute to open-source GitHub repositories without revealing their personal identities, build verifiable anonymous reputations, and receive private payments through Zcash.

Today, GitHub permanently associates contributions with identities. Developers who wish to contribute anonymously often lose the ability to establish credibility, demonstrate their experience, or receive compensation for their work.

GhostCommits addresses this problem by combining three capabilities:

1. **Anonymous GitHub Contributions:** Developers submit code through a relay that creates pull requests without exposing their personal GitHub accounts.
2. **Verifiable Anonymous Reputation:** Developers cryptographically prove ownership of accepted contributions and build reputation without revealing their real identities.
3. **Private Zcash Bounties:** Developers receive rewards through Zcash shielded transactions, protecting payment details from public blockchain observers.

### Core Vision

**Your contributions should be verifiable without your identity being public.**

GhostCommits enables developers to build meaningful professional reputations while maintaining control over their privacy.

---

# 2. Problem Statement

Open-source development is inherently public.

When developers contribute to GitHub, information such as their usernames, commit metadata, contribution histories, and associated profiles may become publicly accessible.

This creates problems for developers who:

- Work on privacy-sensitive projects.
- Live in politically restrictive environments.
- Want to contribute without revealing their employers.
- Prefer not to associate certain projects with their professional identities.
- Value financial privacy.
- Want to maintain separate development identities.

Existing anonymization solutions can hide GitHub identities, but developers still need reliable ways to prove ownership of their work, build reputation, and receive compensation.

### The three core problems

**Problem 1: Identity exposure**

Traditional GitHub contributions are associated with identifiable accounts.

**Problem 2: Loss of reputation**

Contributors who hide their identities may struggle to demonstrate their previous achievements.

**Problem 3: Financial transparency**

Public blockchain payments can expose payment relationships, amounts, and transaction histories.

GhostCommits combines solutions to all three problems.

---

# 3. Competitive Research and Inspiration

Anonymous GitHub contributions are not a new concept.

Several existing projects already solve parts of this problem. GhostCommits must differentiate itself through the combination of privacy, verifiable reputation, and shielded payments.

## 3.1 Gitmask

**Repository:** https://github.com/AnalogJ/gitmask

Gitmask allows developers to contribute to GitHub repositories anonymously.

It acts as an intermediary Git remote.

### How it works

1. Developer prepares a Git commit.
2. Developer pushes the commit to Gitmask.
3. Gitmask removes identifying commit metadata.
4. Gitmask creates a pull request through its bot account.

### What we should learn

- Preserve normal Git development workflows.
- Remove identifying commit metadata.
- Avoid mandatory personal GitHub authentication.
- Support familiar Git commands.

### Where GhostCommits differs

Gitmask primarily addresses anonymous contribution submission.

GhostCommits additionally introduces verifiable contribution ownership, portable reputation, and shielded Zcash bounty payments.

---

## 3.2 gitGost

**Repository:** https://github.com/livrasand/gitGost

gitGost is particularly relevant because it already supports anonymous GitHub contributions and a pseudonymous karma system.

### Existing capabilities

- Anonymous Git pushes.
- Commit metadata anonymization.
- Bot-generated pull requests.
- Hash-based contributor identities.
- Reputation or karma tracking.
- Abuse-prevention mechanisms.

### Important finding

We cannot claim that anonymous GitHub contributions or basic anonymous reputation are original inventions.

### Our differentiation

GhostCommits focuses on:

1. Cryptographically verifiable contribution ownership.
2. Portable contribution credentials.
3. Private Zcash bounty claims.
4. Selective disclosure of achievements.
5. An integrated private contribution economy.

The priority is not to rebuild gitGost.

For a future production version, integrating a mature Git anonymization relay could be preferable to writing our own entire Git transport system.

---

## 3.3 OnlyDust

**Website:** https://www.onlydust.com/

OnlyDust supports open-source contributors through projects, reputation tracking, and financial rewards.

### Features worth studying

- Contributor dashboards.
- Contribution histories.
- Project discovery.
- Reward tracking.
- Contributor recognition.
- Maintainer-driven evaluation.

### Important lesson

OnlyDust experimented with AI-based contributor reward evaluation and documented problems involving gaming and low-value contributions.

Reference:

https://blog.onlydust.com/we-gave-1m-to-oss-contributors-with-an-ai-agent-it-wasnt-enough/

### What we should implement

Reward developers for meaningful, accepted work rather than simply counting pull requests.

For the MVP, reputation should primarily reflect verified merged contributions.

We should not automatically assign arbitrary quality scores without credible evaluation.

---

## 3.4 Drips

**Website:** https://drips.network/

Drips enables funding for open-source repositories and their dependencies.

### Inspiration

- Repository-centric funding.
- Financial support for maintainers.
- Transparent funding rules.
- Recurring rewards.
- Project-based funding dashboards.

### GhostCommits differentiation

Drips focuses on directing funding toward open-source projects and dependencies.

GhostCommits focuses on anonymous individual contributions and private compensation.

---

## 3.5 Gitcoin

**Website:** https://gitcoin.co/

Gitcoin provides established models for financing open-source work and public goods.

### Inspiration

- Task-based bounties.
- Clear acceptance criteria.
- Defined compensation.
- Open-source funding.
- Contributor incentives.

### What we should avoid

Poorly defined bounties, unclear acceptance criteria, and complicated payment mechanisms.

---

## 3.6 Radicle

**Website:** https://radicle.xyz/

Radicle is a decentralized Git collaboration network built around cryptographic identities.

### Inspiration

- Public-key-based identities.
- Cryptographically signed contributions.
- User-owned data.
- Portable identity.
- Independent verification.

### Our approach

GhostCommits should remain compatible with GitHub.

Building an entirely new decentralized Git hosting platform would introduce unnecessary complexity for this hackathon.

---

# 4. Product Differentiation

**GhostCommits is a private contribution economy, not merely an anonymous Git proxy.**

Its unique value proposition is the combination of:

| Capability | Purpose |
|---|---|
| Anonymous PR submission | Hide personal GitHub attribution |
| Cryptographic identity | Prove ownership without personal login |
| Verified contribution credentials | Build trusted reputation |
| Zcash shielded payments | Protect financial transaction details |
| Selective disclosure (future) | Prove achievements without revealing full history |

### Long-term vision

A developer should eventually be able to prove:

"I have successfully merged 20 pull requests into established open-source projects."

Without needing to reveal:

- Their real identity.
- Their personal GitHub account.
- Their complete contribution history.
- Their payment history.

Selective disclosure requires additional cryptographic infrastructure and is not part of the initial MVP.

---

# 5. User Personas

## 5.1 Anonymous Developer

Wants to contribute to open source while protecting their identity.

Needs:

- Anonymous contribution submission.
- Simple Git workflow.
- Cryptographic proof of ownership.
- Persistent reputation.
- Private compensation.

## 5.2 Repository Maintainer

Wants useful contributions without dealing with unnecessary spam.

Needs:

- Normal GitHub pull requests.
- Existing GitHub review tools.
- CI integration.
- Clear contributor reputation signals.
- Simple moderation controls.

## 5.3 Bounty Sponsor

Wants to fund meaningful open-source contributions.

Needs:

- Clear task requirements.
- Fixed reward amounts.
- Verified completion.
- Secure payout authorization.
- Protection against duplicate claims.

---

# 6. Complete User Flow

## Step 1: Create Anonymous Identity

User opens GhostCommits.

The application generates an Ed25519 cryptographic key pair locally.

The user receives a pseudonymous identity such as:

`Ghost #8F21`

The private key remains in the user's browser.

The public key is registered with GhostCommits.

No personal GitHub login is required.

### Interface

- Generate Ghost Identity
- Export Recovery Key
- View Anonymous Profile

**Important:** Users must back up their recovery keys. Losing the private key could mean losing the ability to prove ownership of previous contributions.

---

## Step 2: Explore Open-Source Bounties

The dashboard displays available tasks.

Example:

**Repository:** example/zcash-wallet  
**Issue:** Improve wallet synchronization  
**Reward:** 0.5 testnet ZEC  
**Difficulty:** Intermediate  
**Status:** Open

Each bounty includes:

- Repository information.
- GitHub issue link.
- Description.
- Acceptance criteria.
- Reward amount.
- Sponsor information.
- Submission deadline, if applicable.

The MVP can start with one manually configured bounty.

---

## Step 3: Submit Code Anonymously

The developer selects a bounty and prepares their contribution.

### MVP workflow

1. Enter contribution title.
2. Provide a description.
3. Select destination file.
4. Submit new file contents or patch.
5. Review a privacy warning.
6. Confirm anonymous submission.

### Future workflow

Support a standard Git remote:

```bash
git remote add ghost <ghostcommits-relay-url>

git push ghost feature-branch
```

The relay should remove identifying Git metadata before forwarding commits.

### Privacy checklist

Warn users about:

- Personal names.
- Email addresses.
- Embedded credentials.
- Identifying comments.
- Sensitive URLs.
- Original commit metadata.

Automated scanning can flag potential leaks, but cannot guarantee anonymity.

---

## Step 4: GitHub Bot Creates Pull Request

GhostCommits creates a pull request on GitHub.

GitHub displays a generic bot identity rather than the contributor's personal account.

### Information visible on GitHub

- Pull request title.
- Description.
- Source code changes.
- Bot author.
- Review comments.
- CI results.
- Merge status.

### Information not required on GitHub

- Personal contributor username.
- Personal email.
- Zcash wallet address.
- GhostCommits private key.

The GitHub repository remains the canonical location for code review and merging.

### Important limitation

For the MVP, the bot requires appropriate access to the selected test repository.

Contributing to arbitrary repositories requires a more sophisticated fork or GitHub App workflow.

---

## Step 5: Maintainer Reviews Contribution

The maintainer uses GitHub normally.

They can:

- Review code.
- Request changes.
- Run tests.
- Approve the contribution.
- Merge the PR.
- Reject the PR.

The contributor's personal GitHub identity is not required.

---

## Step 6: Verify Contribution

GhostCommits checks GitHub to establish whether the pull request was merged.

Validation should bind:

- Repository identity.
- Pull request number.
- Merge status.
- Merge commit SHA.
- Associated anonymous contribution record.

Only verified accepted work should qualify for an achievement.

---

## Step 7: Cryptographic Proof of Ownership

The contributor requests their reward.

GhostCommits issues a signing challenge.

The contributor signs that challenge using their private key.

The backend verifies the signature using the registered public key.

This demonstrates that the claimant controls the anonymous identity associated with the submission.

### Security requirements

A production claim challenge should include:

- Submission ID.
- Receiving address.
- Unique nonce.
- Expiration timestamp.
- Application domain.
- Reward identifier.

This prevents replaying old claims or redirecting payments using previously captured signatures.

---

## Step 8: Private Zcash Payment

The contributor provides a shielded Zcash testnet receiving address.

The sponsor reviews the payout request.

The sponsor authorizes payment through a compatible wallet such as Noir Wallet.

### Expected payment flow

1. Bounty becomes eligible.
2. Contributor signs claim.
3. Backend verifies signature.
4. Sponsor receives payment request.
5. Sponsor approves the Zcash transaction.
6. Transaction is broadcast.
7. Recipient receives testnet ZEC.
8. Confirmation is verified.

For maximum on-chain privacy, payments should originate from shielded funds and go to a shielded recipient.

### Important limitation

The current prototype supports signed payout requests and manual transaction recording.

Direct wallet integration and independent confirmation verification still need implementation.

A recorded transaction ID must not automatically be treated as proof of successful payment.

---

# 7. Anonymous Reputation System

Every accepted contribution contributes to a pseudonymous professional history.

### Example profile

**Ghost #8F21**

- Verified merged PRs: 12
- Repositories contributed to: 4
- Verified achievements: 12
- Bounties claimed: 5

### Reputation principles

- Reputation is derived from verified work.
- A pull request must be genuinely accepted.
- Duplicate records must not increase reputation.
- Simple PR counts should not be presented as measures of quality.
- Maintainers may eventually issue endorsements.

### Portable credentials

The long-term goal is to issue cryptographically signed contribution credentials.

Illustrative schema:

```json
{
  "schema": "ghostcommits.achievement.v1",
  "subjectPublicKey": "...",
  "repository": "example/zcash-wallet",
  "pullRequest": 42,
  "mergedCommitSha": "...",
  "achievement": "merged-pull-request",
  "issuer": "GhostCommits"
}
```

The credential would be signed by an authorized issuer after checking the GitHub evidence.

A verifier could validate the issuer's signature and supporting merge record.

**This provides issuer-backed verification, not trustless proof of GitHub history.**

---

# 8. Data Architecture

## 8.1 Data Stored on GitHub

GitHub stores:

- Source code changes.
- PR descriptions.
- Bot commit metadata.
- Reviews.
- CI status.
- Merge history.

GitHub does not need the contributor's personal account or private payment details.

## 8.2 Data Stored by GhostCommits

The backend stores:

- Submission ID.
- Contributor public key.
- Pseudonymous identifier.
- Target repository.
- PR number.
- Verified merge status.
- Bounty amount.
- Claim status.
- Payment status.

### Sensitive data

The current MVP temporarily stores the shielded payout address for sponsor access.

A production version should protect these records through restricted access, encryption where appropriate, and explicit retention limits.

The operator may still correlate a claim with its receiving address.

---

## 8.3 Data Stored Locally

The user's browser stores:

- Private identity key.
- Public identity key.
- Local identity information.

The private key must never be transmitted to the server.

For the hackathon, browser storage is acceptable for demonstration.

For production, stronger encrypted storage and recovery mechanisms are necessary.

---

# 9. Recommended Technology Stack

| Component | Technology | Reason |
|---|---|---|
| Frontend | HTML/JS for MVP; React later | Fast development |
| Backend | Node.js | Simple GitHub integration |
| Storage | Local JSON for MVP | Minimal setup |
| GitHub integration | GitHub REST API | PR creation and merge verification |
| Identity | WebCrypto Ed25519 | Cryptographic ownership |
| Zcash wallet | Noir Wallet SDK | Testnet shielded transactions |
| Network | Zcash Testnet | Safe demonstration |
| Deployment | HTTPS-enabled web hosting | Browser cryptography and wallet compatibility |

## Why not use Ethereum smart contracts?

This project specifically benefits from Zcash shielded payments.

Adding EVM contracts would introduce complexity and could create public links between identities and payments.

## Why not build a custom wallet?

Wallet development introduces significant cryptographic and security responsibilities.

Using an existing Zcash wallet lets us focus on the product's differentiating functionality.

## Why not implement ZK reputation proofs immediately?

Selective-disclosure systems require additional circuit design, credential issuance, verification logic, and careful privacy analysis.

A credible signed credential system should come first.

## Why not use AI to automatically score contributions?

OnlyDust's experience demonstrates that reward systems based on automatically evaluated contributions can encourage gaming.

For the MVP, use real maintainer acceptance as the primary condition.

---

# 10. MVP Scope

## Must Have

- [ ] Anonymous identity generation.
- [ ] Recovery key export.
- [ ] Anonymous patch submission.
- [ ] Bot-generated GitHub PR.
- [ ] Real GitHub merge verification.
- [ ] Pseudonymous contribution dashboard.
- [ ] Cryptographically signed reward claim.
- [ ] Zcash testnet shielded payment.
- [ ] Accurate payout status.
- [ ] Demonstrable privacy boundaries.

## Nice to Have

- [ ] Git diff preview.
- [ ] Automated metadata leak detection.
- [ ] Repository discovery.
- [ ] Multiple bounties.
- [ ] GitHub review status.
- [ ] Signed credential export.
- [ ] Direct wallet connection.

## Out of Scope

- Full Git hosting.
- Arbitrary repository integration.
- Production-level anonymity guarantees.
- Trustless escrow.
- Automatic AI-based financial rewards.
- Zero-knowledge selective disclosure.
- Mainnet payments.
- Complex tokenomics.

---

# 11. Privacy and Security Threat Model

| Threat | Protection or limitation |
|---|---|
| Public GitHub identity exposure | Bot-based submission |
| Personal commit metadata | Must be removed before publishing |
| IP address exposure | Relay may observe it; Tor/Nym integration later |
| Coding-style deanonymization | Not prevented |
| Stolen private key | Secure backup and storage needed |
| Fraudulent ownership claim | Digital signature verification |
| Replay attacks | Nonce and expiry needed |
| Fake merged PR | GitHub API verification |
| Duplicate payout | Idempotent claim and payout records required |
| Public payment tracing | Shielded Zcash transactions |
| Operator knowing recipient | Not fully prevented in MVP |

### Honest privacy guarantee

GhostCommits hides personal GitHub attribution and uses shielded Zcash payments.

It does not currently guarantee anonymity against the server operator, network-level surveillance, sophisticated code analysis, or compromised local devices.

---

# 12. Hackathon Development Plan

## Phase 1: Core GitHub Integration

**Priority: Highest**

- Create a new GitHub repository.
- Configure restricted bot credentials.
- Submit an actual anonymous patch.
- Open a real PR.
- Merge the PR.
- Verify its status through GitHub's API.

**Deliverable:** Real GitHub evidence of an anonymous contribution.

## Phase 2: Cryptographic Reputation

- Generate signing keys.
- Associate public keys with submissions.
- Verify ownership signatures.
- Track merged contributions.
- Display a reputation profile.

**Deliverable:** Proof that the original anonymous contributor owns the accepted submission.

## Phase 3: Zcash Integration

- Install the official Noir Wallet testnet build.
- Fund and synchronize testnet wallets.
- Connect the sponsor's wallet.
- Approve a shielded payment.
- Send actual testnet ZEC.
- Show the recipient's received funds.

**Deliverable:** A real privacy-preserving bounty payment.

## Phase 4: UI Polish

- Improve contribution submission.
- Add a clear PR lifecycle.
- Add verified achievement cards.
- Add meaningful wallet payment states.
- Explain what is public and what remains private.

## Phase 5: Demo and Submission

- Record the walkthrough.
- Verify real GitHub and Zcash activity.
- Prepare a backup recording of successful wallet confirmation.
- Submit according to hackathon rules.

---

# 13. Three-Minute Demo

### 0:00–0:20 — Introduce the problem

"Open source is public, but developers shouldn't always have to be. GhostCommits lets developers contribute, establish reputation, and receive compensation without publicly revealing their identities."

### 0:20–0:50 — Anonymous contribution

- Generate a Ghost identity.
- Submit a patch.
- Show the GitHub bot PR.

### 0:50–1:20 — Verifiable contribution

- Merge the PR.
- Verify GitHub merge status.
- Show the contributor's updated record.

### 1:20–1:45 — Prove ownership

- Sign a claim with the private identity key.
- Show that another key cannot claim the same submission.

### 1:45–2:35 — Zcash payment

- Enter a shielded receiving address.
- Approve payment from the sponsor wallet.
- Demonstrate a real testnet transaction and recipient receipt.

### 2:35–3:00 — Product vision

"GitHub verifies the work. Cryptography verifies the contributor's ownership. Zcash makes the reward private."

Show the anonymous reputation dashboard and planned selective-disclosure credentials.

---

# 14. Success Criteria

The hackathon MVP is successful if:

1. A developer submits code without using their personal GitHub account.
2. A real GitHub PR is created and merged.
3. The application independently verifies the merge through GitHub.
4. The original developer proves ownership cryptographically.
5. An unauthorized claimant fails verification.
6. The sponsor makes a real shielded Zcash testnet payment.
7. The receiving wallet displays the payment.
8. The demonstration accurately explains the system's privacy guarantees and limitations.

---

# 15. Post-Hackathon Roadmap

## First 30 Days

- Replace bot PAT authentication with a properly scoped GitHub App.
- Support normal Git push workflows.
- Implement stronger metadata anonymization.
- Add secure key recovery and rotation.
- Export independently verifiable signed contribution credentials.
- Implement robust Zcash payment confirmation.
- Add rate limiting and abuse prevention.
- Pilot with a few consenting repository maintainers.

## Longer Term

### Selective-Disclosure Reputation

Prove ownership of accepted achievements without revealing the full associated contribution history.

### Anonymous Developer Portfolio

Build a portable reputation system independent of personal GitHub accounts.

### Private Open-Source Funding

Allow sponsors to fund accepted work while preserving payment privacy on-chain.

### Privacy-Preserving Developer Network

Enable developers to coordinate, establish credibility, and collaborate while retaining control over their identities.

---

# 16. Official Resources

### Existing projects

1. [gitGost](https://github.com/livrasand/gitGost)
2. [Gitmask](https://github.com/AnalogJ/gitmask)
3. [OnlyDust](https://www.onlydust.com/)
4. [Drips](https://docs.drips.network/)
5. [Gitcoin](https://gitcoin.co/)
6. [Radicle](https://docs.radicle.xyz/)

### Technical documentation

7. [Noir Wallet SDK](https://docs.zknoir.com/noir-sdk-integration/)
8. [GitHub Pull Request API](https://docs.github.com/en/rest/pulls/pulls)
9. [Zcash Documentation](https://zcash.readthedocs.io/)

### Product and incentive research

10. [OnlyDust — Lessons from AI-based Open-Source Rewards](https://blog.onlydust.com/we-gave-1m-to-oss-contributors-with-an-ai-agent-it-wasnt-enough/)
11. [Gitcoin — Bounty Funding Model](https://gitcoin.co/mechanisms/bounties)

---

# 17. Final Product Vision

GhostCommits aims to establish a new relationship between public work, personal identity, and financial compensation.

Today, developers frequently exchange privacy for professional recognition.

GhostCommits aims to separate those two concerns.

A developer's work can remain publicly accessible and verifiable while their personal identity remains undisclosed.

Their achievements can create lasting reputation, and their financial compensation can remain private through Zcash.

**The ultimate vision:**

**A world where developers can prove what they've built without having to reveal who they are.**