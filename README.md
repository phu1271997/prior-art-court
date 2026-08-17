# Prior Art Court

**A court for copying disputes, where the judge reads both works itself and cannot be lobbied.**

Someone publishes something. Someone else publishes something that looks a lot like
it. Prior Art Court settles that dispute on-chain: both parties stake, an
Intelligent Contract fetches both works from the live web *inside the contract*,
applies a published standard, and decides — with the verdict agreed by a
decentralized validator set rather than issued by a platform.

> **Why this project dies without GenLayer:** the decision is a subjective reading
> of two documents that must be fetched from the open web at the moment of
> judgement, and there is money on the outcome. Take away the LLM and there is
> nothing left to decide with; take away on-chain web access and you are trusting
> an oracle's account of the evidence; take away consensus and one server decides
> who owes whom. GenLayer is the only place all three hold at once.

- **Network:** GenLayer **studionet**, via [GenLayer Studio](https://studio.genlayer.com)
- **Live app:** <https://prior-art-court.vercel.app>
- **Source:** <https://github.com/phu1271997/prior-art-court>
- **Contracts** (studionet):

| Contract | Address |
|---|---|
| `PolicyRegistry` | `0xFC3A3422c64c3B84eDb8B31a333C8531B8Ba1755` |
| `PriorArtCourt` | `0x082FcFeFEE1B7642C42bd5E1eBaa6C029fe19869` |
| `Reputation` | `0xF950283384B69900a4B13aCDEc99A7adB137CA7e` |

---

## 1. The problem

Today, "did B copy A?" is answered by whoever owns the platform B is published on.
A moderation team, a DMCA queue, an abuse report, a journal's editorial board. That
arrangement has three properties, and all three are bad:

| Property | Consequence |
|---|---|
| The standard is unpublished | You cannot know what you are being judged against, and neither can the person judging you |
| The judge has an interest | The platform hosting the accused work also decides whether it infringes |
| There is no inspectable appeal | "Reviewed and upheld" is the entire reasoning you are entitled to |

The obvious fix — hand it to an AI service — swaps a biased judge for an
unauditable one. Now a single server decides who owes whom, and it can be bought.

### Why a normal blockchain cannot help

The question is not computable. "Substantial similarity of protected expression"
is not a diff:

- Two texts can share 90% of their words and be a perfectly legitimate quotation.
- Two texts can share no complete sentence, and one still be a rip-off of the
  other's structure, sequence and original reporting.
- Two texts can be near-identical because they describe the same API, the same
  court ruling, or the same football match — and neither copied anything.

There is no Solidity function for that. And even if there were, the evidence lives
at two URLs on the open web and has to be read *now*, at judgement time — which a
deterministic chain cannot do without an oracle, i.e. without reintroducing the
trusted party the whole design exists to remove.

---

## 2. How it works

```
   ┌── 1. FILE ────────── file_case(category, origin_url, accused_url, claim)  [payable]
   │                      Complainant stakes a bond. Two URLs, one accusation.
   │
   ├── 2. CONTEST ─────── contest_case(case_id)                               [payable]
   │                      Respondent matches the bond. Optional — silence is a choice.
   │
   ├── 3. HEAR ────────── adjudicate(case_id)                            [INTELLIGENT]
   │                      The contract fetches BOTH pages with gl.nondet.web.render,
   │                      applies the doctrine from PolicyRegistry, and reasons.
   │                      Every validator does the same, independently.
   │                      Consensus accepts only a matching VERDICT.
   │                           ├── decided        → the pot goes to the winner
   │                           └── not decidable  → ESCALATED, nothing moves
   │
   ├── 4. APPEAL ──────── appeal(case_id, corroboration_url)     [INTELLIGENT, final]
   │                      Three sources instead of two, and one new question:
   │                      which work was published FIRST. An accused work that
   │                      predates the "original" inverts the complaint outright.
   │
   └── 5. COLLECT ─────── withdraw()
                          The winner pulls their balance out of the court.
```

### The contracts

| File | Contract | Role |
|---|---|---|
| [`contracts/contract.py`](contracts/contract.py) | `PriorArtCourt` | Cases, bonds, both intelligent instances, settlement, payouts |
| [`contracts/policy_registry.py`](contracts/policy_registry.py) | `PolicyRegistry` | The doctrine each category of work is judged against |
| [`contracts/reputation.py`](contracts/reputation.py) | `Reputation` | Standing, derived by reading settled cases back out of the court |

**Doctrine is the integration surface.** Bringing a new kind of work under the
court's jurisdiction — photography, recipes, API documentation — takes no code. It
takes a paragraph of English registered in `PolicyRegistry`, stating what counts as
protected expression in that medium, what reuse is legitimate, and — most
importantly — what must *not* be treated as copying. See
[`contracts/policies.py`](contracts/policies.py) for the five seeded categories.

**The court reads doctrine cross-contract; nothing writes across contracts.** Reads
are synchronous and land in the same transaction. A cross-contract *write* is
dispatched as a message at finalization, so wiring settlement to one would leave
the court's most important operation half-applied. That is why `Reputation` pulls
instead of being pushed to: `sync_case` is permissionless, reads the court, and
writes only its own storage.

---

## 3. What makes this a court and not a schema check

### Consensus compares the decision, never the prose

```python
def agrees(leader_result) -> bool:
    if not isinstance(leader_result, gl.vm.Return):
        return False
    theirs = json.loads(_as_text(leader_result.calldata))
    mine = json.loads(hear())          # this validator fetches and reasons again

    if _verdict_of(theirs) != _verdict_of(mine):
        return False                   # ← different decision: no consensus
    return abs(_pct(theirs["overlap_pct"]) - _pct(mine["overlap_pct"])) <= OVERLAP_TOLERANCE
```

Two independent LLM runs over the same two pages will phrase their reasoning
completely differently and will never agree on an exact overlap percentage.
Comparing those literally gives a court that can never reach a verdict. Comparing
only the JSON *shape* gives a court where one validator says INFRINGING, another
says INDEPENDENT, and both pass — which is not a court at all.

So the verdict must match exactly, the overlap estimate must be in the same
neighbourhood, and everything else may differ freely. Confidence is deliberately
not compared: it is the model's report on itself, it is the noisiest field, and the
decision it drives is taken deterministically *after* consensus, from the value
that actually reached agreement.

The appeal instance compares **verdict and precedence**, because precedence is what
decides that instance — two validators who agree the works are similar but disagree
about who published first have agreed on the facts and split on the result.

> Tests: `test_a_validator_that_reached_a_DIFFERENT_VERDICT_does_not_agree`,
> `test_prose_and_confidence_may_differ_freely`,
> `test_the_appeal_validator_rejects_a_split_on_precedence`.

### Consensus decides the verdict. Arithmetic decides the money.

The adjudicator is never asked how much anyone should be paid. It answers one
categorical question. The payout is derived from bonds that were escrowed *before*
the question was asked:

```
pot     = complainant bond + counter-bond + appeal fee
winner  = complainant if verdict is INFRINGING else respondent
```

A fully compromised, unanimous validator set can therefore still only move the
stakes the parties themselves put up. An adjudicator that tries to award damages
has no channel to do it through — the field is ignored
(`test_the_model_never_chooses_an_amount`).

### The court refuses to settle on an answer it does not trust

After consensus, three deterministic checks can send a case to appeal instead of to
settlement:

| Check | Why |
|---|---|
| `verdict == EVIDENCE_UNAVAILABLE` | One of the pages could not be fetched or rendered to real text |
| `confidence < 70` | The adjudicator itself flagged the call as close |
| `verdict == INFRINGING and overlap < 40` | The model contradicted itself; half an answer is not an answer |

Escalation moves no money. The appeal then always terminates the case — and if even
three sources cannot be read, every stake goes back to whoever put it up.

---

## 4. Edge cases, and what each one does

| Situation | Behaviour |
|---|---|
| `web.render` throws (dead host, TLS, timeout) | `_fetch` returns `None` → `EVIDENCE_UNAVAILABLE` → escalate. Every validator reproduces it, so consensus still holds |
| Page renders to a cookie wall / JS shell / 404 | Under `MIN_EVIDENCE_CHARS` → treated as no evidence, not as "no similarity" |
| Model replies in a markdown fence, or with prose around the JSON | `_extract_json` strips fences and keeps the outermost object |
| Model omits a key, or types it oddly | Every field is read with `.get()` and coerced; a whole consensus round is never discarded over a missing key |
| Model returns no JSON at all | The round fails loudly; the case stays exactly as it was |
| Model invents a verdict outside the court's vocabulary | Coerced to `EVIDENCE_UNAVAILABLE` → escalate, never honoured |
| Percentages out of range or negative | Clamped to 0–100 |
| Bond of zero | Refused — an adjudication costs the whole validator set an LLM run and two fetches |
| Both URLs the same page | Refused at filing |
| Non-http(s) URL | Refused at filing |
| Category with no doctrine | Refused — a court with no law is worse than no court |
| Adjudicating twice | Refused; a case is heard once |
| Contesting twice, or contesting your own case | Refused |
| Withdrawing a case that is already contested | Refused — otherwise you could bait a counter-bond and walk |
| Appealing a *decided* case | Refused. Appeal exists because the first instance could not decide, not because a party disliked a decision it could |
| Appealing twice, or appealing as a non-party | Refused |
| Double withdrawal of a balance | Balance is zeroed before the transfer is emitted |

---

## 5. Running it

### Prerequisites

- Python 3.11+, Node 20+
- A wallet that already **holds GEN on studionet**. Fund it from the Studio
  **Accounts** panel. studionet and testnet are separate networks — the public
  testnet faucet does **not** fund studionet.

### Tests

The suite runs entirely offline against gltest's native VM, which is the point: it
pins down what happens when the web is unreachable, when the model contradicts
itself, and when two validators reach different verdicts — none of which is
reproducible against a live network.

```bash
pip install -r requirements.txt
python -m pytest tests/ -q
```

72 tests: the money paths, the first instance, the appeal instance, the doctrine
layer, and standing.

### Deploy to studionet

```bash
cp .env.example .env   # then put the deployer key in it — .env is gitignored
python scripts/deploy.py --chain studionet
```

The script deploys `PolicyRegistry`, then `PriorArtCourt` (which takes the registry
address), then `Reputation` (which takes the court address), registers the five
seeded doctrines, and writes both `contracts/deployments.json` and
`frontend/.env.local`.

After it finishes, open the transaction in Studio's Run & Debug panel and confirm
**`Result: SUCCESS`** — `Status: FINALIZED` on its own is not enough.

### Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Connect a funded studionet wallet. The app switches (or adds) the network for you
on connect, reading the chain id from the SDK rather than a constant.

### Deploy the frontend

The repo root carries a `vercel.json` that builds `frontend/` and serves
`frontend/dist`. Set the same `VITE_*` values in the host's environment as
`scripts/deploy.py` wrote into `frontend/.env.local`:

```bash
vercel link --yes --project prior-art-court
printf 'studionet' | vercel env add VITE_GENLAYER_CHAIN production
printf '0x082FcFeFEE1B7642C42bd5E1eBaa6C029fe19869' | vercel env add VITE_COURT_ADDRESS production
printf '0xFC3A3422c64c3B84eDb8B31a333C8531B8Ba1755' | vercel env add VITE_POLICY_REGISTRY_ADDRESS production
printf '0xF950283384B69900a4B13aCDEc99A7adB137CA7e' | vercel env add VITE_REPUTATION_ADDRESS production
vercel --prod --yes
```

**No private key belongs in any `VITE_` variable.** Everything so prefixed is
bundled into the shipped JavaScript and is publicly readable. The user's wallet
signs; the app holds no secret.

---

## 6. Repository layout

```
contracts/
  contract.py          PriorArtCourt — the intelligent contract
  policy_registry.py   PolicyRegistry — doctrine per category of work
  reputation.py        Reputation — standing, pulled from settled cases
  policies.py          the seeded doctrine text — plain Python, NOT a contract:
                       it is read by scripts/deploy.py and registered on-chain
tests/
  conftest.py                mocked VM, per-contract storage, cross-contract router
  test_court_lifecycle.py    bonds, contests, withdrawals, pull payments
  test_adjudication.py       the first instance, and what consensus must refuse
  test_appeal.py             precedence, inversion, finality
  test_reputation.py         standing
  test_policy_registry.py    doctrine publication and amendment
scripts/
  deploy.py            studionet deployment + doctrine seeding
  doctrine-calls.txt   the same doctrine text, for pasting into Studio by hand
frontend/
  src/lib/chain.ts     wallet, network switch, transaction polling
  src/lib/court.ts     domain-level contract calls
  src/components/      docket, case view, verdict, consensus overlay, standings
```

---

## 7. Demo script

1. Connect a funded studionet wallet.
2. File a complaint: pick `news-article`, paste two real URLs, describe what was
   taken, stake 1 GEN. Expand the doctrine panel first — the standard being applied
   is public before the case is filed.
3. From a second wallet, contest it with a matching bond.
4. Send it to the court. The overlay narrates what the network is actually doing:
   selecting validators, each fetching both works and reasoning independently, then
   comparing verdicts. This takes minutes, not seconds, and the reason it does is
   the whole product.
5. Read the verdict card: the finding, the traceable overlap, the adjudicator's
   confidence, and — given the most room on the page — its reasoning.
6. Withdraw the pot. Check the transaction on the explorer.
7. For the escalation path: file a case whose accused URL is dead, and watch the
   court decline to decide rather than guess.

---

## 8. Beyond copying disputes

The primitive is *stake, fetch the evidence, judge it against published doctrine,
settle under consensus*. Prior art is the sharpest demo because the evidence is
public, the judgement is famously subjective, and being wrong is obvious. The same
shape fits any dispute where the facts are on the web and the standard is written
in words rather than numbers: SLA breaches, grant milestones, bug bounty severity,
academic misconduct.
