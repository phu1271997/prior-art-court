# Changelog

All notable changes are documented here. Format is loosely based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is
milestone-based rather than semver strict because the on-chain contracts,
the frontend, and the docs move on independent cadences.

Contract addresses on studionet stay the same across a release unless a
line in the release notes explicitly says otherwise.

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
