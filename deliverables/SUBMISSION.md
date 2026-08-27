# GenLayer Project Explorer - Submission Draft
**Project:** Prior Art Court · **Prepared:** 2026-08-27 · **Status: READY**

All character counts below are hard-verified with `wc -m` and sit under the
Portal form caps. Every URL was fetched live before this draft was written.

---

## Logo
- Source (SVG): [`deliverables/logo.svg`](logo.svg)
- Portal upload (1024): [`deliverables/logo-1024.png`](logo-1024.png) - 268 KB
- Portal upload (512, lighter option): [`deliverables/logo-512.png`](logo-512.png) - 96 KB
- Format: PNG, well under the 2 MB cap, both between 128 and 2048 px.
- Concept: section-mark `§` on paper, framed by a double rule, seal-red top
  stripe. Matches the brand mark used across the site nav and footer.

## Project name
Prior Art Court

## Primary category
**Dispute Resolution**

Reasoning: the contract is an adjudicator - it takes two parties' claims,
weighs their evidence against a published standard, and issues a binding
verdict that moves money. Every method of the court exists to run that
adjudication. Not chosen: `AI & Agents` (too crowded a bucket; nearly every
Explorer entry has an AI component, so the label buries the listing);
`Governance` (this decides between two parties, not for a collective);
`Other` (nuclear option, and Dispute Resolution fits precisely).

## Category tags
1. **Evidence Assessment** - the court reads two, and on appeal three,
   evidence URLs on-chain (`gl.nondet.web.render`) and weighs them against
   the doctrine. Implemented directly in `adjudicate` and `appeal`
   (contracts/contract.py).
2. **Appeal Review** - the `appeal` method is a genuine second-instance
   hearing that reads a third source and answers a new question
   (`first_publisher`) the first instance never asked. Precedence can
   invert the complaint deterministically after consensus. Implemented in
   `appeal` (contracts/contract.py).

Not chosen:
- `Escrow Claims` - bonds are held in escrow but the court is not a
  two-party deliverable escrow.
- `Moderation Appeals` - closest analogue but the court is not tied to a
  moderation queue; a user can bring a case without a prior takedown.
- `License Claims` - the court reads doctrine, not license terms.
- `Jury Selection` - the app does not select validators; GenLayer does.

---

## One-liner (max 180)
An intelligent court for copying disputes: two URLs, a bond, one accusation. Validators fetch both works on-chain, apply published doctrine, and settle under AI consensus.

## Description (max 1000)
Prior Art Court settles copying disputes on-chain, without a moderator, an oracle, or a single AI service. A complainant stakes a bond and posts two URLs. The respondent may match to contest. The court then fetches both pages from the live web inside the Intelligent Contract, applies a plain-English doctrine registered on-chain for that kind of work (news articles, source code, academic papers, documentation, marketing copy; new categories take a paragraph, not code), and decides under Optimistic Democracy. Every validator fetches and reasons independently; the leader's verdict is accepted only when the rest reach the same finding, not the same wording. Close calls, self-contradictions, and unreadable evidence escalate automatically to a three-source appeal instead of settling on a coin flip. Consensus decides the verdict. Arithmetic decides the money: the pot is fixed before the hearing, so a compromised validator set can hand one party's stake to the other but never mint value.

## How to try it

**Prerequisites**
- MetaMask (or another EVM-compatible wallet).
- A wallet funded with ~3 GEN on GenLayer studionet. Fund it from the
  Studio Accounts panel by transferring GEN from a pre-funded Studio
  account. The public testnet faucet does not fund studionet.

**Step 1 · Connect** - Click "Connect wallet" (top-right). The app adds or
switches the wallet to the GenLayer Studio network for you.

**Step 2 · Read the doctrine** - Expand "The doctrine each category is
judged against" in the sidebar. Every standard the court applies is
public before you file. The Doctrine Library section below the court
lists every seeded category in full.

**Step 3 · Inspect a settled case** - Six cases already sit on the docket
(cases #0-#5). Click any one to see the verdict, the two URLs, the
overlap percentage, the adjudicator confidence, and the reasoning
returned by the validator consensus.

**Step 4 · File your own** - In "File a complaint", pick a category, paste
two URLs, describe what was taken, and stake a bond (1 GEN is fine for a
demo). Confirm the MetaMask transaction.

**Step 5 · Adjudicate** - Select the new case in the docket, click "Send
to court". Every validator fetches both URLs and reasons independently.
The overlay narrates the wait; expect ~2 minutes.

**Step 6 · Withdraw** - If you win the verdict, click "Withdraw your
balance" in the Standings panel to pull the pot back to your wallet.

Example inputs that render cleanly on studionet:
- Original: `https://en.wikipedia.org/wiki/Prior_art`
- Accused (same article, different subdomain, will settle INFRINGING at
  ~100% overlap): `https://en.m.wikipedia.org/wiki/Prior_art`
- Alternative accused (unrelated, will settle INDEPENDENT):
  `https://en.wikipedia.org/wiki/Copyright`

**If something goes wrong**
- *insufficient funds* → wallet has no GEN on studionet. Fund it from the
  Studio Accounts panel; the testnet faucet is a different network.
- *wrong network / 'from' error* → approve the network-switch prompt.
- *page render failed* → treat the URL as unreadable to the court;
  choose a page that renders to real text (Wikipedia works; JS-heavy SPAs
  often do not).

**Expected end state:** the verdict card shows a finding, an overlap %, a
confidence %, and the adjudicator's written reason. The winner's
`Withdrawable` balance in Standings has increased by the pot, and a
subsequent "Withdraw your balance" moves it to their wallet.

## Expected verification outcome (max 500)
Reviewer sees six settled cases on the docket. Two INFRINGING (100% and 95% overlap, complainant paid the pot in GEN). One INDEPENDENT contested (95% confidence, respondent paid). One INDEPENDENT uncontested (bond forfeited). Two EVIDENCE_UNAVAILABLE that escalated to appeal and refunded every stake. Each verdict card links to its transaction on the Studio explorer where the leader reasoning and the validator agreement are recorded.

---

## Contract links (studionet, chain 61999)
- **PriorArtCourt** - https://explorer-studio.genlayer.com/address/0x082FcFeFEE1B7642C42bd5E1eBaa6C029fe19869
- **PolicyRegistry** - https://explorer-studio.genlayer.com/address/0xFC3A3422c64c3B84eDb8B31a333C8531B8Ba1755
- **Reputation** - https://explorer-studio.genlayer.com/address/0xF950283384B69900a4B13aCDEc99A7adB137CA7e

**Which one to paste in the "Contract link" form field:** the
`PriorArtCourt` link. It is the entry point; the other two are visible in
its constructor / cross-contract calls and the site links to them from
the footer.

Network: studionet · Status: **Preview** (studio-hosted). Not Live.

## Website
https://prior-art-court.vercel.app

## GitHub
https://github.com/phu1271997/prior-art-court

## Community links (optional)
_Leave blank on the form for now._

---

## Pre-submission checklist

**Truthfulness**
- [x] Every feature in the description works on the live URL right now
- [x] No feature described that is not built
- [x] Status set to **Preview** (studionet), not Live (that is testnet)
- [x] Every category tag maps to a contract method (`adjudicate` /
      `appeal` in `contracts/contract.py`)

**Deploy state**
- [x] All commits pushed
- [x] Vercel prod deploy carries the latest bundle
- [x] `gen_getContractSchema` returns 16 methods for the court
- [x] Studio explorer shows resolved cases with `Result: SUCCESS`

**End-to-end test**
- [x] 6 cases seeded, 4 distinct outcomes (refund / forfeit / defender
      wins / accuser wins)
- [x] Live URL loads with no wallet connected (reads work anonymously)
- [x] The docket, doctrine library, verdicts strip, and every marketing
      section render on first load

**Character caps** (hard-verified with `wc -m`, see log below)
- [x] One-liner ≤ 180
- [x] Description ≤ 1000
- [x] Expected verification outcome ≤ 500
- [x] Website + GitHub both present
- [x] Logo PNG 128-2048 px, ≤ 2 MB

## Character-count log (`wc -m` output)

The three capped fields are extracted into `deliverables/counts.sh` - run
it at any time to re-verify before pasting into the form. Latest run:

```
one-liner    : 171 / 180
description  : 994 / 1000
expected     : 436 / 500
```
