"""
Phase 9 — Amicus curiae briefs.

A prior-art dispute is a two-party affair only by convention. In practice, the
strongest evidence is often held by a third party: a reader who kept an
archive, a maintainer with a source-code diff, a citation the complainant
missed. The court had no channel for them.

Amicus briefs are that channel. Any NON-PARTY can stake a small bond
(>= MIN_AMICUS_STAKE) and submit a URL and a stance
(SUPPORTING_COMPLAINANT / SUPPORTING_RESPONDENT / NEUTRAL) at any time before
the case leaves an open status. The court reads the URL into the prompt as
supplementary evidence, and at settlement:

  * amici on the winning side get their stake back plus a pro-rata share of
    the losing amici's forfeits,
  * amici on the losing side forfeit their stake,
  * NEUTRAL briefs are always refunded — they contribute evidence without
    taking a side, and the court refuses to take money from evidence alone.

These tests pin down every branch of that.
"""

import json

import pytest

from conftest import (
    ARCHIVE_URL,
    EXHIBIT_A,
    EXHIBIT_B,
    GEN,
    ORIGIN_URL,
    ACCUSED_URL,
    case_of,
    contest,
    file_case,
    mock_archive,
    mock_evidence,
    opinion,
    rejects,
)

LEADER_PROMPT = r"impartial adjudicator"

AMICUS_URL_A = "https://third-party.example/archive-of-original"
AMICUS_URL_B = "https://third-party.example/rebuttal-analysis"
AMICUS_URL_C = "https://third-party.example/neutral-context"

AMICUS_BODY = (
    "Third-party retrospective analysis. The claimed original was published on "
    "March 12; the accused piece appeared the following week. The archived "
    "snapshot captured on March 15 already carries the exclusive detail cited "
    "in the complaint. This brief is submitted with a supporting stance. " * 3
)

MIN_STAKE = 10**17  # matches MIN_AMICUS_STAKE in the contract


def _submit(vm, court, case_id, submitter, url, stance, stake=MIN_STAKE, note="see attached"):
    vm.sender = submitter
    vm.value = stake
    court.submit_amicus(case_id, url, note, stance)
    vm.value = 0


def _mock_amicus_urls(vm):
    vm.mock_web(
        r"third-party\.example/archive-of-original",
        {"method": "GET", "status": 200, "body": AMICUS_BODY},
    )
    vm.mock_web(
        r"third-party\.example/rebuttal-analysis",
        {"method": "GET", "status": 200, "body": AMICUS_BODY},
    )
    vm.mock_web(
        r"third-party\.example/neutral-context",
        {"method": "GET", "status": 200, "body": AMICUS_BODY},
    )


# --------------------------------------------------------------- submission


def test_a_non_party_can_stake_an_amicus_brief_on_an_open_case(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    _submit(vm, court, case_id, accounts["carol"], AMICUS_URL_A, "SUPPORTING_COMPLAINANT")

    briefs = json.loads(court.get_amicus_briefs(case_id))
    assert len(briefs) == 1
    assert briefs[0]["submitter"] == accounts["carol"].as_hex
    assert briefs[0]["url"] == AMICUS_URL_A
    assert briefs[0]["stance"] == "SUPPORTING_COMPLAINANT"
    assert briefs[0]["stake"] == str(MIN_STAKE)
    assert briefs[0]["refunded"] is False


def test_a_party_may_not_submit_a_brief_on_their_own_case(vm, court, accounts):
    """An amicus brief from the complainant is a sockpuppet; from the
    respondent, self-dealing. Both are refused at the contract."""
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    contest(vm, court, case_id, accounts["bob"])

    vm.sender = accounts["alice"]
    vm.value = MIN_STAKE
    with rejects("a party may not submit an amicus brief"):
        court.submit_amicus(case_id, AMICUS_URL_A, "note", "SUPPORTING_COMPLAINANT")
    vm.value = 0

    vm.sender = accounts["bob"]
    vm.value = MIN_STAKE
    with rejects("a party may not submit an amicus brief"):
        court.submit_amicus(case_id, AMICUS_URL_A, "note", "SUPPORTING_RESPONDENT")
    vm.value = 0


def test_briefs_below_the_minimum_stake_are_refused(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    vm.sender = accounts["carol"]
    vm.value = MIN_STAKE // 2
    with rejects("amicus stake below the minimum"):
        court.submit_amicus(case_id, AMICUS_URL_A, "note", "NEUTRAL")
    vm.value = 0


def test_the_stance_must_be_from_the_closed_vocabulary(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    vm.sender = accounts["carol"]
    vm.value = MIN_STAKE
    with rejects("unknown amicus stance"):
        court.submit_amicus(case_id, AMICUS_URL_A, "note", "MAYBE")
    vm.value = 0


def test_the_amicus_cap_is_enforced(vm, court, accounts):
    """MAX_AMICUS_BRIEFS is a real bound — every brief costs every validator a
    page fetch, and there is a limit past which the adjudicator's context blows.
    Test files 8 briefs, then confirms the 9th is refused."""
    from gltest.direct import create_address

    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    for i in range(8):
        _submit(
            vm,
            court,
            case_id,
            create_address(f"amicus-{i}"),
            f"https://third-party.example/brief-{i}",
            "NEUTRAL",
        )
    assert court.get_amicus_count(case_id) == 8

    vm.sender = create_address("amicus-9")
    vm.value = MIN_STAKE
    with rejects("amicus cap"):
        court.submit_amicus(case_id, "https://third-party.example/brief-9", "note", "NEUTRAL")
    vm.value = 0


def test_briefs_cannot_be_submitted_after_settlement(vm, court, accounts):
    """The evidence bundle is fixed at adjudication time — a brief submitted
    after would be a griefing vector via a party's sockpuppet."""
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    contest(vm, court, case_id, accounts["bob"])
    mock_evidence(vm)
    vm.mock_llm(LEADER_PROMPT, opinion(verdict="INFRINGING", overlap=80, confidence=90))
    court.adjudicate(case_id)

    vm.sender = accounts["carol"]
    vm.value = MIN_STAKE
    with rejects("amicus briefs must be submitted before adjudication"):
        court.submit_amicus(case_id, AMICUS_URL_A, "too late", "SUPPORTING_COMPLAINANT")
    vm.value = 0


# ---------------------------------------------------------------- adjudication


def test_amicus_urls_are_rendered_into_the_prompt(vm, court, accounts):
    """The court MUST read the amicus URL — that is the point. Capture the
    prompt sent to the LLM and assert the amicus block is present."""
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    contest(vm, court, case_id, accounts["bob"])
    _submit(vm, court, case_id, accounts["carol"], AMICUS_URL_A, "SUPPORTING_COMPLAINANT")

    mock_evidence(vm)
    _mock_amicus_urls(vm)

    captured: list[str] = []
    original = type(vm)._match_llm_mock

    def capture(self, prompt: str):
        captured.append(prompt)
        return original(self, prompt)

    type(vm)._match_llm_mock = capture
    try:
        vm.mock_llm(LEADER_PROMPT, opinion(verdict="INFRINGING", overlap=80, confidence=90))
        court.adjudicate(case_id)
    finally:
        type(vm)._match_llm_mock = original

    assert captured
    prompt = captured[0]
    assert "AMICUS BRIEF #1" in prompt
    assert AMICUS_URL_A in prompt
    assert "SUPPORTING_COMPLAINANT" in prompt


# ---------------------------------------------------------------- settlement


def test_a_winning_amicus_recovers_stake_plus_pro_rata_share_of_forfeits(
    vm, court, accounts
):
    """
    Complainant wins → SUPPORTING_COMPLAINANT briefs win. Two supporting
    briefs of MIN_STAKE each, one opposing brief of MIN_STAKE. Each winner
    should get their stake back plus MIN_STAKE/2 from the loser pool.
    """
    from gltest.direct import create_address

    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    contest(vm, court, case_id, accounts["bob"])

    winner_a = create_address("amicus-winner-a")
    winner_b = create_address("amicus-winner-b")
    loser = create_address("amicus-loser")

    _submit(vm, court, case_id, winner_a, AMICUS_URL_A, "SUPPORTING_COMPLAINANT")
    _submit(vm, court, case_id, winner_b, AMICUS_URL_B, "SUPPORTING_COMPLAINANT")
    _submit(vm, court, case_id, loser, AMICUS_URL_C, "SUPPORTING_RESPONDENT")

    mock_evidence(vm)
    _mock_amicus_urls(vm)
    vm.mock_llm(LEADER_PROMPT, opinion(verdict="INFRINGING", overlap=80, confidence=90))
    court.adjudicate(case_id)

    # Winners: MIN_STAKE own + (MIN_STAKE * MIN_STAKE) // (2 * MIN_STAKE) = MIN_STAKE + MIN_STAKE // 2
    expected_per_winner = MIN_STAKE + MIN_STAKE // 2
    assert court.get_withdrawable(winner_a) == str(expected_per_winner)
    assert court.get_withdrawable(winner_b) == str(expected_per_winner)
    # Loser: stake forfeited to the winning pool
    assert court.get_withdrawable(loser) == "0"


def test_neutral_briefs_are_always_refunded(vm, court, accounts):
    from gltest.direct import create_address

    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    contest(vm, court, case_id, accounts["bob"])

    neutral = create_address("amicus-neutral")
    _submit(vm, court, case_id, neutral, AMICUS_URL_C, "NEUTRAL")

    mock_evidence(vm)
    _mock_amicus_urls(vm)
    vm.mock_llm(LEADER_PROMPT, opinion(verdict="INFRINGING", overlap=80, confidence=90))
    court.adjudicate(case_id)

    assert court.get_withdrawable(neutral) == str(MIN_STAKE)


def test_losing_amicus_stake_goes_to_forfeited_pool_when_no_winners(
    vm, court, accounts
):
    """If nobody on the winning side staked, there is no one to receive the
    forfeit — it goes to the forfeited_pool where the sweep function lives."""
    from gltest.direct import create_address

    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    contest(vm, court, case_id, accounts["bob"])

    only_loser = create_address("amicus-lone-loser")
    _submit(vm, court, case_id, only_loser, AMICUS_URL_A, "SUPPORTING_RESPONDENT")

    mock_evidence(vm)
    _mock_amicus_urls(vm)
    vm.mock_llm(LEADER_PROMPT, opinion(verdict="INFRINGING", overlap=80, confidence=90))
    court.adjudicate(case_id)

    assert court.get_withdrawable(only_loser) == "0"
    # Case bond forfeit is 0 here (contested, complainant won → pot to alice),
    # so the whole forfeited_pool value comes from the amicus stake.
    assert int(court.get_forfeited_pool()) >= MIN_STAKE


def test_amicus_stakes_unwind_when_the_appeal_refunds_everyone(vm, court, accounts):
    """An unadjudicable case is nobody's fault. Every amicus stake must
    return unconditionally when the appeal calls _refund_all."""
    from gltest.direct import create_address

    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    contest(vm, court, case_id, accounts["bob"])

    supporter = create_address("amicus-supporter")
    _submit(vm, court, case_id, supporter, AMICUS_URL_A, "SUPPORTING_COMPLAINANT")

    # Drive first instance to ESCALATED via low confidence.
    mock_evidence(vm)
    _mock_amicus_urls(vm)
    vm.mock_llm(LEADER_PROMPT, opinion(verdict="INFRINGING", overlap=60, confidence=40))
    court.adjudicate(case_id)

    # Appeal returns EVIDENCE_UNAVAILABLE → _refund_all fires.
    vm.clear_mocks()
    mock_archive(vm)
    vm.mock_llm(r"FINAL instance", opinion(verdict="INFRINGING"))
    vm.sender = accounts["alice"]
    vm.value = GEN
    court.appeal(case_id, ARCHIVE_URL)
    vm.value = 0

    # Amicus stake refunded regardless of the brief's stance.
    assert court.get_withdrawable(supporter) == str(MIN_STAKE)


def test_the_provenance_shows_every_amicus_lifecycle_event(vm, court, accounts):
    from gltest.direct import create_address

    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    contest(vm, court, case_id, accounts["bob"])

    supporter = create_address("amicus-supporter")
    _submit(vm, court, case_id, supporter, AMICUS_URL_A, "SUPPORTING_COMPLAINANT")

    mock_evidence(vm)
    _mock_amicus_urls(vm)
    vm.mock_llm(LEADER_PROMPT, opinion(verdict="INFRINGING", overlap=80, confidence=90))
    court.adjudicate(case_id)

    history = json.loads(court.get_history(case_id))
    kinds = [entry["kind"] for entry in history]
    assert "amicus_submitted" in kinds
    assert "amicus_settled" in kinds
    submitted = next(e for e in history if e["kind"] == "amicus_submitted")
    assert submitted["stance"] == "SUPPORTING_COMPLAINANT"
    settled = next(e for e in history if e["kind"] == "amicus_settled")
    assert settled["outcome"] == "won"
