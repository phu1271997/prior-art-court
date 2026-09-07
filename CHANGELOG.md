# Changelog

All notable changes are documented here. Format is loosely based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is
milestone-based rather than semver strict because the on-chain contracts,
the frontend, and the docs move on independent cadences.

Contract addresses on studionet stay the same across a release unless a
line in the release notes explicitly says otherwise.

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
