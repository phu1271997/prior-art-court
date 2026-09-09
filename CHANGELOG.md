# Changelog

All notable changes are documented here. Format is loosely based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is
milestone-based rather than semver strict because the on-chain contracts,
the frontend, and the docs move on independent cadences.

Contract addresses on studionet stay the same across a release unless a
line in the release notes explicitly says otherwise.

---

## [0.15.0] Milestone — Prior-Art Registry (timestamped defensive publication) - 2026-09-09

Major feature release. **Adds the proactive half of the court.** Until now the
court was purely reactive: it only acted once a copy already existed and someone
filed. The registry lets an author place a dated, on-chain marker that a work
existed by a certain time, and the court now READS that registry at judgement
time as hard-to-forge evidence of which work came first. Contract redeployed (new
`Registration` storage).

### Why this matters
The hardest question in a copying dispute is precedence: who published first. Page
content is undated and editable; archive snapshots help but are external. A
registry record is on-chain, timestamped by the consensus clock, and can only be
claimed once per URL — so it cannot be back-dated. Feeding it into the
adjudicator (and especially the appeal, which exists to settle precedence) gives
the court a dated anchor it never had. This is GenLayer-native: the timestamp
comes from consensus, the record is immutable, and the same validator set that
reasons over the works also reads the registry inside the contract.

### Added
- **`Registration` dataclass + `registrations` / `registry_by_url` storage.**
  `register_work(category, url, content_hash, title)` records the caller, the
  category's doctrine must exist, the URL must be http(s), and each URL can be
  registered only once (first claim wins). The timestamp comes from the consensus
  clock (`datetime.now`), so no caller can forge it.
- **`_registry_snapshot`** reads any record for the two exhibits out of storage
  before the non-deterministic block, so every validator sees identical dated
  evidence.
- **Registry block in both prompts** — the first instance and the appeal now show
  the adjudicator any timestamped record for the exhibits, with explicit
  instructions to treat an earlier registration as strong (not absolute)
  precedence evidence. Each hearing records `registry_consulted` in its history.
- **`get_registrations(limit)`, `get_registration_for(url)`,
  `get_registration_count()`** public views.
- **New frontend `Registry` page** (`#registry`, bilingual EN/VI): register a
  work (with an optional in-browser SHA-256 fingerprint of its text) and browse
  the dated records. Added to the nav.
- **`court.ts` + SDK**: `registerWork`, `getRegistrations`, `getRegistrationFor`
  and the `Registration` type.
- **6 new tests** in `tests/test_registry.py`: a registration is stored and
  timestamped; a URL can only be claimed once (no back-dating); lookup by URL;
  unknown category and non-http URL refused; and the registry record actually
  reaches the adjudicator (proved by keying the LLM mock to the registry block)
  with `registry_consulted` recorded on-chain.

### Also in this release
The **Court Analytics** dashboard and **Verifiable Verdict Certificates** (below,
0.14.0) ship as the transparency layer alongside the registry: together they make
the court's record legible (analytics), portable and tamper-evident
(certificates), and anchored in time (registry).

### Notes
- Total suite: **172 tests** (was 166). Redeploy required — storage changed.

---

## [0.14.0] Court Analytics & Verifiable Verdict Certificates - 2026-09-07

Feature release, **frontend only — no contract change and no redeploy**. Adds a
live analytics dashboard read straight from the chain, and turns any settled case
into a portable, self-verifying certificate. Works against the currently deployed
contracts as-is.

### Why this matters
Two gaps this closes. First, the court's activity was only legible one case at a
time — there was no way to see the shape of the docket. Second, a decision that
lives only inside a dApp is a fragile record: the frontend can disappear and the
web pages a verdict was about can change or die. Both are addressed without
trusting any new party.

### Added
- **`#analytics` — Court Analytics dashboard** (`Analytics.tsx`, bilingual EN/VI).
  Every figure is computed live from the same public docket the court settles on,
  with nothing stored off-chain: cases filed / decided / escalated, the
  settlement rate (how many decided cases ended by agreement vs a full verdict),
  total GEN staked and value actually settled, plus three charts — verdict
  distribution, cases per doctrine, and the overlap histogram of decided
  infringement cases. Charts are inline CSS bars — no external chart library, so
  nothing is fetched at runtime.
- **`analytics.ts`** — a pure `computeStats(cases)` aggregator over the docket,
  independent of React.
- **Verifiable Verdict Certificate** (`certificate.ts` + `VerdictCertificate.tsx`).
  On any resolved case, one click downloads a JSON certificate that names its
  source (chain, court address, case id) and carries a **SHA-256 digest** over the
  canonical decision fields, computed in-browser with the Web Crypto API. The
  digest is re-derivable: `verifyCertificate` re-reads `get_case` and reproduces
  it, so anyone can confirm the record was not altered — no pinning service, no
  extra trusted party. The canonical field order is fixed and explicit so the
  digest never depends on JSON key ordering.
- **Nav** gains "Case law" and "Analytics" entries (EN/VI) linking the two new
  milestone surfaces.

### Notes
- No contract change; the 166-test suite is unchanged. The dashboard and
  certificates work against the current studionet deployment.

---

## [0.13.0] Milestone — Mediation & Settlement Track - 2026-09-07

Major feature release. **Adds the pre-trial path a real court leans on hardest:
parties can end a dispute by agreement instead of by verdict**, and a GenLayer
mediator can propose a fair split first. Contract redeployed (the `Case` layout
gained five fields).

### Why this matters
Before this release a contested case had exactly one exit: a full, LLM-heavy
hearing that took minutes and produced a winner and a loser. Most real disputes
never go that far — the parties would rather take a certain split than gamble the
whole pot on a verdict. Now they can: either side proposes how to divide the pot,
the other accepts, and the case closes with both sides paid, no hearing burned.

The GenLayer-native part is the **mediator**. `request_mediation` reads both works
and the doctrine inside the contract and proposes a fair split *with its reasoning*
— the one place the court asks the model for a number. It is deliberately
harmless: the number moves no money by itself. A settlement still executes only
when **both parties accept a proposal**, so the court keeps its central guarantee
(the LLM never sets an amount that moves without the parties' own consent) while
still putting on-chain, consensus-backed reasoning to work before trial.

### Added
- **Five new `Case` fields** — `settlement_proposer`, `settlement_share`,
  `mediation_share`, `mediation_reason`, `resolution` (`""` / `MEDIATED`).
- **`propose_settlement(case_id, complainant_share)`** — either party offers a
  split (0-100% to the complainant, the rest to the respondent). A standing offer
  only; a new proposal replaces the old one.
- **`accept_settlement(case_id)`** — the counterparty accepts and the case
  resolves: the pot is split on the agreed percentages, both parties credited,
  no verdict reached. The proposer cannot accept their own offer.
- **`reject_settlement(case_id)`** — clear the offer from the table.
- **`request_mediation(case_id)`** — [INTELLIGENT] the mediator fetches both
  works, applies the doctrine, and records a recommended split plus rationale.
  Consensus makes the recommendation trustworthy: every validator must agree on
  the directional lean and land within `MEDIATION_TOLERANCE` of the same split.
  Guarded by the same per-case anti-injection canary as the adjudicator.
- **`_settle_mediated`** splits the pot with a remainder rule (the respondent
  gets the rest), so a settlement conserves the pot to the wei and never mints or
  loses value. A mediated case sets **no precedent** — the parties bargained, the
  court did not decide — and every amicus stake is refunded, since no stance was
  vindicated by a finding.
- **Lifecycle guards** — settlement and mediation are gated to a `CONTESTED` case
  that has not yet been heard (`instance == 0`), and to the two parties only.
- **`_mediation_prompt`** — a mediator-role prompt (not a judge) that asks for a
  `lean`, a `complainant_share`, and a rationale addressed to both parties.
- **New frontend `Settlement` component** (bilingual EN/VI): a pot-split slider
  with a live preview, the standing-offer card with accept/reject for the
  counterparty, the "request AI mediation" action, and the mediator's
  recommendation card with a one-click "propose this split". A "settled by
  agreement" banner replaces the verdict card on mediated cases.
- **`court.ts` + SDK wrappers**: `proposeSettlement`, `acceptSettlement`,
  `rejectSettlement`, `requestMediation`, and the five new `Case` fields.
- **12 new tests** in `tests/test_settlement.py`: an agreed split pays exactly the
  agreed percentages and conserves the pot to the wei; a mediated case is not
  precedent; settlement is gated to a contested, un-heard case and to the parties;
  the proposer cannot accept their own offer; a share over 100 and a rejected
  proposal are refused; the mediator records a recommendation without moving
  money, leaves none when the evidence is unreadable, and the parties can settle
  on its number.

### Notes
- Total suite: **166 tests** (was 154).
- Redeploy required — the `Case` layout changed.

---

## [0.12.0] Milestone — Precedent Engine (Stare Decisis) - 2026-09-07

Major feature release. **Turns a sequence of unrelated verdicts into a body of
case law.** The court now reasons from its own prior decisions: when the first
instance hears a dispute, it reads the court's earlier settled cases in the same
category and puts them before the adjudicator as precedent. Contract redeployed
(the `Case` layout gained two fields and storage gained a `precedent_index`, so
this is a fresh deploy — old cases are not migrated).

### Why this matters
A real court decides like cases alike and distinguishes unlike ones on the
record. Before this release every case was heard in isolation, so two identical
disputes filed a month apart could settle inconsistently with nothing to show it.
Now the second one is heard *with the first one in front of the bench*, the
adjudicator states on-chain whether it **FOLLOWED**, **DISTINGUISHED**, or
**DEPARTED** from that precedent, and the citation is recorded so the lineage of
any verdict is auditable. This is only possible on GenLayer: precedent is prose,
the "is this case like that one" judgement is subjective, and it is made by the
validator set reading the record inside the contract — not by an off-chain index.

### Added
- **Two new `Case` fields** — `cited_precedents` (JSON list of prior case ids the
  adjudicator relied on) and `precedent_alignment` (`FOLLOWED` / `DISTINGUISHED`
  / `DEPARTED` / `NONE`).
- **`precedent_index: TreeMap[str, DynArray[u256]]`** — the body of law, one
  ordered list of settled case ids per category. Appended in `_settle` only when
  a case decides on the merits; a refund or an unreadable case is never indexed.
- **`_precedent_snapshot(category, exclude_case_id)`** reads the tail of the
  index (up to `MAX_PRECEDENTS = 3`) into plain dicts before the non-deterministic
  block, so every validator sees the identical body of law captured in the closure.
- **`_first_instance_prompt` gains a `PRECEDENT` block** and two output fields.
  The prompt is explicit that precedent is *persuasive, not binding* — it never
  overrides the doctrine and a single precedent never outweighs the exhibits.
- **On-chain sanitisation** — `_cited_precedents` drops any id the court did not
  actually place before the adjudicator (a hallucinated citation never becomes
  case law); `_alignment_of` coerces the alignment to the closed vocabulary;
  alignment is forced to `NONE` when there was no precedent to follow.
- **`get_precedents(category, limit)` and `get_precedent_count(category)`** public
  views. The frontend Case Law browser renders the former.
- **New frontend `CaseLaw` component** (bilingual EN/VI) at the `#case-law`
  anchor: a per-category tabbed browser of the evolving body of law, newest
  decision first, each card showing the verdict, the alignment badge, the
  reasoning, the overlap, and which prior cases it cited.
- **Precedent block on the verdict card** in `CaseView`: the alignment badge plus
  clickable links to every cited prior case.
- **8 new tests** in `tests/test_precedent.py`: a first case is heard without
  precedent and then becomes precedent; a merits verdict enters the body of law
  while an escalated case never does; a later case is heard *with* the precedent
  block actually in the prompt (proved by keying the LLM mock to the block
  itself); a hallucinated citation is dropped and a bad alignment is coerced;
  precedent is scoped to its own category; the case-law view lists newest first.
- **SDK** gains `getPrecedents` / `getPrecedentCount` and the two new
  `CaseRecord` fields.

### Consensus is unchanged and still safe
Precedent changes what the adjudicator is *shown*, never how consensus is
reached. The citation set and alignment are as noisy as the prose, so — like
`reason` and `confidence` — they are recorded but never compared in `agrees()`.
Two validators still reach consensus on the VERDICT (and overlap neighbourhood),
and a compromised set still cannot move more than the bonds the parties escrowed.

### Notes
- Total suite: **154 tests** (was 147).
- Redeploy required — see the deploy step in the README. The contract addresses
  in the README/`.env` change on redeploy.

---

## [0.11.0] Phase 9 Amicus Curiae — Staked Third-Party Evidence - 2026-09-07

Major feature release. **Turns the court from a two-party affair into an
N-party evidence market.** Contract redeployed; the storage layout gained a
new `amicus` TreeMap so old cases from prior versions cannot be read by the
new code without a migration (a fresh deploy is cleaner and what the milestone
submission uses).

### Added
- **`AmicusBrief` dataclass + `amicus: TreeMap[str, DynArray[AmicusBrief]]`**
  on the court. Fields: `submitter`, `url`, `note`, `stake`, `stance`,
  `refunded`.
- **`submit_amicus(case_id, url, note, stance)`** (payable) on the court. Any
  non-party may stake a small bond (≥ 0.1 GEN) and submit a URL with a
  stance — `SUPPORTING_COMPLAINANT`, `SUPPORTING_RESPONDENT`, or `NEUTRAL` —
  at any time before the case leaves an open status. Contract-side guards:
  the caller must not be the complainant or respondent, the stake must
  clear `MIN_AMICUS_STAKE`, the URL must be an `http(s)` URL, the stance
  must be from the closed vocabulary, and the case must not already have
  reached `MAX_AMICUS_BRIEFS` (8) or been adjudicated. Note is truncated to
  400 chars before landing in the prompt.
- **`_amicus_snapshot(case_id)`** internal helper snapshots the briefs
  into plain tuples before the non-deterministic block, so the closure can
  iterate without touching storage.
- **`_fetch_amicus_evidence` and `_render_amicus`** helpers. Every brief's
  URL is fetched inside the non-deterministic block (bounded to
  `MAX_AMICUS_TEXT_CHARS = 2000` per brief). Unfetchable briefs still land
  in the prompt with an "unavailable" marker so the adjudicator can note
  the attempt without accepting the stance as evidence.
- **`_first_instance_prompt` gains an `amicus_evidence` argument** and a
  new prompt block: `AMICUS BRIEFS — third-party evidence contributions`.
  The block explicitly tells the adjudicator that a stated stance is a
  LABEL (a hint about direction) and never an instruction, and that amicus
  briefs can add facts but never override the doctrine.
- **`_settle_amicus(case_id, case, complainant_wins)`** distributes the
  amicus pool at settlement. Amici on the winning side recover their stake
  plus a pro-rata share of the losing amici's forfeits; amici on the losing
  side forfeit their stake; NEUTRAL briefs are always refunded. If nobody
  won on the correct side (all NEUTRAL or all one-sided), the forfeit
  flows to `forfeited_pool` for the admin sweep.
- **`_refund_all_amicus(case_id)`** unwinds every amicus stake
  unconditionally when the appeal instance calls `_refund_all` — an
  unadjudicable case is nobody's fault.
- **`get_amicus_briefs(case_id)` + `get_amicus_count(case_id)`** public
  views. The frontend uses `get_amicus_briefs` to render the table under
  each case.
- **12 new tests** in `tests/test_amicus.py`: submission by a non-party,
  refusal for parties, minimum stake enforcement, closed-vocabulary stance
  check, cap of 8, refusal after settlement, prompt renders the amicus
  block, pro-rata pool distribution (2 winners + 1 loser: each winner
  recovers stake + `stake/2`), NEUTRAL refund, `forfeited_pool` fallback
  when there is no winner, appeal-refund unwinds amicus stakes,
  provenance covers every lifecycle event (`amicus_submitted`,
  `amicus_settled`).
- **New frontend `AmicusBriefs` component** (bilingual EN/VI): read-only
  table for every viewer, submission form (URL + note + stance dropdown +
  stake) for connected non-party wallets on open cases, plus a "closed"
  note once the case has been adjudicated. Wired into `CaseView` under
  the actions section.
- **`court.ts` wrappers**: `getAmicusBriefs`, `getAmicusCount`,
  `submitAmicus`, and a matching `AmicusBrief` TypeScript type.
- **Styles**: `.amicus`, `.amicus-table`, `.amicus-stance` with per-stance
  color, `.amicus-form`, `.amicus-closed`.

### Changed
- `_settle` now calls `_settle_amicus` at the end so main-pot and amicus
  pool settlements land in the same transaction — the LLM cannot mint
  value in either channel.
- `_refund_all` now calls `_refund_all_amicus` so an unadjudicable case
  refunds amici alongside the primary parties.

### Notes
- The amicus pool is a separate settlement channel from the main pot; a
  compromised validator set can still only move the money escrowed in the
  case, and it cannot cross the pot / amicus-pool boundary.
- Every brief costs every validator one extra page fetch. The
  `MAX_AMICUS_BRIEFS = 8` cap is what keeps a case bounded; the
  `MAX_AMICUS_TEXT_CHARS = 2000` bound is what keeps the prompt bounded.
- Total suite: **147 tests** (was 135).

---

## [0.10.0] Phase 8 Ecosystem + CI + SDK + Seed Script - 2026-09-07

Ecosystem release. **Doctrine seed** gains three new categories (nine total).
**CI** goes live on GitHub Actions. A publishable **npm SDK** ships under
`sdk/` and a **demo-case seeder** script under `scripts/seed_demo_cases.py`.
No contract code changes — the four Phase 7 contracts stay put; the
PolicyRegistry gains three new doctrine entries that any admin can register
against an existing deploy.

### Added
- **Three ecosystem doctrines** in `contracts/policies.py`:
  - **`sla-clause`** — disputes over whether a written SLA clause was tripped.
    Directs the adjudicator to apply the SLA's own definitions rather than a
    generic one, and to favour the customer's ordinary reading when the term
    is ambiguous (the vendor had the drafting pen).
  - **`academic-misconduct`** — plagiarism / duplicate submission / undisclosed
    authorship. Carves out self-plagiarism between preprint and final version;
    treats duplicate publication across two venues without cross-reference as
    INFRINGING.
  - **`bug-bounty-severity`** — disputes over the vendor-assigned severity of a
    reported vulnerability. Verdict INFRINGING means the assigned severity is
    UNDERstated relative to the vendor's rubric; INDEPENDENT means it is
    correct or overstated. Directs the adjudicator to judge a vulnerability
    chain on the demonstrated impact, not the parts.
- **GitHub Actions CI** at `.github/workflows/tests.yml`. Two jobs on every
  push and PR: `fast-lane` (Python 3.13, mocked VM, 135 tests) and
  `frontend-typecheck` (Node 20, `npm run build` — full `tsc -b` + Vite bundle).
- **`sdk/` npm package** — a thin, framework-agnostic TypeScript SDK any
  third-party site can install with `npm install @prior-art-court/sdk
  genlayer-js`. Exports one class, `PriorArtCourt`, with a domain surface —
  `listCases`, `getCase`, `getHistory`, `listPolicies`, `getStanding`,
  `getLeaderboard`, `getBadges`, `getWithdrawable`, `fileCase`, `contestCase`,
  `adjudicate`, `appeal`, `withdraw`. Package version `0.10.0`. Design rules:
  no secret in the bundle, no default addresses (construct or nothing), and
  a domain surface rather than a contract surface. Ships with a README that
  documents every method and the Optimistic-Democracy reasoning.
- **`scripts/seed_demo_cases.py`** — post-deploy demo seeder. Files six sample
  cases across `news-article`, `source-code`, `academic-paper`,
  `documentation`, `marketing-copy`, and `sla-clause`, drives four of them to
  full adjudication. Runs against studionet or localnet, safe to re-run
  (never touches existing cases), and cites public real URLs so exhibits are
  actually fetchable at hearing time.
- **`scripts/deploy.py`** updated in Phase 7 already registers every seeded
  doctrine, so a fresh deploy now writes nine doctrines to the registry.
- **8 new tests** in `tests/test_ecosystem_verticals.py` covering doctrine
  count (nine), 120-char guard for the three new categories, sla-clause's
  favour-customer clause, academic-misconduct's self-plagiarism carve-out,
  bug-bounty's chained-vulnerability rule, and canonical kebab-case slug
  discipline for every seeded category. Total suite: **135 tests**.

### Changed
- No contract code changed in this phase — Phase 7 addresses stay valid; a
  fresh deploy against the same code writes the nine doctrines instead of
  six.

### Notes
- The Vercel-deployed frontend does not need a rebuild for the new
  doctrines to appear — it reads categories from the registry at load time.
  Registering the three new doctrines on-chain (either at fresh deploy or via
  the Admin panel from Phase 7) is enough for them to show up in the
  Doctrine Library, the file-complaint category picker, and the case
  verdict rendering.

---

## [0.9.0] Phase 7 Achievements + Reputation Gate + Admin - 2026-09-07

Major release. **A new fourth contract** (`Achievements`) joins the deploy
alongside the existing three; the court gains a reputation-tiered filing gate
and admin knobs; the frontend adds a Badges gallery and an on-page admin
panel. All four contracts are redeployed and their addresses in
`contracts/deployments.json` are new.

### Added
- **`Achievements` contract** (`contracts/achievements.py`, 274 lines). A
  standalone read-only-of-others contract that folds settled cases into an
  on-chain, per-address list of permanent, non-transferable badges. Eight
  badge kinds ship in the closed catalog: `FIRST_FILING`, `FIRST_CONTEST`,
  `FIRST_WIN`, `FIVE_WINS`, `TEN_WINS`, `JUST_DEFENDER` (a respondent who
  defeated an unfounded complaint), `APPELLATE_WINNER`, `PRECEDENT_INVERTER`
  (won because the appeal established their work came first). Permissionless
  `mint_from_case(case_id)` and `mint_recent(limit)` — the contract's own
  dedup makes duplicate calls no-ops, so any account can trigger surfacing
  without gaming it. Storage: `badges: TreeMap[str, DynArray[Badge]]`,
  `minted_from: TreeMap[str, bool]`, `holders: TreeMap[str, bool]` (unique
  (address, kind) index), `roster: DynArray[str]` (first-mint-order public
  list). Non-transferability is enforced by omission — no `transfer` method.
- **Reputation-tiered filing gate** on `PriorArtCourt`. New storage:
  `reputation: Address`, `filing_standing_floor: u256` (default 100 =
  BASE_STANDING, so unknown accounts are never surcharged). New helper
  `_required_min_bond(account)` calls the reputation contract (when wired)
  and returns `MIN_BOND_LOW_STANDING` (1 GEN) for filers below the floor,
  else 1 (any positive bond passes). New view `get_min_bond_for(account)`
  for frontend pre-flight quotes.
- **Admin knobs on court**: `set_reputation(address)` (turns the gate on
  when pointed at a Reputation contract), `set_filing_standing_floor(int)`,
  `get_reputation()`, `get_filing_standing_floor()`.
- **Admin knobs on Achievements**: `set_court`, `set_reputation`,
  `get_court`, `get_reputation`, `get_badge_catalog` (publishes the closed
  vocabulary so a frontend need not hard-code it).
- **13 new tests** in `tests/test_achievements.py` covering catalog
  vocabulary, first-filing + first-win + first-contest badges from a single
  case, second-win idempotency, `JUST_DEFENDER` on a defensive win, mint
  idempotency, unresolved-case rejection, roster first-mint-order,
  admin-only guards, and every branch of the reputation gate (off when
  reputation is zero, no-op for new accounts, low-standing surcharge, admin
  wiring guarded, floor range guarded). Total suite: **127 tests**.
- **Frontend `BadgesGallery`** component: shows the viewer's badges and a
  20-address recent-holders roster, with a "Sync recent cases" button that
  calls `mint_recent(25)` — permissionless, so any wallet can trigger it.
- **Frontend `AdminPanel`** component: rendered only when the connected
  account matches the deployer address on `PolicyRegistry`. Three cards:
  register/amend a doctrine (with the 120-char guard mirrored client-side),
  sweep the forfeited pool, adjust the filing standing floor. All actions
  are still gated by the on-chain admin check — the UI is UX, not a lock.
- **New frontend court lib functions**: `getBadges`, `getBadgeHolders`,
  `getBadgeCatalog`, `mintBadgesFromCase`, `mintBadgesRecent`,
  `getMinBondFor`, `getFilingStandingFloor`, `registerPolicy`,
  `sweepForfeited`, `setReputationOnCourt`, `setFilingStandingFloor`.
- **Deploy script** now deploys the four contracts in order and calls
  `court.set_reputation(reputation)` so gating is active by default; env
  writes `VITE_ACHIEVEMENTS_ADDRESS` too.
- **Styles**: Phase 7 CSS for `.badges-gallery`, per-kind badge glyphs
  (colour per badge kind), `.admin-panel` and its dashed-outline "this is
  live" affordance.

### Changed
- `file_case` now performs a single extra `assert` against the caller's
  standing quote; every existing test passes untouched because the guard is
  off until an admin points the court at reputation.

### Notes
- The `Achievements` contract reads BOTH court and reputation. It is safe
  to deploy against a court that never had reputation wired; badges depend
  only on the case fields (`get_case`), not on reputation, and the
  `FIVE_WINS` / `TEN_WINS` count is best-effort (returns 0 on read
  failure). Wiring reputation just improves the accuracy of those two
  count-based badges.

---

## [0.8.0] Phase 6 Patent Domain + Multi-Source - 2026-09-07

Contract + doctrine release. **All three contracts are redeployed** and a new
doctrine is registered on-chain. New addresses in `contracts/deployments.json`.

### Added
- **`patent-claim` doctrine** in `contracts/policies.py`. First domain where
  the court's three verdicts (INFRINGING / DERIVATIVE_FAIR / INDEPENDENT) map
  onto the two-question prior-art analysis from U.S. patent law: §102
  anticipation (does the reference disclose every element of the claim,
  arranged as claimed?) and §103 obviousness (would a person of ordinary
  skill find the combination obvious over the reference, weighing the Graham
  factors?). The doctrine faithfully applies the substance without claiming
  jurisdiction — this is a doctrine layer, not a court of any nation.
- **`_domain_note` prompt injector.** New helper adds a domain-specific
  framing block to both intelligent prompts based on the case category. For
  patent-claim it walks the adjudicator through the two-step analysis
  explicitly and requires each claim element to be marked PRESENT/MISSING in
  the `reason` field. For source-code and academic-paper it reinforces the
  doctrine-specific weighting the LLM tends to under-apply. Other categories
  get a no-op note.
- **Auto-corroboration via archived snapshots.** Every first-instance
  hearing now fetches up to four supplementary sources — Wayback and
  archive.today for BOTH exhibit URLs — inside the non-deterministic block,
  bounded to `MAX_SNAPSHOT_CHARS` (3000) each. Each snapshot renders as its
  own fenced `<<<SNAP … SNAP>>>` block with a stable label
  (`origin-wayback`, `origin-archiveph`, `accused-wayback`,
  `accused-archiveph`). Unfetchable or thin snapshots are dropped silently;
  the prompt says "no archived snapshots were reachable" and the hearing
  proceeds on the two primary exhibits alone.
- **New helpers**: `_snapshot_urls(url)`, `_fetch_snapshots(origin, accused)`,
  `_render_snapshots(list)`, `_domain_note(category)`.
- **8 new tests** in `tests/test_patent_and_snapshots.py`: doctrine
  registration and shape, patent-claim filing, snapshot rendering in prompt,
  fallback when no snapshots reach, thin-snapshot silent drop, patent
  framing appears in patent prompt, and does NOT appear in non-patent
  prompts. Total suite: **114 tests**.
- **UseCases section (frontend)** now leads with the Patent-claim prior-art
  use case in both languages.
- **FAQ copy** updated: six categories, and specifically calls out the
  Phase 6 §102/§103 framework and auto-fetched archives.

### Changed
- `_first_instance_prompt` signature adds an optional `snapshots` argument
  (default `None`) and threads them into the prompt after Exhibit B, before
  the multi-perspective block. Older callers pass `None` and get the "no
  snapshots reachable" message.
- `_appeal_prompt` also receives the domain note so a patent appeal is not
  handed a copying-dispute framing.

### Notes
- Snapshot fetches add ~4 network round-trips per validator per first-
  instance hearing. Cost is real; on studionet with strict mocks it is
  free. The value is: a patent-claim hearing sees dated public evidence for
  BOTH exhibits without any party having to hunt down an archive URL — this
  is what makes the primitive competitive with legal-tech search tools.

---

## [0.7.0] Phase 5 AI Consensus Overhaul - 2026-09-07

Contract release. **All three contracts are redeployed** — the intelligent
methods changed shape, so the studionet addresses in `contracts/deployments.json`
are new.

### Added
- **Anti-prompt-injection canary.** Every hearing derives a per-case token
  deterministically from public case metadata (case id, instance, both URLs)
  using FNV-1a 64-bit. The prompt hands the model that token and requires it
  echoed verbatim; the validator rejects any response that lost, altered, or
  exhibit-swapped it. A model that followed an instruction planted inside an
  exhibit will not have the right token to echo, and the case escalates
  (first instance) or refunds every stake (appeal) instead of settling on the
  compromised opinion. See `_discipline_token`, `_discipline_ok`,
  `_first_instance_prompt`, `_appeal_prompt` in `contracts/contract.py`.
- **Multi-perspective structured prompt.** Both intelligent methods now direct
  the adjudicator to weigh the dispute from three viewpoints — FORENSIC
  (expression-level overlap), READER (audience perception), SKEPTIC (the null
  hypothesis: shared source, convention, coincidence) — and to converge on the
  verdict that survives all three. Each perspective is captured as one sentence
  in the response's `analyses` field, coerced by `_analyses_summary`, and
  logged into the case provenance so parties can inspect the reasoning that
  reached consensus.
- **`discipline_kept` and `analyses` on every instance record.** History entries
  for `first_instance` and `appeal` now carry the canary result plus the three
  perspective summaries. The frontend surfaces both in the Verdict panel with a
  new "Multi-perspective analysis" section and a green/red discipline strip.
- **Post-consensus review adds `discipline_lost` escalation.** The deterministic
  safety net that already handled `evidence_unavailable`, `low_confidence`, and
  `inconsistent_finding` now also refuses to settle on any response whose canary
  did not match, even if the validator set accepted it — belt-and-braces.
- **15 new discipline tests** in `tests/test_discipline.py`: canary determinism
  across leader and validators, per-case and per-instance uniqueness, provenance
  recording of both discipline and analyses, no-canary and forged-canary attack
  paths refusing consensus at both instances, appeal refund on discipline loss.
  Total suite: **106 tests** (was 91).
- **Test infrastructure**: `conftest.py` monkey-patches `_match_llm_mock` and
  `run_validator` with a discipline-token shim so the pre-Phase-5 fixtures keep
  passing — the shim rewrites well-formed tokens in stored responses to match
  what the actual prompt asks for, so tests do not need to compute per-case
  tokens themselves. Failure-path tests opt out via `opinion(omit_discipline=True)`
  which plants a `_no_discipline_shim` sentinel the shim respects.

### Changed
- Appeal terminates with `_refund_all` on **either** unfetchable evidence OR
  discipline loss — the appeal is the last instance, so an unsafe verdict is
  never allowed to move money.
- First-instance validator (`agrees`) short-circuits when both sides return
  the internal `EVIDENCE_UNAVAILABLE` sentinel; the canary does not apply when
  there was no LLM output to have followed instructions from.
- New CSS: `.analyses`, `.discipline-ok`, `.discipline-lost` styles in
  `frontend/src/styles.css` for the Verdict panel additions.

### Fixed
- First-instance prompt-parsing errors are still surfaced as JSON parse
  failures; discipline failure is now a distinct escalation ground so a case
  reader can tell "the model refused" from "the model got captured."

---

## [0.6.0] Phase 4 UX polish - 2026-08-29

Frontend-only release. Contracts unchanged.

### Added
- Animated hero counters: stats count up with eased cubic animation
  when data loads from the chain.
- Keyboard navigation on the docket: arrow keys (j/k) cycle through
  cases, Escape resets selection.
- Copy case link button in CaseView header: writes the deep link
  (`#case/N`) to clipboard with a "Copied!" confirmation.
- Floating scroll-to-top button: appears after scrolling past 600px,
  smooth-scrolls back to top.
- `useCountUp` hook for reusable number animation.
- `ScrollToTop` component, bilingual.

---

## [0.5.0] Phase 3 dark mode, filters, deep links - 2026-08-29

Frontend-only release. Contracts unchanged.

### Added
- Dark mode with manual toggle (cycles system/dark/light). ThemeProvider
  detects OS preference, allows manual override, persists to localStorage.
  CSS uses both `prefers-color-scheme` and `data-theme` attribute.
- Docket status filters: pill-style filter bar (All/Filed/Contested/
  Escalated/Resolved) with live case count. Fully bilingual.
- Case deep links: URL hash `#case/N` auto-selects a case and scrolls
  to the court section. Supports browser back/forward via hashchange.
- Theme toggle button (sun/moon) in the sticky navigation bar.

---

## [0.4.0] Phase 2 bilingual UI - 2026-08-29

Frontend-only release. Contracts unchanged.

### Added
- `frontend/src/lib/i18n.tsx`: LangProvider context with browser-language
  detection, localStorage persistence, and `<html lang>` sync.
- `usePick()` hook for colocated content selection across all components.
- Language toggle (EN/VI) in the sticky navigation bar with pill-style CSS.
- Full Vietnamese translations for all 13 marketing sections (Hero,
  Problem, Lifecycle, Signals, Consensus, Verdicts, Architecture,
  DoctrineLibrary, UseCases, Compare, Walkthrough, FAQ, Footer).
- Full Vietnamese translations for all 6 court app components
  (FileComplaint, CaseView, Standings, ConsensusOverlay, DoctrineLibrary,
  Docket) and the court section shell in App.tsx.

### Changed
- Every section and component now uses a colocated `CONTENT = { en, vi }`
  object instead of inline English strings.
- Contract vocabulary (INFRINGING, DERIVATIVE_FAIR, studionet, GEN) is
  never translated, keeping on-chain values grep-able.

---

## [0.3.0] Phase 1 hardening bundle - 2026-08-27

Non-contract release. The three deployed contracts are unchanged; case
history and doctrine on studionet are preserved.

### Added
- `docs/ARCHITECTURE.md` with a Mermaid diagram of the three-contract
  layout and the two intelligent instances of the court.
- `docs/SECURITY.md` documenting the threat model, the prompt-injection
  surface, the escalation triggers, and the audit checklist a reviewer
  can run against the deployed contract.
- `docs/ECONOMICS.md` describing the bond flow, the pot arithmetic, the
  forfeit path, and why the AI is never asked how much anyone should be
  paid.
- `docs/CONTRIBUTING.md` for how to run the fast suite, the slow suite,
  the frontend locally, and how to draft a new doctrine.
- `docs/adr/0001-three-contracts-not-one.md`,
  `0002-pull-payments-not-push.md`,
  `0003-run-nondet-over-run-nondet-unsafe.md` explaining three
  load-bearing design decisions.
- `tests/test_input_validation.py`: 14 negative and boundary tests
  covering URL scheme rejection, thin claim text, self-address, category
  case-folding, bond bounds, and repeat lifecycle actions. Fast lane.
- Frontend `ErrorBoundary` component around the whole app so a runtime
  error surfaces a readable panel instead of a blank white screen.
- Client-side URL validation in `FileComplaint` that mirrors the
  contract's `_is_http_url` and rejects private-network and non-http
  schemes at the form level instead of at the RPC level.
- Double-submit guard on every write button (busy state gates the second
  press even if the user rapidly re-clicks after the modal opens).
- Keyboard navigation on the docket rows (`Enter` and `Space` select the
  same case as a click) and `aria-current` on the active nav link.

### Changed
- `README.md` now links to `docs/` and to `deliverables/SUBMISSION.md`.
- Test suite header comment names the fast lane the default and points
  slow-lane runners at `pytest -m slow --network studionet`.

### Fixed
- Nothing broken between 0.2 and 0.3. This release is additive.

---

## [0.2.0] Marketing story rewrite - 2026-08-27

Frontend-only release. Contracts unchanged.

### Added
- Sticky top navigation with anchor-scroll to every section
  (`SiteNav.tsx`).
- Hero section with live on-chain statistics
  (case count, verdict breakdown, categories under jurisdiction).
- Standalone marketing sections: Problem, Lifecycle, Signals,
  Consensus, Verdicts (live from the docket), Architecture, Use Cases,
  Compare (vs platform moderation vs single-vendor AI), Walkthrough,
  FAQ.
- Rich four-column footer with product / on-chain / source / learn
  columns.
- `deliverables/SUBMISSION.md` and logo for the Portal Explorer form.
- `pytest.ini` with `fast` (default) and `slow` markers.
- `tests/test_live_studionet.py` smoke suite for the slow lane.

### Changed
- Whole page composition. Old `Introduction.tsx` retired in favor of
  standalone section components under `frontend/src/sections/`.
- Stylesheet rewritten around a section-based layout with paper
  backgrounds alternating between `--paper` and `--paper-warm`.

---

## [0.1.0] First public deployment - 2026-08-25

Initial studionet deployment.

### Added
- `PolicyRegistry`, `PriorArtCourt`, `Reputation` deployed to
  studionet at:
  - `0xFC3A3422c64c3B84eDb8B31a333C8531B8Ba1755`
  - `0x082FcFeFEE1B7642C42bd5E1eBaa6C029fe19869`
  - `0xF950283384B69900a4B13aCDEc99A7adB137CA7e`
- Five seeded doctrines: news-article, source-code,
  documentation, academic-paper, marketing-copy.
- 72 offline tests against `gltest.direct`.
- Vite + React frontend using `genlayer-js`, deployed to Vercel.
