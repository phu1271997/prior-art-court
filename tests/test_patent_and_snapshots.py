"""
Phase 6 — patent-claim domain + auto-corroboration snapshots.

The court used to reason from exactly two sources at first instance: the
claimed original, and the alleged copy. That worked for a copying dispute
between two web pages, but it is thin evidence for a prior-art claim about a
patent — the question there is not who worded something first, it is which
combination of elements was public before which. Phase 6 does two things:

  1. Registers a `patent-claim` doctrine that turns the two questions of
     patent-law prior-art analysis (anticipation, obviousness) into the
     court's existing three-verdict vocabulary.
  2. Fetches archived snapshots of BOTH exhibit URLs automatically at the
     first instance, so the adjudicator sees up to four supplementary
     sources (Wayback + archive.today for each exhibit) without any party
     having to hunt them down.

These tests pin down both.
"""

import json

from conftest import (
    CLAIM,
    EXHIBIT_A,
    EXHIBIT_B,
    GEN,
    ORIGIN_URL,
    ACCUSED_URL,
    case_of,
    file_case,
    mock_evidence,
    opinion,
    rejects,
)

LEADER_PROMPT = r"impartial adjudicator"


PATENT_CLAIM_A = (
    "A method for authenticating an on-chain document comprising: "
    "1) hashing the document content with a keyed hash function; "
    "2) storing the resulting digest inside a smart-contract mapping "
    "keyed by document identifier; and "
    "3) revealing the key only when a party satisfies a stake-locked "
    "predicate registered at document creation. "
    "The combination is claimed as the invention. " * 3
)

PATENT_CLAIM_B = (
    "Prior work: a hashed-commitment scheme where document digests are "
    "held in a smart-contract map and the pre-image key is released "
    "after a bonded verifier accepts a challenge. This construction "
    "was public before the plaintiff's filing date. " * 3
)


def _register_patent_doctrine(registry):
    """The `patent-claim` policy is seeded by scripts/deploy.py in real deploys.
    In direct-mode tests we register it explicitly so cases can be filed under it."""
    from contracts.policies import POLICIES  # noqa

    registry.register_policy("patent-claim", POLICIES["patent-claim"])


# ------------------------------------------------------------------ doctrine


def test_the_patent_claim_doctrine_is_registered_by_the_deploy_seed():
    """
    The doctrine text itself must ship in `contracts/policies.py` so
    `scripts/deploy.py` writes it on-chain at deploy time — the frontend and
    the court read this same map.
    """
    from contracts.policies import POLICIES

    assert "patent-claim" in POLICIES, "the patent-claim category must be seeded"
    doctrine = POLICIES["patent-claim"]
    assert "ANTICIPATION" in doctrine, "the doctrine must state the anticipation test"
    assert "OBVIOUSNESS" in doctrine, "the doctrine must state the obviousness test"
    assert "Graham factors" in doctrine, "the doctrine must reference Graham factors"
    assert len(doctrine) >= 120, (
        "the PolicyRegistry rejects doctrines shorter than 120 chars"
    )


def test_a_patent_claim_case_can_be_filed_once_the_doctrine_is_registered(
    vm, court, registry, accounts
):
    _register_patent_doctrine(registry)

    vm.sender = accounts["alice"]
    vm.value = GEN
    court.file_case(
        "patent-claim",
        "https://uspto.example/claim/42",
        "https://prior-art.example/thesis-2024",
        PATENT_CLAIM_A[:200],
    )
    vm.value = 0

    case = case_of(court, 0)
    assert case["category"] == "patent-claim"
    assert case["status"] == "FILED"


def test_a_case_in_an_unregistered_category_is_still_refused(vm, court, accounts):
    vm.sender = accounts["alice"]
    vm.value = GEN
    with rejects("no doctrine for this category"):
        court.file_case(
            "trade-secret",  # never registered
            "https://a.example/thing",
            "https://b.example/thing",
            "This is a trade secret claim." * 3,
        )
    vm.value = 0


# --------------------------------------------------------------- snapshots


def _mock_wayback_and_archive(vm, origin_snap: str, accused_snap: str):
    """Register archive-service mocks for the URLs the court derives from ORIGIN/ACCUSED."""
    vm.mock_web(r"web\.archive\.org/web/0/.*example\.org/original-report",
                {"method": "GET", "status": 200, "body": origin_snap})
    vm.mock_web(r"archive\.ph/newest/.*example\.org/original-report",
                {"method": "GET", "status": 200, "body": origin_snap})
    vm.mock_web(r"web\.archive\.org/web/0/.*copycat\.example/rewrite",
                {"method": "GET", "status": 200, "body": accused_snap})
    vm.mock_web(r"archive\.ph/newest/.*copycat\.example/rewrite",
                {"method": "GET", "status": 200, "body": accused_snap})


def test_the_first_instance_fetches_snapshots_of_both_exhibits_automatically(
    vm, court, accounts
):
    """
    The whole point of Phase 6 auto-corroboration: the court sees Wayback and
    archive.today snapshots for both exhibits without any party doing anything.
    The prompt renders each snapshot in its own fenced block; captured LLM
    prompts (visible to the mock) must contain all four labels.
    """
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)
    _mock_wayback_and_archive(
        vm,
        origin_snap="Snapshot captured 2024-06-01. " + EXHIBIT_A,
        accused_snap="Snapshot captured 2025-01-10. " + EXHIBIT_B,
    )

    captured_prompts: list[str] = []
    original_match = type(vm)._match_llm_mock

    def capture(self, prompt: str):
        captured_prompts.append(prompt)
        return original_match(self, prompt)

    type(vm)._match_llm_mock = capture
    try:
        vm.mock_llm(LEADER_PROMPT, opinion(verdict="INFRINGING", overlap=80, confidence=88))
        court.adjudicate(case_id)
    finally:
        type(vm)._match_llm_mock = original_match

    assert captured_prompts, "the LLM mock must have been consulted at least once"
    prompt = captured_prompts[0]
    for label in (
        "origin-wayback",
        "origin-archiveph",
        "accused-wayback",
        "accused-archiveph",
    ):
        assert label in prompt, f"the {label} snapshot block must be rendered in the prompt"

    # The verdict path still works end-to-end even with the extra sources.
    case = case_of(court, case_id)
    assert case["status"] == "RESOLVED"
    assert case["verdict"] == "INFRINGING"


def test_the_first_instance_still_decides_when_no_snapshots_are_reachable(
    vm, court, accounts
):
    """
    Snapshots are supplementary, not required. If every archive service is
    unreachable — a plausible failure mode for a niche exhibit URL — the
    court still adjudicates on the two primary exhibits.
    """
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)
    # No archive mocks registered on purpose; every snapshot fetch fails.
    vm.mock_llm(LEADER_PROMPT, opinion(verdict="INFRINGING", overlap=82, confidence=91))
    court.adjudicate(case_id)

    case = case_of(court, case_id)
    assert case["status"] == "RESOLVED"
    assert case["verdict"] == "INFRINGING"


def test_thin_or_short_snapshots_are_silently_dropped(vm, court, accounts):
    """A snapshot rendering to a cookie banner or a JS shell is worse than no
    snapshot — the doctrine already excludes text under MIN_EVIDENCE_CHARS."""
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)
    # A "snapshot" of a few dozen chars, matching the exhibit URL patterns.
    _mock_wayback_and_archive(vm, origin_snap="Please enable JavaScript.", accused_snap="404 Not Found")

    vm.mock_llm(LEADER_PROMPT, opinion(verdict="DERIVATIVE_FAIR", overlap=30, confidence=90))
    court.adjudicate(case_id)

    # Still resolves — the case survives thin snapshots, they just don't help.
    case = case_of(court, case_id)
    assert case["status"] == "RESOLVED"


# --------------------------------------------------------------- domain note


def test_the_prompt_carries_the_domain_note_for_patent_claims(vm, court, registry, accounts):
    """
    A patent-claim dispute is not a text-similarity dispute — the prompt tells
    the adjudicator so, using the two-question anticipation/obviousness
    framing. That framing must actually appear in the prompt or the doctrine
    is decorative rather than load-bearing.
    """
    _register_patent_doctrine(registry)

    vm.sender = accounts["alice"]
    vm.value = GEN
    court.file_case(
        "patent-claim",
        ORIGIN_URL,
        ACCUSED_URL,
        PATENT_CLAIM_A[:200],
    )
    vm.value = 0

    mock_evidence(vm, origin=PATENT_CLAIM_A, accused=PATENT_CLAIM_B)

    captured_prompts: list[str] = []
    original_match = type(vm)._match_llm_mock

    def capture(self, prompt: str):
        captured_prompts.append(prompt)
        return original_match(self, prompt)

    type(vm)._match_llm_mock = capture
    try:
        vm.mock_llm(LEADER_PROMPT, opinion(verdict="INFRINGING", overlap=88, confidence=90))
        court.adjudicate(0)
    finally:
        type(vm)._match_llm_mock = original_match

    prompt = captured_prompts[0]
    assert "ANTICIPATION" in prompt
    assert "OBVIOUSNESS" in prompt
    assert "person of ordinary skill" in prompt


def test_non_patent_categories_do_not_get_patent_framing(vm, court, accounts):
    """A copying dispute (news article) still gets its own domain note, not the
    patent one. Otherwise every hearing would be told to look for `elements` in
    a text where there are no claim elements to find."""
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)

    captured_prompts: list[str] = []
    original_match = type(vm)._match_llm_mock

    def capture(self, prompt: str):
        captured_prompts.append(prompt)
        return original_match(self, prompt)

    type(vm)._match_llm_mock = capture
    try:
        vm.mock_llm(LEADER_PROMPT, opinion(verdict="INFRINGING", overlap=80, confidence=90))
        court.adjudicate(case_id)
    finally:
        type(vm)._match_llm_mock = original_match

    prompt = captured_prompts[0]
    assert "ANTICIPATION" not in prompt
    assert "OBVIOUSNESS" not in prompt
