# Reviewer feedback — amicus refund on FILED withdrawal

**Feedback (on commit `81fb071`):**

> Please refund every admitted amicus stake when a FILED case is withdrawn, and
> add a contract regression that submits an amicus brief, withdraws the case and
> verifies all stake credits and withdrawals conserve value.

## Resolution — fixed in commit `32f5786`, redeployed in `a2b210f`

| | |
|---|---|
| Fix commit | `32f5786` — *fix(court): refund amicus on FILED withdrawal* |
| Redeploy commit | `a2b210f` — studionet redeploy with the amicus-refund fix |
| PriorArtCourt (studionet) | `0x33181B83281b49069B03E16a422BEc624766D3a0` |
| Live app | https://prior-art-court-nine.vercel.app |

### What changed (`contracts/contract.py` → `withdraw_case`)
A FILED case can already carry amicus briefs (`submit_amicus` accepts
`STATUS_FILED`). Previously, withdrawing a FILED case refunded only the
complainant's bond and **stranded every third-party amicus stake**. `withdraw_case`
now unwinds them too — exactly like a mutual settlement, since a withdrawal
reaches no verdict and no stance is vindicated:

```python
refund = int(case.bond)
case.status = STATUS_WITHDRAWN
self._credit(case.complainant, refund)
# no verdict reached → every amicus stake must unwind
self._refund_all_amicus(case_id)
```

### Regression (`tests/test_amicus.py`)
`test_withdrawing_a_filed_case_refunds_every_amicus_stake` — submits an amicus
brief on a FILED case, withdraws the case, then asserts:
- every amicus brief is marked `refunded`,
- each participant's `get_withdrawable` credit equals exactly what they deposited,
- the total withdrawable across all parties equals the total deposited (every wei
  conserved — none minted, none stranded).

The amicus suite (`tests/test_amicus.py`) passes, including this regression.
