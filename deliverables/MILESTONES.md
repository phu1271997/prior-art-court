# Prior Art Court — Milestone submissions

Three independent milestones, each a distinct diff with its own evidence links.
Baseline commit (before this work): `dd427bf`.

---

## Milestone — Phase 2

**Title:** Precedent Engine: the court reasons from its own case law

**Type:** Major feature / new contract functionality

**Changes & Improvements:**
Before, every case was judged in isolation, so two near-identical disputes could
settle inconsistently with nothing to show it. Now Prior Art Court remembers.
When a case settles on the merits it becomes precedent for its category, and the
next similar case is judged with those earlier decisions placed in front of the
on-chain AI adjudicator. The court states on-chain whether it followed,
distinguished, or departed from precedent, and records exactly which past cases
shaped the verdict — so the lineage of any decision is auditable. A new "Case
Law" browser shows the evolving body of decisions per doctrine. Safeguards keep
it honest: a citation to a case the court never saw is dropped, and precedent is
persuasive only — it never overrides the published standard and never changes how
validators reach consensus. 8 new automated tests (154 total).

**Evidence links:**
- What changed (diff): https://github.com/phu1271997/prior-art-court/compare/dd427bf...dc32b9e
- New test suite: https://github.com/phu1271997/prior-art-court/blob/dc32b9e/tests/test_precedent.py
- Changelog entry (0.12.0): https://github.com/phu1271997/prior-art-court/blob/dc32b9e/CHANGELOG.md

---

## Milestone — Phase 3

**Title:** Mediation & Settlement: end disputes by agreement, with an AI mediator

**Type:** Major feature / new contract functionality

**Changes & Improvements:**
A contested case used to have only one exit: a full, minutes-long AI hearing that
produced a winner and a loser. Most real disputes never go that far. Now the two
parties can settle before trial — either side proposes how to split the staked
pot, the other accepts, and the case closes with both paid and no hearing needed.
To help them agree, a new on-chain AI mediator reads both works and proposes a
fair split together with its reasoning. The mediator's number is advisory: it
moves no money on its own — a settlement only happens when both parties accept.
The split is enforced by the contract to the exact amount, so nothing is minted
or lost, and a settled-by-agreement case sets no precedent. A new settlement
panel offers a split slider, the standing offer, and one-click "use the
mediator's number". 12 new automated tests (166 total).

**Evidence links:**
- What changed (diff): https://github.com/phu1271997/prior-art-court/compare/dc32b9e...f238bd2
- New test suite: https://github.com/phu1271997/prior-art-court/blob/f238bd2/tests/test_settlement.py
- Settlement UI component: https://github.com/phu1271997/prior-art-court/blob/f238bd2/frontend/src/components/Settlement.tsx

---

## Milestone — Phase 4

**Title:** Court Analytics & Verifiable Verdict Certificates

**Type:** Major feature / UX + transparency (no redeploy — live on the current contract)

**Changes & Improvements:**
Two improvements that need no new contract and work on the live deployment today.
First, a Court Analytics dashboard reads the whole public docket straight from the
chain and shows the shape of the court at a glance: cases filed, decided and
escalated, how often disputes settle by agreement versus a full verdict, total
value staked and settled, and charts of verdicts, doctrines and overlap. Nothing
is stored off-chain. Second, any settled case can be exported as a Verifiable
Verdict Certificate — a portable record that names its source (network, contract,
case id) and carries a SHA-256 fingerprint of the decision. Anyone can re-read the
case from the contract and reproduce the fingerprint; if the record was altered it
won't match — no external pinning service and no trusted third party. Both are
added to the app nav as "Analytics" and "Case law".

**Evidence links:**
- What changed (diff): https://github.com/phu1271997/prior-art-court/compare/f238bd2...9325992
- Certificate library: https://github.com/phu1271997/prior-art-court/blob/9325992/frontend/src/lib/certificate.ts
- Analytics dashboard component: https://github.com/phu1271997/prior-art-court/blob/9325992/frontend/src/components/Analytics.tsx
