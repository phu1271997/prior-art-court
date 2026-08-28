# ADR 0002 - Pull payments, not push

- Status: Accepted
- Date: 2026-08-25 (v0.1)
- Deciders: Peter (author)

## Context

When a case settles, someone is owed money. The natural implementation
is to send the pot directly to the winner as part of the settlement
transaction. That is the "push" pattern.

Two problems with push on GenLayer specifically:

1. A push can fail. If the recipient is a contract with a reverting
   fallback, the whole `_settle` call reverts, and the verdict never
   lands on-chain. That is a court that can be spoiled by whoever
   deployed the losing party's contract.
2. Value transfers on GenLayer are dispatched as messages at
   finalization. `_settle` needs to be visible on-chain immediately
   (the frontend polls state, users refresh). If the settlement is
   waiting for a downstream finalization to complete, the UI reads
   stale state.

## Decision

Every payout is a credit to `withdrawable[address]` in the court's own
storage. The winner calls `withdraw()` separately, at their leisure, and
that call zeros the balance before emitting the transfer.

```python
def _credit(self, account: Address, amount: int) -> None:
    if amount <= 0:
        return
    key = _addr_str(account)
    self.withdrawable[key] = bigint(
        int(self.withdrawable.get(key, bigint(0))) + amount
    )

def withdraw(self) -> None:
    account = gl.message.sender_address
    key = _addr_str(account)
    amount = int(self.withdrawable.get(key, bigint(0)))
    assert amount > 0, "court: nothing to withdraw"
    self.withdrawable[key] = bigint(0)  # zero BEFORE the transfer
    gl.get_contract_at(account).emit_transfer(value=u256(amount), on="accepted")
```

## Consequences

**Positive**
- `_settle` can never be spoiled by a hostile fallback.
- Verdict visibility is separated from money movement, so the frontend
  can render a decided case immediately.
- Re-entrancy on `withdraw` is defused by the zero-before-transfer
  order.

**Negative**
- Users have to click "Withdraw" as a second step. This is a familiar
  pattern (OpenZeppelin PullPayment) but does add friction. Addressed
  in the UI by surfacing the Withdrawable balance in the Standings
  panel with a single-click button.

## Note on `on='accepted'`

`withdraw` emits its transfer with `on='accepted'` rather than the SDK
default `'finalized'`. See `docs/SECURITY.md` "Wallet safety" for the
full reasoning; the short version is that studionet does not reliably
trigger finalization, and the withdraw balance has no upstream
dependency that could unwind after acceptance because settlement
already committed it and this call already zeroed it.
