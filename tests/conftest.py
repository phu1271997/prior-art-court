"""
Shared fixtures for the Prior Art Court test suite.

The suite runs against `gltest.direct` — gltest's native Python VM. That choice is
deliberate: the whole point of testing this contract is to prove what happens when
the web is unreachable, when the adjudicator returns garbage, and when two
validators reason their way to different verdicts. None of those are reproducible
against a live network, and all of them are exactly reproducible here, because the
VM lets the test decide what the web and the model say.

Two pieces of scaffolding live here.

`install_cross_contract_router` teaches the VM how to route a `CallContract`
request to another deployed instance. Direct mode has no chain, so a court that
reads its doctrine from the PolicyRegistry would otherwise get nothing back. The
router is a test double for the chain's dispatcher, nothing more — it calls the
real method on the real registry instance and encodes the real return value.

`transfers` records every `PostMessage` the court emits, which is how the payout
tests assert that value actually left the contract rather than merely being
credited in storage.
"""

from __future__ import annotations

import json
import re
import sys
from contextlib import contextmanager
from pathlib import Path

import pytest
from gltest.direct import VMContext, create_address, deploy_contract
from gltest.direct.loader import load_contract_class
import gltest.direct.vm as _gltest_vm


# ------------------------------------------------------ discipline-token shim (v0.7)
#
# Phase 5 added a per-case canary token: the prompt hands the model a value it
# must echo back, and the validator rejects any response missing or altering it.
# The token is derived from the case metadata, so the test's `opinion()` helper
# cannot know it up front (case_id + urls determine it, and different tests use
# different case_ids). Rather than teaching every legacy test to pass case_id
# through, we shim gltest's LLM-mock resolver: when the ACTUAL prompt asks for a
# specific token and the stored response happens to carry a discipline_token
# field, rewrite that field's value to the one the prompt is asking for. Legacy
# tests keep working; tests that want to exercise the discipline-failure path
# opt out with `opinion(omit_discipline=True)`.

_TOKEN_IN_PROMPT_RE = re.compile(r'"discipline_token":\s*"(PAC-[0-9A-Fa-f]{12})"')
# Deliberately strict: matches only well-formed PAC tokens so that a test
# planting a hand-crafted attacker value like "PAC-ATTACKERGUESS" survives the
# rewrite and reaches the contract intact, letting the failure path be exercised.
_TOKEN_IN_RESPONSE_RE = re.compile(r'"discipline_token"\s*:\s*"PAC-[0-9A-Fa-f]{12}"')

_original_match_llm = _gltest_vm.VMContext._match_llm_mock


def _match_llm_mock_with_discipline(self, prompt: str):
    response = _original_match_llm(self, prompt)
    if not isinstance(response, str):
        return response
    match = _TOKEN_IN_PROMPT_RE.search(prompt)
    if not match:
        return response
    real_token = match.group(1)
    if _TOKEN_IN_RESPONSE_RE.search(response):
        return _TOKEN_IN_RESPONSE_RE.sub(
            f'"discipline_token": "{real_token}"', response, count=1
        )
    # Legacy fixtures build JSON responses without the field. Inject the correct
    # token so the pre-Phase-5 tests keep passing under the new discipline check.
    # Non-JSON responses (raw prose like "I am not comfortable...") are left
    # untouched — those tests exercise the parse-failure path on purpose.
    try:
        payload = json.loads(response)
    except Exception:
        return response
    if isinstance(payload, dict) and "discipline_token" not in payload:
        # A test can opt OUT of the auto-inject by planting `_no_discipline_shim`
        # in the response — that is how the discipline-failure tests keep their
        # response canary-free even under the legacy-compat shim.
        if payload.get("_no_discipline_shim"):
            return response
        payload["discipline_token"] = real_token
        return json.dumps(payload)
    return response


_gltest_vm.VMContext._match_llm_mock = _match_llm_mock_with_discipline


_sentinel = object()
_original_run_validator = _gltest_vm.VMContext.run_validator


def _run_validator_with_discipline(self, *, leader_result=_sentinel, leader_error=None, index=-1):
    """
    When a test overrides `leader_result`, rewrite its discipline_token to
    whatever the CAPTURED leader actually produced. Legacy tests build the
    override with `opinion()` which computes its token from case_id=0/instance=1;
    the captured validator may belong to an appeal (instance=2) or a later case,
    and its expected token is different. The stored_result inside the captured
    tuple went through the mock shim above and already carries the right token,
    so we just carry that value across.
    """
    if leader_error is None and leader_result is not _sentinel:
        try:
            stored = self._captured_validators[index][0]
        except (IndexError, AttributeError):
            stored = None
        if isinstance(leader_result, str) and isinstance(stored, str):
            stored_match = _TOKEN_IN_RESPONSE_RE.search(stored)
            override_match = _TOKEN_IN_RESPONSE_RE.search(leader_result)
            if stored_match and override_match:
                stored_token = re.search(
                    r'"discipline_token"\s*:\s*"([^"]*)"', stored
                ).group(1)
                leader_result = _TOKEN_IN_RESPONSE_RE.sub(
                    f'"discipline_token": "{stored_token}"',
                    leader_result,
                    count=1,
                )
    kwargs = {"leader_error": leader_error, "index": index}
    if leader_result is not _sentinel:
        kwargs["leader_result"] = leader_result
    return _original_run_validator(self, **kwargs)


_gltest_vm.VMContext.run_validator = _run_validator_with_discipline


@contextmanager
def rejects(message: str):
    """
    Assert that a contract call refuses, and refuses for the stated reason.

    The contracts guard with `assert`, which GenVM surfaces as a user error and
    which reaches the test as an AssertionError. gltest's own `expect_revert`
    deliberately re-raises AssertionError (it uses that type for its own
    bookkeeping), so guard assertions are matched here instead.
    """
    with pytest.raises(AssertionError, match=re.escape(message)):
        yield

ROOT = Path(__file__).resolve().parent.parent
CONTRACTS = ROOT / "contracts"

# Any address will do — the router maps it to an instance by value, and the court
# only ever uses its registry address as an opaque handle. These are built lazily
# because `create_address` needs the genlayer SDK, which the VM loads on activate.
REGISTRY_SEED = "policy-registry"
COURT_SEED = "prior-art-court"

GEN = 10**18


def _addr_bytes(value) -> bytes:
    """Normalize whatever an Address decodes to into raw bytes for keying."""
    for attribute in ("as_bytes", "_as_bytes"):
        raw = getattr(value, attribute, None)
        if isinstance(raw, (bytes, bytearray)):
            return bytes(raw)
    if isinstance(value, (bytes, bytearray)):
        return bytes(value)
    return bytes(str(value), "utf-8")


def install_cross_contract_router(vm: VMContext) -> None:
    """Route CallContract to registered instances; record PostMessage transfers."""
    vm._contracts_by_address = {}
    vm._transfers = []

    def hook(_vm, request):
        from genlayer.py import calldata
        from genlayer.py.public_abi import ResultCode

        if "CallContract" in request:
            call = request["CallContract"]
            target = vm._contracts_by_address.get(_addr_bytes(call["address"]))
            if target is None:
                return None
            payload = call.get("calldata") or {}
            method = getattr(target, payload["method"])
            result = method(*payload.get("args", []), **payload.get("kwargs", {}))
            return bytes([ResultCode.RETURN]) + calldata.encode(result)

        if "PostMessage" in request:
            from genlayer.py.types import Address

            message = request["PostMessage"]
            vm._transfers.append(
                {
                    "to": Address(_addr_bytes(message["address"])).as_hex,
                    "value": int(message.get("value", 0)),
                    "on": message.get("on"),
                }
            )
            return {"ok": None}

        return None

    vm._gl_call_hook = hook


def register_contract(vm: VMContext, address, instance) -> None:
    vm._contracts_by_address[_addr_bytes(address)] = instance


def clear_known_contracts() -> None:
    """
    Reset the SDK's one-contract-per-module guard between deploys.

    `gl.Contract.__init_subclass__` registers the subclass in a module-level global
    and refuses a second one. That is correct on-chain — a module IS one contract —
    but a test session deploys three modules into one process, so the guard has to
    be cleared between them or the second deploy fails with
    `only one contract is allowed`.
    """
    for name, module in list(sys.modules.items()):
        if "genlayer" in name and hasattr(module, "__known_contract__"):
            setattr(module, "__known_contract__", None)


def deploy(vm: VMContext, filename: str, *args):
    """
    Deploy one contract into its own storage arena.

    Direct mode allocates every contract at the same root slot of the VM's single
    storage manager, so a second deploy lands on top of the first and both then
    read each other's bytes as garbage. On a real chain each contract has its own
    storage; here that is reproduced by handing each deploy a fresh manager, which
    the instance's slots capture at allocation time and keep using afterwards.
    """
    from gltest.direct.vm import InmemManager

    clear_known_contracts()
    vm._storage = InmemManager()
    return deploy_contract(CONTRACTS / filename, vm, *args)


# ------------------------------------------------------------------- fixtures


@pytest.fixture
def vm():
    context = VMContext()
    # Every fetch and every prompt in this suite is mocked on purpose. Strict mode
    # turns a forgotten mock into a loud failure instead of a live HTTP request
    # that would make the test depend on the internet.
    context.strict_mocks = True
    with context.activate():
        # Force the SDK into sys.modules before anything asks for an Address —
        # `create_address` degrades to raw bytes while `genlayer` is unimportable.
        load_contract_class(CONTRACTS / "policy_registry.py", context)
        clear_known_contracts()
        install_cross_contract_router(context)
        admin = create_address("admin")
        context.sender = admin
        context.origin = admin
        yield context


@pytest.fixture
def accounts(vm):
    return {
        "admin": create_address("admin"),
        "alice": create_address("alice"),  # complainant, in most tests
        "bob": create_address("bob"),  # respondent
        "carol": create_address("carol"),  # a bystander
    }


@pytest.fixture
def registry(vm, accounts):
    vm.sender = accounts["admin"]
    instance = deploy(vm, "policy_registry.py")
    instance.register_policy("news-article", DOCTRINE)
    register_contract(vm, create_address(REGISTRY_SEED), instance)
    return instance


@pytest.fixture
def court(vm, registry, accounts):
    vm.sender = accounts["admin"]
    instance = deploy(vm, "contract.py", create_address(REGISTRY_SEED))
    register_contract(vm, create_address(COURT_SEED), instance)
    return instance


@pytest.fixture
def reputation(vm, court, accounts):
    vm.sender = accounts["admin"]
    return deploy(vm, "reputation.py", create_address(COURT_SEED))


REPUTATION_SEED = "reputation-contract"


@pytest.fixture
def achievements(vm, court, reputation, accounts):
    """
    Deploy the Phase 7 Achievements contract wired to both the court and the
    reputation instance. The router hook registers all three by seed address so
    cross-contract calls (`_court().view()`, `_reputation().view()`) reach the
    right instance.
    """
    register_contract(vm, create_address(REPUTATION_SEED), reputation)
    vm.sender = accounts["admin"]
    return deploy(
        vm,
        "achievements.py",
        create_address(COURT_SEED),
        create_address(REPUTATION_SEED),
    )


# -------------------------------------------------------------------- helpers

DOCTRINE = (
    "Test doctrine for news articles. Protected expression is the writer's own "
    "prose and structure. Facts, names, dates and quotes from shared sources are "
    "never protected. Attributed quotation is permitted."
)

ORIGIN_URL = "https://example.org/original-report"
ACCUSED_URL = "https://copycat.example/rewrite"
ARCHIVE_URL = "https://archive.example/snapshot/original-report"

# Long enough to clear MIN_EVIDENCE_CHARS (200) so the contract treats it as real
# evidence rather than a 404 shell.
EXHIBIT_A = (
    "The Ministry confirmed on Tuesday that the bridge inspection had been "
    "postponed for a third time, citing a shortage of certified engineers. "
    "Internal correspondence obtained by this publication shows the delay was "
    "raised internally in March and was not disclosed to the district council. "
    "Two officials, speaking on condition of anonymity, described the schedule as "
    "unrecoverable within the current budget cycle. "
) * 2
EXHIBIT_B = (
    "The bridge inspection has been pushed back once more, the third such delay, "
    "with the Ministry pointing to a lack of certified engineers. Correspondence "
    "seen by us shows the issue was flagged internally in March and never reached "
    "the district council. Officials speaking anonymously called the timetable "
    "impossible to recover inside this budget cycle. "
) * 2
EXHIBIT_C = (
    "Snapshot captured 2026-03-02. The Ministry confirmed on Tuesday that the "
    "bridge inspection had been postponed for a third time, citing a shortage of "
    "certified engineers. This snapshot predates the version published by the "
    "second outlet by nine days. " * 2
)

CLAIM = "This outlet rewrote our exclusive reporting sentence by sentence and dropped the credit."


_FNV_OFFSET_64 = 0xCBF29CE484222325
_FNV_PRIME_64 = 0x100000001B3
_FNV_MASK_64 = 0xFFFFFFFFFFFFFFFF


def _fnv1a_64(text: str) -> int:
    h = _FNV_OFFSET_64
    for byte in text.encode("utf-8"):
        h ^= byte
        h = (h * _FNV_PRIME_64) & _FNV_MASK_64
    return h


def discipline_token(case_id: int, instance: int = 1,
                     origin_url: str = ORIGIN_URL, accused_url: str = ACCUSED_URL) -> str:
    """Mirror of the contract-side canary — the mock LLM must echo this back."""
    seed = f"pac|{case_id}|{instance}|{origin_url}|{accused_url}"
    return "PAC-" + format(_fnv1a_64(seed), "016X")[:12]


def opinion(
    verdict: str = "INFRINGING",
    overlap: int = 78,
    confidence: int = 88,
    publisher: str = "ORIGIN",
    reason: str = "Structure and exclusive sourcing reproduced with synonyms only.",
    *,
    case_id: int = 0,
    instance: int = 1,
    origin_url: str = ORIGIN_URL,
    accused_url: str = ACCUSED_URL,
    discipline: str | None = None,
    analyses: dict | None = None,
    omit_discipline: bool = False,
) -> str:
    """A well-formed adjudicator response, for mocking the LLM."""
    body = {
        "verdict": verdict,
        "overlap_pct": overlap,
        "confidence": confidence,
        "first_publisher": publisher,
        "reason": reason,
        "analyses": analyses if analyses is not None else {
            "forensic": "Structural clauses echo the source with synonym-swapped nouns.",
            "reader": "A reader picks up the exclusive framing without effort.",
            "skeptic": "No shared upstream source or convention explains the ordering.",
        },
    }
    if not omit_discipline:
        body["discipline_token"] = discipline if discipline is not None else discipline_token(
            case_id, instance, origin_url, accused_url
        )
    else:
        # Sentinel the shim looks at — a JSON response carrying this key is left
        # alone even when no discipline_token is present, so the failure path
        # actually reaches the contract's discipline check.
        body["_no_discipline_shim"] = True
    return json.dumps(body)


def mock_evidence(vm, origin: str = EXHIBIT_A, accused: str = EXHIBIT_B):
    """Make both exhibits fetchable."""
    vm.mock_web(r"example\.org/original-report", {"method": "GET", "status": 200, "body": origin})
    vm.mock_web(r"copycat\.example/rewrite", {"method": "GET", "status": 200, "body": accused})


def mock_archive(vm, archive: str = EXHIBIT_C):
    """Make the corroborating source the appeal reads fetchable."""
    vm.mock_web(r"archive\.example/", {"method": "GET", "status": 200, "body": archive})


def file_case(vm, court, complainant, bond: int = GEN, category: str = "news-article") -> int:
    """File a case and return its id."""
    case_id = court.get_case_count()
    vm.sender = complainant
    vm.value = bond
    court.file_case(category, ORIGIN_URL, ACCUSED_URL, CLAIM)
    vm.value = 0
    return case_id


def contest(vm, court, case_id: int, respondent, counter: int = GEN) -> None:
    vm.sender = respondent
    vm.value = counter
    court.contest_case(case_id)
    vm.value = 0


def case_of(court, case_id: int) -> dict:
    return json.loads(court.get_case(case_id))
