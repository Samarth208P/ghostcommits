# GhostCommits

**Build in public. Stay private. Get paid.**

GhostCommits is a proposed privacy-first platform for submitting GitHub contributions through a bot, establishing pseudonymous contribution ownership, and receiving shielded Zcash bounty payments.

## Project status

Documentation only. Application implementation has not started. No integrations, wallet transfers, or privacy guarantees have been validated in this repository.

The initial target is a one-day MVP for the Free Society Hack, Zcash Privacy Track, using Zcash testnet exclusively.

## Documentation

- [Product requirements](docs/PRD.md): the supplied PRD, preserved verbatim.
- [Proposed architecture](docs/ARCHITECTURE.md): components, data boundaries, and unresolved integration decisions.
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md): future phases and acceptance checks.
- [Privacy and security](docs/SECURITY.md): intended protections, limitations, and requirements.

## Intended MVP

1. Generate a local signing identity and export a recovery key.
2. Submit a patch to one configured repository through a GitHub bot.
3. Verify the resulting PR's merge using GitHub evidence.
4. Display verified contributions under a pseudonymous identity.
5. Sign a bounty claim and have the sponsor approve a shielded testnet payment.
6. Report payment progress accurately and demonstrate recipient receipt.

The MVP excludes mainnet, arbitrary repository support, trustless escrow, and zero-knowledge selective disclosure.

## Reading the PRD

The supplied PRD includes references to a "current prototype" and "current MVP." These are statements from the source document, not evidence of working software here. All capabilities remain planned until implemented and verified. External research and wallet compatibility claims in the PRD have not been independently checked during this documentation pass.

Implementation should begin only after the user requests it.
