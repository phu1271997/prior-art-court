# ADR 0003 - `gl.vm.run_nondet` over `gl.vm.run_nondet_unsafe`

- Status: Accepted
- Date: 2026-08-25 (v0.1)
- Deciders: Peter (author)

## Context

The court's whole reason to exist is a custom validator function.
`agrees(leader_result) -> bool` decides whether validators reached the
same *finding*, ignoring how they phrased it. That means picking
between the three GenLayer APIs that accept a validator function:

- `gl.eq_principle.strict_eq(fn)` - wrapper. Validator checks exact
  equality of the returned value. Not appropriate: the court returns
  JSON containing free-form `reason`, and two honest validators will
  never write identical prose.
- `gl.eq_principle.prompt_comparative(fn, principle=...)` - wrapper.
  Validator runs an LLM to compare its own answer against the leader's,
  guided by a natural-language principle. Appropriate for open-ended
  text answers.
- `gl.vm.run_nondet(leader_fn, validator_fn)` - lower level.
  Validator is arbitrary Python. **Sandboxed**: a validator exception
  is caught and mapped through `compare_user_errors` /
  `compare_vm_errors`.
- `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)` - lower level.
  **Not sandboxed.** A validator exception is indistinguishable from
  returning `False` (both count as `Disagree`).

## Decision

Use `gl.vm.run_nondet` for both the first instance (`adjudicate`) and
the appeal instance (`appeal`). The validator function compares finding
plus a tolerance band on `overlap_pct`, and at appeal also compares
`first_publisher`; nothing else.

Do not use `run_nondet_unsafe`. If the docs disagree with this file on
any live Studio build, follow the pattern the current Studio template
ships and note the version-specific fallback in `docs/SECURITY.md`.

## Consequences

**Positive**
- A bug in the validator surfaces as a distinguishable error rather
  than as an opaque `Disagree`, so debugging a broken consensus round
  does not require reading the SDK internals.
- The validator function stays first-class Python: it can read closures,
  parse JSON, call `_verdict_of()` for coercion. `prompt_comparative`
  would push that logic into a natural-language principle, which is
  harder to reason about and impossible to unit test.

**Negative**
- Slightly more code than the `eq_principle.*` wrappers. Deliberate:
  the validator function is where consensus semantics live, and it
  should be visible in the contract rather than hidden behind a wrapper.

## Alternatives considered

- `strict_eq` on a bool. Rejected: verdict is a categorical enum, not a
  bool, and the court also needs to gate on overlap band.
- `prompt_comparative` with a principle like "same verdict, similar
  overlap". Rejected: that push a critical decision into the LLM's own
  judgment, and there is no way to write a test that pins the outcome.
  The current `agrees()` is 15 lines of Python you can single-step and
  unit-test.

## Related

- `docs/SECURITY.md` documents the vocabulary coercion (`_verdict_of`,
  `_publisher_of`) that hardens the validator against a leader that
  returns an out-of-vocabulary value.
- `contracts/contract.py` `agrees()` (first instance) and the appeal's
  own `agrees()`.
- `tests/test_adjudication.py`
  `test_a_validator_that_reached_a_DIFFERENT_VERDICT_does_not_agree` and
  `test_prose_and_confidence_may_differ_freely` pin the accept/reject
  semantics.
