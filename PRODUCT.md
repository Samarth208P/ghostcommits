# GhostCommits

## Platform
Web application for contributors and bounty sponsors.

## Stack
The supplied PRD recommends HTML/JavaScript, Node.js, and local JSON for the MVP. Implementation uses modular JavaScript with Vite for bundling the wallet SDK and a Node HTTP backend.

## Product truth

The authoritative final-MVP promise, exclusions, and release gates are in [docs/MVP_CONTRACT.md](docs/MVP_CONTRACT.md). The original PRD is historical vision. Current implementation does not yet meet all release gates.
Contributors submit through a bot, prove key ownership, and request shielded Zcash testnet payments. GitHub is the source of merge evidence. Public profiles are pseudonymous, not unlinkable. The operator can associate claims with payout addresses. Mainnet and arbitrary repositories are excluded.

## Scope and working preferences
The user approved implementation after documentation and requested polished UI and clean code. The earlier implementation pass avoided tests and trial runs; subsequent maintenance includes automated regression checks and production builds. See docs/IMPLEMENTATION_STATUS.md for current verification. Live GitHub and wallet operations remain unverified. Deployment is not part of this local repository task.
