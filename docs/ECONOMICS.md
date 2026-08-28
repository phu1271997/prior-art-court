# Economics

Where the money comes from, where it goes, and why the model is never
asked how much anyone should be paid.

## The bond is the whole primitive

Filing a complaint costs a bond, staked with the filing. Contesting a
complaint costs a matching counter-bond. Appealing an escalated case
costs an appeal fee. That is the entire supply. The court never issues
its own token; every value in play was put there by a party.

```
                          bond                       counter-bond
        complainant ─────────────────┐   ┌─────────────────  respondent
                                     ▼   ▼
                              ┌──────────────┐
                              │   the pot    │  ◀── appeal_fee (appellant)
                              └──────┬───────┘
                                     │
                                verdict + arithmetic
                                     │
                          ┌──────────┴──────────┐
                          ▼                     ▼
                       winner              forfeit pool
                    (pull, later)          (admin sweeps)
```

## The pot arithmetic

```python
# contracts/contract.py, _settle
pot = int(case.bond) + int(case.counter_bond) + int(case.appeal_fee)
```

`pot` never sees an LLM number. The verdict is a categorical answer that
picks which of two addresses the pot goes to; `overlap_pct` and
`confidence` only decide whether the case escalates.

## Four settlement paths

| Path | Trigger | Where the pot goes |
|---|---|---|
| **Complainant wins, contested** | verdict = `INFRINGING` after adjudicate or appeal, respondent contested | Full pot credited to complainant |
| **Respondent wins, contested** | verdict = `INDEPENDENT` / `DERIVATIVE_FAIR` after adjudicate or appeal, respondent contested | Full pot credited to respondent |
| **Complainant wins, uncontested** | verdict = `INFRINGING` and nobody contested | Bond returned to complainant (there is no counter-party to pay) |
| **Refund all** | Appeal returns `EVIDENCE_UNAVAILABLE` | Every stake returned to whoever put it up |
| **Forfeit** | Verdict != `INFRINGING` and nobody contested | Bond moves to `forfeited_pool`; admin can sweep to the admin's own withdrawable balance |

## Precedence inversion at appeal

The appeal instance answers one question the first instance never asked:
`first_publisher`. If the exhibits show the *accused* work predates the
"original", the complaint is not weak, it is inverted, and the pot flips
to the respondent regardless of overlap similarity. This is enforced
deterministically after consensus in `_settle`:

```python
if int(case.instance) >= 2 and publisher == PUBLISHER_ACCUSED:
    complainant_wins = False
```

## Withdrawals are pull, not push

`_settle` writes to `withdrawable[key]` instead of emitting a transfer
inside the settlement. Two reasons:

1. **A push inside a settlement can fail.** A recipient contract with a
   reverting fallback would take down the whole verdict. Credit is
   fault-tolerant; transfer is not.
2. **Value transfers on GenLayer are dispatched as messages at
   finalization.** A write to this contract's own storage lands the
   moment the transaction is accepted, so the settlement becomes visible
   on-chain immediately. Withdraw is a separate transaction whose input
   is a balance already committed.

`withdraw` zeroes the balance *before* emitting the transfer. Even under
a re-entrant token, the second call would find zero.

`withdraw` also uses `on='accepted'` rather than the SDK default
`'finalized'` because studionet's hosted network does not reliably
trigger finalization, and a payout that waits for it is a payout the
winner never receives. This is safe because the balance was already
committed by an earlier settlement and this call has already zeroed it;
there is no unwind that could recreate the transfer.

## Why the model cannot mint value

The court's `_settle` function takes exactly two inputs from the model:
`verdict` (a categorical string) and, at the appeal instance,
`first_publisher` (also categorical). Both are coerced through
`_verdict_of()` and `_publisher_of()`, which only accept values inside a
finite vocabulary; anything else becomes `EVIDENCE_UNAVAILABLE` and
escalates rather than settles.

Neither `overlap_pct` nor `confidence` reaches an arithmetic step. They
gate escalation only:

```python
if verdict == VERDICT_UNAVAILABLE: escalate
if confidence < 70: escalate
if verdict == VERDICT_INFRINGING and overlap < 40: escalate
```

A fully compromised, unanimous validator set can therefore only hand one
party's own stake to the other. It cannot mint. It cannot burn. It cannot
route funds to a third address.

## Costs on studionet, informally

- Every state-changing call carries GEN gas paid by the caller's wallet.
- `adjudicate` and `appeal` are the two expensive ones: every validator
  in the set fetches both pages via `gl.nondet.web.render` and runs an
  LLM prompt. Wait times measure in minutes on studionet's hosted
  network.
- Read views (`get_case`, `get_cases`, `list_categories`) are free and
  work without a connected wallet.

## Fee sink

`forfeited_pool` accumulates the bonds of uncontested-and-rejected
complaints. The admin (deployer) can sweep it via `sweep_forfeited()`
into their own withdrawable balance. This is the intended fee sink for
maintaining the court over time; there is no protocol tax on winning
verdicts, and no cut taken from bonds refunded on appeal.

## What the reputation contract adds

`Reputation` derives standing per address from cases the court has
already settled. It never sees a bond directly; it pulls the outcome
from the court and increments in-memory counters. Standing does not
gate participation in v0.3 (anyone can file), but future releases can
add tiered fees or minimum standing to file certain categories, which
would be a scoring rule change rather than a re-issuance of value.
