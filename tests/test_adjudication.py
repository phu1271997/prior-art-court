"""
The first instance — where the court reads the web, reasons, and decides.

These tests are the reason the suite runs on a mocked VM. Each one pins down a
behaviour that only shows up when the outside world misbehaves: a dead link, a
model that contradicts itself, a model that answers in markdown, and — the
important one — two validators who read the same two pages and reach different
verdicts.
"""

import json

from conftest import (
    ARCHIVE_URL,
    EXHIBIT_A,
    EXHIBIT_B,
    GEN,
    case_of,
    contest,
    file_case,
    mock_evidence,
    opinion,
    rejects,
)

LEADER_PROMPT = r"impartial adjudicator"


def hear(vm, court, case_id, response=None, **kwargs):
    """Adjudicate with the model mocked to return `response` (or a built opinion)."""
    vm.mock_llm(LEADER_PROMPT, response if response is not None else opinion(**kwargs))
    court.adjudicate(case_id)
    return case_of(court, case_id)


# ------------------------------------------------------------------ settlement


def test_a_contested_infringement_pays_the_whole_pot_to_the_complainant(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=2 * GEN)
    contest(vm, court, case_id, accounts["bob"], counter=3 * GEN)
    mock_evidence(vm)

    case = hear(vm, court, case_id, verdict="INFRINGING", overlap=78, confidence=88)

    assert case["status"] == "RESOLVED"
    assert case["verdict"] == "INFRINGING"
    assert case["overlap_pct"] == 78
    assert case["confidence"] == 88
    assert case["instance"] == 1
    assert case["winner"] == accounts["alice"].as_hex
    assert case["payout"] == str(5 * GEN)
    assert court.get_withdrawable(accounts["alice"]) == str(5 * GEN)
    assert court.get_withdrawable(accounts["bob"]) == "0"


def test_a_contested_fair_use_finding_pays_the_respondent(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    contest(vm, court, case_id, accounts["bob"], counter=GEN)
    mock_evidence(vm)

    case = hear(vm, court, case_id, verdict="DERIVATIVE_FAIR", overlap=30, confidence=91)

    assert case["winner"] == accounts["bob"].as_hex
    assert court.get_withdrawable(accounts["bob"]) == str(2 * GEN)
    assert court.get_withdrawable(accounts["alice"]) == "0"


def test_an_uncontested_complaint_that_is_upheld_gets_its_bond_back(vm, court, accounts):
    """Vindicated, but there is no counterparty to collect from."""
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)

    case = hear(vm, court, case_id, verdict="INFRINGING", overlap=81, confidence=90)

    assert case["winner"] == accounts["alice"].as_hex
    assert court.get_withdrawable(accounts["alice"]) == str(GEN)
    assert court.get_forfeited_pool() == "0"


def test_an_uncontested_complaint_that_is_rejected_forfeits_the_bond(vm, court, accounts):
    """This is what makes filing rubbish expensive even when nobody shows up."""
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)

    case = hear(vm, court, case_id, verdict="INDEPENDENT", overlap=4, confidence=93)

    assert case["status"] == "RESOLVED"
    assert case["winner"] == "0x" + "0" * 40
    assert case["payout"] == "0"
    assert court.get_withdrawable(accounts["alice"]) == "0"
    assert court.get_forfeited_pool() == str(GEN)


def test_the_model_never_chooses_an_amount(vm, court, accounts):
    """
    The payout is arithmetic over escrowed bonds, so an adjudicator that tries to
    award a number has no channel to do it through.
    """
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    contest(vm, court, case_id, accounts["bob"], counter=GEN)
    mock_evidence(vm)

    greedy = json.dumps(
        {
            "verdict": "INFRINGING",
            "overlap_pct": 90,
            "confidence": 95,
            "first_publisher": "ORIGIN",
            "reason": "Copied wholesale.",
            "damages": 10**30,
            "payout": 10**30,
        }
    )
    case = hear(vm, court, case_id, response=greedy)

    assert case["payout"] == str(2 * GEN)


# ------------------------------------------------------------------ escalation


def test_low_confidence_escalates_instead_of_settling(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    contest(vm, court, case_id, accounts["bob"])
    mock_evidence(vm)

    case = hear(vm, court, case_id, verdict="INFRINGING", overlap=70, confidence=55)

    assert case["status"] == "ESCALATED"
    assert case["payout"] == "0"
    assert court.get_withdrawable(accounts["alice"]) == "0"
    assert court.get_withdrawable(accounts["bob"]) == "0"

    grounds = [e for e in json.loads(court.get_history(case_id)) if e["kind"] == "escalated"]
    assert grounds[0]["ground"] == "low_confidence"


def test_infringement_with_a_trivial_overlap_is_treated_as_self_contradiction(
    vm, court, accounts
):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)

    case = hear(vm, court, case_id, verdict="INFRINGING", overlap=12, confidence=95)

    assert case["status"] == "ESCALATED"
    grounds = [e for e in json.loads(court.get_history(case_id)) if e["kind"] == "escalated"]
    assert grounds[0]["ground"] == "inconsistent_finding"


def test_unreachable_evidence_escalates_rather_than_guessing(vm, court, accounts):
    """A dead link is a fact about the evidence, not a reason to decide anyway."""
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    # Only the origin page is reachable; the accused URL is left unmocked, and
    # strict mode makes that a fetch failure.
    vm.mock_web(r"example\.org/original-report", {"method": "GET", "status": 200, "body": EXHIBIT_A})

    court.adjudicate(case_id)

    case = case_of(court, case_id)
    assert case["status"] == "ESCALATED"
    assert case["verdict"] == "EVIDENCE_UNAVAILABLE"
    assert case["confidence"] == 0
    grounds = [e for e in json.loads(court.get_history(case_id)) if e["kind"] == "escalated"]
    assert grounds[0]["ground"] == "evidence_unavailable"


def test_a_page_that_renders_to_nothing_is_not_evidence(vm, court, accounts):
    """A cookie wall, a paywall and a JS shell all render to a few dozen characters."""
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm, accused="Please enable JavaScript to continue.")

    court.adjudicate(case_id)

    case = case_of(court, case_id)
    assert case["status"] == "ESCALATED"
    assert case["verdict"] == "EVIDENCE_UNAVAILABLE"
    assert "too little text" in case["reason"]


# --------------------------------------------------------- model output handling


def test_a_fenced_json_reply_is_accepted(vm, court, accounts):
    """Models wrap JSON in markdown constantly; that is not a reason to lose a round."""
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)

    fenced = "Here is my decision:\n```json\n" + opinion(overlap=72) + "\n```\nHope that helps."
    case = hear(vm, court, case_id, response=fenced)

    assert case["verdict"] == "INFRINGING"
    assert case["overlap_pct"] == 72


def test_output_with_no_json_object_aborts_the_round(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)

    vm.mock_llm(LEADER_PROMPT, "I am not comfortable making that determination.")
    with rejects("did not return a JSON object"):
        court.adjudicate(case_id)

    assert case_of(court, case_id)["status"] == "FILED"


def test_missing_fields_are_coerced_rather_than_thrown_away(vm, court, accounts):
    """
    A round the whole validator set just paid for must not be discarded over a
    missing key — it is normalized, and the missing confidence then escalates.
    """
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)

    case = hear(vm, court, case_id, response=json.dumps({"verdict": "INFRINGING"}))

    assert case["verdict"] == "INFRINGING"
    assert case["overlap_pct"] == 0
    assert case["confidence"] == 0
    assert case["first_publisher"] == "UNCLEAR"
    assert case["status"] == "ESCALATED"


def test_a_verdict_outside_the_courts_vocabulary_is_not_honoured(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)

    case = hear(vm, court, case_id, response=opinion(verdict="TOTALLY_STOLEN"))

    assert case["verdict"] == "EVIDENCE_UNAVAILABLE"
    assert case["status"] == "ESCALATED"


def test_out_of_range_percentages_are_clamped(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)

    case = hear(vm, court, case_id, response=opinion(overlap=1000, confidence=-20))

    assert case["overlap_pct"] == 100
    assert case["confidence"] == 0


def test_a_case_is_heard_once(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)
    hear(vm, court, case_id)

    with rejects("not awaiting a first-instance hearing"):
        court.adjudicate(case_id)


def test_a_withdrawn_case_cannot_be_adjudicated(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    vm.sender = accounts["alice"]
    court.withdraw_case(case_id)
    mock_evidence(vm)

    with rejects("not awaiting a first-instance hearing"):
        court.adjudicate(case_id)


# ------------------------------------------------------ consensus, the real test


def rerun_validator(vm, leader_opinion: str, validator_opinion: str) -> bool:
    """
    Re-run the captured validator against a leader opinion, with the model now
    answering the way a *different* validator's independent run would.
    """
    vm.clear_mocks()
    mock_evidence(vm)
    vm.mock_llm(LEADER_PROMPT, validator_opinion)
    return vm.run_validator(leader_result=leader_opinion)


def test_a_validator_that_reached_the_same_verdict_agrees(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)
    hear(vm, court, case_id, verdict="INFRINGING", overlap=78, confidence=88)

    agreed = rerun_validator(
        vm,
        opinion(verdict="INFRINGING", overlap=78),
        opinion(
            verdict="INFRINGING",
            overlap=66,
            confidence=71,
            reason="Completely different wording, same conclusion.",
        ),
    )
    assert agreed is True


def test_a_validator_that_reached_a_DIFFERENT_VERDICT_does_not_agree(vm, court, accounts):
    """
    The line between a court and a JSON schema check.

    Both runs here are well-formed, both carry every key, and both are plausible.
    They disagree about whether the work was copied. Consensus must fail.
    """
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)
    hear(vm, court, case_id, verdict="INFRINGING", overlap=78, confidence=88)

    agreed = rerun_validator(
        vm,
        opinion(verdict="INFRINGING", overlap=78),
        opinion(verdict="INDEPENDENT", overlap=76, confidence=88),
    )
    assert agreed is False


def test_a_validator_whose_overlap_estimate_is_wildly_different_does_not_agree(
    vm, court, accounts
):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)
    hear(vm, court, case_id, verdict="INFRINGING", overlap=90, confidence=88)

    agreed = rerun_validator(
        vm,
        opinion(verdict="INFRINGING", overlap=90),
        opinion(verdict="INFRINGING", overlap=44),
    )
    assert agreed is False


def test_prose_and_confidence_may_differ_freely(vm, court, accounts):
    """
    Independent LLM runs never phrase a judgement the same way, and confidence is
    the noisiest field of all. Comparing either would mean a court that can never
    reach a verdict.
    """
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)
    hear(vm, court, case_id, verdict="DERIVATIVE_FAIR", overlap=40, confidence=95)

    agreed = rerun_validator(
        vm,
        opinion(verdict="DERIVATIVE_FAIR", overlap=40, confidence=95, reason="Quoted with credit."),
        opinion(
            verdict="DERIVATIVE_FAIR",
            overlap=52,
            confidence=61,
            reason="Attribution is present in the second paragraph; this is commentary.",
        ),
    )
    assert agreed is True


def test_a_leader_that_errored_is_never_agreed_with(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)
    hear(vm, court, case_id)

    assert vm.run_validator(leader_error=RuntimeError("leader blew up")) is False


def test_a_validator_that_cannot_reach_the_evidence_does_not_rubber_stamp(vm, court, accounts):
    """
    A validator whose own fetch failed sees EVIDENCE_UNAVAILABLE, which is not the
    leader's verdict, so it declines rather than deferring to the leader.
    """
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    mock_evidence(vm)
    hear(vm, court, case_id, verdict="INFRINGING", overlap=78)

    vm.clear_mocks()
    vm.mock_web(r"example\.org/original-report", {"method": "GET", "status": 200, "body": EXHIBIT_A})
    assert vm.run_validator(leader_result=opinion(verdict="INFRINGING", overlap=78)) is False


def test_the_full_provenance_of_a_decided_case_is_readable(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    contest(vm, court, case_id, accounts["bob"])
    mock_evidence(vm)
    hear(vm, court, case_id)

    kinds = [entry["kind"] for entry in json.loads(court.get_history(case_id))]
    assert kinds == ["filed", "contested", "first_instance", "settled"]

    docket = json.loads(court.get_docket(0))
    assert [entry["kind"] for entry in docket] == ["filed", "contested", "settled"]
