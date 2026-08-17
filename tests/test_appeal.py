"""
The final instance — three sources, and one question the first instance never asked.

The appeal is not "run it again and hope". It reads a corroborating source and
decides which work was published first, because a complaint against a work that
predates the "original" is not weak, it is inverted. These tests pin that down,
along with the rule that a settled case is never reopened.
"""

import json

from conftest import (
    ARCHIVE_URL,
    EXHIBIT_A,
    GEN,
    case_of,
    contest,
    file_case,
    mock_archive,
    mock_evidence,
    opinion,
    rejects,
)

LEADER_PROMPT = r"impartial adjudicator"
APPEAL_PROMPT = r"FINAL instance"


def escalated_case(vm, court, accounts, bond=GEN, counter=GEN, contested=True) -> int:
    """Drive a case to ESCALATED via a first instance that reports low confidence."""
    case_id = file_case(vm, court, accounts["alice"], bond=bond)
    if contested:
        contest(vm, court, case_id, accounts["bob"], counter=counter)
    mock_evidence(vm)
    vm.mock_llm(LEADER_PROMPT, opinion(verdict="INFRINGING", overlap=60, confidence=40))
    court.adjudicate(case_id)
    assert case_of(court, case_id)["status"] == "ESCALATED"
    return case_id


def appeal(vm, court, case_id, appellant, fee=GEN, response=None, **kwargs):
    mock_archive(vm)
    vm.mock_llm(APPEAL_PROMPT, response if response is not None else opinion(**kwargs))
    vm.sender = appellant
    vm.value = fee
    court.appeal(case_id, ARCHIVE_URL)
    vm.value = 0
    return case_of(court, case_id)


# ------------------------------------------------------------------- admission


def test_a_case_that_was_decided_cannot_be_appealed(vm, court, accounts):
    """
    An appeal exists because the first instance said it could not decide — not
    because a party disliked a decision it could. Settled is final, and no payout
    is ever clawed back.
    """
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    contest(vm, court, case_id, accounts["bob"])
    mock_evidence(vm)
    vm.mock_llm(LEADER_PROMPT, opinion(verdict="INFRINGING", overlap=80, confidence=90))
    court.adjudicate(case_id)

    vm.sender = accounts["bob"]
    vm.value = GEN
    with rejects("only an escalated case may be appealed"):
        court.appeal(case_id, ARCHIVE_URL)
    vm.value = 0


def test_a_case_that_was_never_heard_cannot_be_appealed(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    vm.sender = accounts["alice"]
    vm.value = GEN
    with rejects("only an escalated case may be appealed"):
        court.appeal(case_id, ARCHIVE_URL)
    vm.value = 0


def test_only_a_party_may_appeal(vm, court, accounts):
    case_id = escalated_case(vm, court, accounts)
    vm.sender = accounts["carol"]
    vm.value = GEN
    with rejects("only a party to the case may appeal"):
        court.appeal(case_id, ARCHIVE_URL)
    vm.value = 0


def test_an_appeal_carries_a_fee(vm, court, accounts):
    case_id = escalated_case(vm, court, accounts)
    vm.sender = accounts["alice"]
    vm.value = 0
    with rejects("an appeal must carry a fee"):
        court.appeal(case_id, ARCHIVE_URL)


def test_the_corroborating_source_must_be_fetchable(vm, court, accounts):
    case_id = escalated_case(vm, court, accounts)
    vm.sender = accounts["alice"]
    vm.value = GEN
    with rejects("corroboration_url must be an http(s) URL"):
        court.appeal(case_id, "see attached email")
    vm.value = 0


def test_a_case_is_appealed_at_most_once(vm, court, accounts):
    case_id = escalated_case(vm, court, accounts)
    appeal(vm, court, case_id, accounts["alice"], verdict="INFRINGING", confidence=80)

    vm.sender = accounts["bob"]
    vm.value = GEN
    with rejects("only an escalated case may be appealed"):
        court.appeal(case_id, ARCHIVE_URL)
    vm.value = 0


# -------------------------------------------------------------------- outcomes


def test_an_upheld_appeal_pays_the_complainant_the_pot_including_the_fee(vm, court, accounts):
    case_id = escalated_case(vm, court, accounts, bond=2 * GEN, counter=2 * GEN)

    case = appeal(
        vm,
        court,
        case_id,
        accounts["alice"],
        fee=GEN,
        verdict="INFRINGING",
        overlap=74,
        confidence=84,
        publisher="ORIGIN",
    )

    assert case["status"] == "RESOLVED"
    assert case["instance"] == 2
    assert case["winner"] == accounts["alice"].as_hex
    assert case["payout"] == str(5 * GEN)
    assert court.get_withdrawable(accounts["alice"]) == str(5 * GEN)


def test_an_overturned_appeal_pays_the_respondent(vm, court, accounts):
    case_id = escalated_case(vm, court, accounts)

    case = appeal(
        vm,
        court,
        case_id,
        accounts["bob"],
        verdict="DERIVATIVE_FAIR",
        overlap=35,
        confidence=88,
        publisher="ORIGIN",
    )

    assert case["winner"] == accounts["bob"].as_hex
    assert court.get_withdrawable(accounts["bob"]) == str(3 * GEN)


def test_precedence_inverts_the_complaint_regardless_of_similarity(vm, court, accounts):
    """
    The appeal's whole reason for existing. The works ARE substantially similar and
    the adjudicator says so — but the corroborating source shows the accused work
    came first, so the complainant is not the wronged party, and similarity stops
    being the question.
    """
    case_id = escalated_case(vm, court, accounts)

    case = appeal(
        vm,
        court,
        case_id,
        accounts["bob"],
        verdict="INFRINGING",
        overlap=88,
        confidence=93,
        publisher="ACCUSED",
    )

    assert case["verdict"] == "INFRINGING"
    assert case["first_publisher"] == "ACCUSED"
    assert case["winner"] == accounts["bob"].as_hex
    assert court.get_withdrawable(accounts["alice"]) == "0"


def test_precedence_is_ignored_at_the_first_instance(vm, court, accounts):
    """
    The inversion only applies where the court actually looked for precedence. The
    first instance is asked for it opportunistically and must not act on it.
    """
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    contest(vm, court, case_id, accounts["bob"])
    mock_evidence(vm)
    vm.mock_llm(
        LEADER_PROMPT,
        opinion(verdict="INFRINGING", overlap=85, confidence=90, publisher="ACCUSED"),
    )
    court.adjudicate(case_id)

    case = case_of(court, case_id)
    assert case["first_publisher"] == "ACCUSED"
    assert case["winner"] == accounts["alice"].as_hex


def test_an_appeal_that_still_cannot_read_the_evidence_refunds_everyone(vm, court, accounts):
    """A court that cannot see the evidence has no business redistributing money."""
    case_id = escalated_case(vm, court, accounts, bond=2 * GEN, counter=3 * GEN)

    vm.clear_mocks()
    mock_archive(vm)  # only the archive is reachable now
    vm.mock_llm(APPEAL_PROMPT, opinion())
    vm.sender = accounts["bob"]
    vm.value = GEN
    court.appeal(case_id, ARCHIVE_URL)
    vm.value = 0

    case = case_of(court, case_id)
    assert case["status"] == "RESOLVED"
    assert case["verdict"] == "EVIDENCE_UNAVAILABLE"
    assert case["winner"] == "0x" + "0" * 40
    assert court.get_withdrawable(accounts["alice"]) == str(2 * GEN)
    # Bob gets his counter-bond back AND the appeal fee he paid, because he is the
    # one who paid it.
    assert court.get_withdrawable(accounts["bob"]) == str(4 * GEN)
    assert court.get_forfeited_pool() == "0"


def test_an_uncontested_case_can_still_be_appealed_by_the_complainant(vm, court, accounts):
    case_id = escalated_case(vm, court, accounts, bond=GEN, contested=False)

    case = appeal(
        vm, court, case_id, accounts["alice"], verdict="INFRINGING", overlap=70, confidence=85
    )

    assert case["winner"] == accounts["alice"].as_hex
    assert court.get_withdrawable(accounts["alice"]) == str(2 * GEN)


# ------------------------------------------------------- consensus at the appeal


def rerun_appeal_validator(vm, leader_opinion: str, validator_opinion: str) -> bool:
    vm.clear_mocks()
    mock_evidence(vm)
    mock_archive(vm)
    vm.mock_llm(APPEAL_PROMPT, validator_opinion)
    return vm.run_validator(leader_result=leader_opinion)


def test_the_appeal_validator_agrees_on_verdict_and_precedence(vm, court, accounts):
    case_id = escalated_case(vm, court, accounts)
    appeal(vm, court, case_id, accounts["alice"], verdict="INFRINGING", publisher="ORIGIN")

    agreed = rerun_appeal_validator(
        vm,
        opinion(verdict="INFRINGING", publisher="ORIGIN", overlap=80),
        opinion(
            verdict="INFRINGING",
            publisher="ORIGIN",
            overlap=41,
            confidence=62,
            reason="Different words, same finding; the snapshot predates the accused page.",
        ),
    )
    assert agreed is True


def test_the_appeal_validator_rejects_a_split_on_precedence(vm, court, accounts):
    """
    Two validators who agree the works are similar but disagree about who published
    first have agreed on the FACTS and split on the RESULT — because precedence is
    what decides this instance. That is not consensus.
    """
    case_id = escalated_case(vm, court, accounts)
    appeal(vm, court, case_id, accounts["alice"], verdict="INFRINGING", publisher="ORIGIN")

    agreed = rerun_appeal_validator(
        vm,
        opinion(verdict="INFRINGING", publisher="ORIGIN"),
        opinion(verdict="INFRINGING", publisher="ACCUSED"),
    )
    assert agreed is False


def test_the_appeal_validator_rejects_a_different_verdict(vm, court, accounts):
    case_id = escalated_case(vm, court, accounts)
    appeal(vm, court, case_id, accounts["alice"], verdict="INFRINGING", publisher="ORIGIN")

    agreed = rerun_appeal_validator(
        vm,
        opinion(verdict="INFRINGING", publisher="ORIGIN"),
        opinion(verdict="INDEPENDENT", publisher="ORIGIN"),
    )
    assert agreed is False


def test_the_appeal_is_written_into_the_case_provenance(vm, court, accounts):
    case_id = escalated_case(vm, court, accounts)
    appeal(vm, court, case_id, accounts["bob"], verdict="DERIVATIVE_FAIR", confidence=80)

    history = json.loads(court.get_history(case_id))
    kinds = [entry["kind"] for entry in history]
    assert kinds == ["filed", "contested", "first_instance", "escalated", "appeal", "settled"]

    appeal_entry = history[kinds.index("appeal")]
    assert appeal_entry["appellant"] == accounts["bob"].as_hex
    assert appeal_entry["corroboration_url"] == ARCHIVE_URL
    assert case_of(court, case_id)["appellant"] == accounts["bob"].as_hex
