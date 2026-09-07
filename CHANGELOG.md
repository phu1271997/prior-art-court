# Changelog

All notable changes are documented here. Format is loosely based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is
milestone-based rather than semver strict because the on-chain contracts,
the frontend, and the docs move on independent cadences.

Contract addresses on studionet stay the same across a release unless a
line in the release notes explicitly says otherwise.

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
