# Architecture

Prior Art Court is three Intelligent Contracts on GenLayer studionet plus a
Vite + React frontend that talks to them through `genlayer-js`. Everything
below is what actually runs; there are no plan-only diagrams in this file.

## Three contracts, one court

```mermaid
flowchart LR
    subgraph Off_Chain [Off-chain]
        UI["Frontend<br/>Vite + React + genlayer-js"]
        Wallet["MetaMask<br/>studionet chain 61999"]
    end

    subgraph On_Chain [On-chain, studionet]
        Registry["PolicyRegistry<br/>doctrine per category<br/>0xFC3A...1755"]
        Court["PriorArtCourt<br/>cases, bonds, adjudicate, appeal<br/>0x082F...9869"]
        Reputation["Reputation<br/>standing pulled from settled cases<br/>0xF950...CA7e"]
    end

    UI -- read views --> Registry
    UI -- read/write --> Court
    UI -- read/sync --> Reputation
    Wallet -. signs .- UI

    Court -- read doctrine at hearing time --> Registry
    Reputation -- read settled cases on demand --> Court
```

Two properties are load-bearing:

1. **Nothing writes across contracts.** The court reads the registry
   synchronously (both land in the same transaction). The reputation
   contract *pulls* from the court through its public views; the court
   never knows reputation exists. A cross-contract write is dispatched as
   a message after finalization, which would leave settlement half-applied
   if the message ever failed. That failure mode is designed out.
2. **The doctrine layer is the whole integration surface.** Bringing a new
   kind of work under the court's jurisdiction (patents, photography,
   recipes, moderation policies) requires no code change to the court,
   just a paragraph registered on `PolicyRegistry`.

## The two intelligent instances

```mermaid
sequenceDiagram
    participant P as Party
    participant C as PriorArtCourt
    participant R as PolicyRegistry
    participant V as Validator Set

    P->>C: file_case(category, url_a, url_b, claim) [payable]
    C->>R: has_policy(category)?
    R-->>C: yes
    P->>C: contest_case(case_id) [payable]
    P->>C: adjudicate(case_id)
    C->>R: get_policy(category) + get_revision(category)
    R-->>C: doctrine text, revision N
    Note over C,V: enters gl.vm.run_nondet(hear, agrees)
    C->>V: leader fetches both URLs on-chain, reasons
    V-->>C: leader's opinion
    C->>V: every validator fetches, reasons, votes
    V-->>C: agrees only if verdict + overlap band match
    Note over C: deterministic post-consensus review
    C-->>P: settle or escalate
```

Two consensus rounds are possible: the first instance (`adjudicate`), and
the appeal instance (`appeal`), which reads a third source and answers a
question the first instance never asked, precedence.

## What the validator function accepts

```python
# contracts/contract.py, first instance
def agrees(leader_result) -> bool:
    theirs = json.loads(leader_result.calldata)
    mine   = json.loads(hear())
    if theirs["verdict"] != mine["verdict"]:
        return False
    return abs(theirs["overlap_pct"] - mine["overlap_pct"]) <= 25
```

The wording differs freely, the estimate differs within a band, but the
finding must match exactly. Two validators who disagree about whether
`B` copied `A` cannot pass consensus by writing similarly-shaped JSON.

## Post-consensus safety nets

```mermaid
flowchart TD
    consensus["consensus reached"] --> confidence{"confidence &lt; 70?"}
    confidence -- yes --> escalate
    confidence -- no --> overlap{"INFRINGING with<br/>overlap &lt; 40?"}
    overlap -- yes --> escalate
    overlap -- no --> unavail{"verdict = EVIDENCE_UNAVAILABLE?"}
    unavail -- yes --> escalate
    unavail -- no --> settle[settle: pot goes to winner]
    escalate[escalate: case moves to appeal] --> nothingMoves["no money moves"]
```

If the appeal itself still cannot read the evidence, every stake is
refunded to whoever put it up. A court that cannot see the evidence has no
business redistributing money over it.

## Frontend layout

- `frontend/src/lib/chain.ts` builds the `genlayer-js` client, adds or
  switches to studionet on wallet connect, and polls transactions with a
  timeout the UI can render around.
- `frontend/src/lib/court.ts` is the domain layer. It only knows about
  cases, doctrine, bonds, and standings. No React.
- `frontend/src/components/` holds the court dApp panels (docket, case
  view, file complaint, consensus overlay, doctrine library, standings).
- `frontend/src/sections/` holds the marketing sections (hero, problem,
  lifecycle, signals, consensus, verdicts, architecture, use-cases,
  compare, walkthrough, faq, site nav, footer).
- `App.tsx` composes the two.

## What the tests do

- **Fast lane** (`pytest`, default): 73+ offline cases against
  `gltest.direct`, a Python VM. Every scenario the live network cannot
  reproduce cheaply lives here: mocked LLM output, injected fetch
  failures, two validators contradicting each other, thin evidence,
  double-adjudicate, appeal-of-decided, and every negative input the
  contract must refuse.
- **Slow lane** (`pytest -m slow --network studionet`): live-network
  smoke tests. Prove the deployed schema is still reachable and every
  doctrine is still registered. Meant as a regression net after
  redeploys, not as a substitute for the fast suite.
