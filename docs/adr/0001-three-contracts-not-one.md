# ADR 0001 - Three contracts, not one

- Status: Accepted
- Date: 2026-08-25 (v0.1)
- Deciders: Peter (author)

## Context

A single contract would work. The court could hold its own doctrine
inside a `TreeMap[str, str]` and derive its own standing table on
demand. A single contract is easier to deploy, easier to reason about,
and has one address for the frontend to keep in sync.

The tradeoff is where the coupling lives. If doctrine is part of the
court, adding a new medium requires either an admin write to the same
contract that holds every open case, or a redeploy that invalidates
everything.

## Decision

Split into three contracts:

- **PolicyRegistry** holds doctrine text per category, revision-tagged.
  Doctrine is the integration surface a new medium enters through, and
  keeping it separate means bringing patents or moderation policies under
  the court's jurisdiction never touches active cases.
- **PriorArtCourt** holds the case lifecycle and both intelligent
  instances. It reads doctrine from the registry at hearing time
  (synchronous, same transaction).
- **Reputation** derives standing from settled cases *by pulling* the
  court's public views. It never writes to the court, so a reputation
  bug can never corrupt case state.

## Consequences

**Positive**
- New doctrine can be registered without touching the court.
- A bug in reputation is isolated; the court cannot be corrupted by it.
- Each contract's public surface tells you what it does. `PriorArtCourt`
  has `file_case`, `contest_case`, `adjudicate`, `appeal`, `withdraw`.
  It does not have `register_policy` or `sync_case`.

**Negative**
- Three addresses to keep in sync (`contracts/deployments.json` +
  `frontend/.env.local` + Vercel env vars).
- One extra RPC read on every hearing (doctrine fetch from registry).
  Both land in the same transaction, so this does not add wall-clock
  latency for the user.
- Anyone reading the frontend has to grok three contracts. Addressed by
  the Architecture section on the marketing site and the diagram in
  `docs/ARCHITECTURE.md`.

## Alternatives considered

- **One contract, one address.** Simpler to deploy, but tying doctrine
  updates to the court's storage would mean every doctrine change is a
  live migration.
- **Two contracts (court + registry).** A middle option. Reputation
  works fine as an off-chain indexer. Rejected because standing is
  something the frontend should be able to read authoritatively without
  running its own service, and because the pull pattern in Reputation
  is a useful demonstration of the "no cross-contract writes" rule.
