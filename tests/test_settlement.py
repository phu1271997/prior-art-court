"""
The mediation & settlement track — the pre-trial path a real court leans on.

Two parties who have both staked can end a case between themselves by agreeing
how to split the pot, without ever burning a hearing. A GenLayer-native MEDIATOR
can propose a fair split first — but its number is advisory: money only moves
when both parties accept. These tests pin down that a settlement pays exactly the
agreed split, that it is gated to the two parties and to the pre-trial window,
that a settlement is NOT precedent, and that the mediator records a recommendation
without moving anything on its own.
"""

import json

from conftest import (
    GEN,
    case_of,
    contest,
    file_case,
    mock_evidence,
    opinion,
)

LEADER_PROMPT = r"impartial adjudicator"
MEDIATOR_PROMPT = r"sitting as a MEDIATOR"


def mediation(share=60, lean="DERIVATIVE_FAIR", reason="A partial, arguable overlap — split near the middle."):
    """A well-formed mediator response for mocking the LLM."""
    return json.dumps({
        "lean": lean,
        "verdict": lean,
        "complainant_share": share,
        "reason": reason,
    })


def contested(vm, court, accounts, bond=GEN, counter=GEN):
    cid = file_case(vm, court, accounts["alice"], bond=bond)
    contest(vm, court, cid, accounts["bob"], counter=counter)
    return cid


# ------------------------------------------------------------- settling by agreement


def test_a_settlement_pays_exactly_the_agreed_split(vm, court, accounts):
    cid = contested(vm, court, accounts, bond=GEN, counter=GEN)  # 2 GEN pot

    vm.sender = accounts["alice"]
    court.propose_settlement(cid, 60)
    vm.sender = accounts["bob"]
    court.accept_settlement(cid)

    case = case_of(court, cid)
    assert case["status"] == "RESOLVED"
    assert case["resolution"] == "MEDIATED"
    assert case["verdict"] == ""  # nobody was found to have infringed
    # 60% of a 2 GEN pot to the complainant, the rest to the respondent.
    assert court.get_withdrawable(accounts["alice"]) == str(120 * GEN // 100)
    assert court.get_withdrawable(accounts["bob"]) == str(80 * GEN // 100)


def test_a_settlement_conserves_the_pot_exactly(vm, court, accounts):
    cid = contested(vm, court, accounts, bond=GEN, counter=3 * GEN)  # 4 GEN pot, odd split

    vm.sender = accounts["bob"]
    court.propose_settlement(cid, 33)
    vm.sender = accounts["alice"]
    court.accept_settlement(cid)

    alice = int(court.get_withdrawable(accounts["alice"]))
    bob = int(court.get_withdrawable(accounts["bob"]))
    # The remainder rule (respondent gets the rest) means not a wei is minted or lost.
    assert alice + bob == 4 * GEN


def test_a_mediated_settlement_is_not_precedent(vm, court, accounts):
    cid = contested(vm, court, accounts)
    vm.sender = accounts["alice"]
    court.propose_settlement(cid, 50)
    vm.sender = accounts["bob"]
    court.accept_settlement(cid)

    # The parties bargained; the court decided nothing, so nothing enters case law.
    assert court.get_precedent_count("news-article") == 0


# ----------------------------------------------------------------------- guards


def test_only_a_contested_case_can_be_settled(vm, court, accounts):
    cid = file_case(vm, court, accounts["alice"])  # FILED, never contested
    vm.sender = accounts["alice"]
    try:
        court.propose_settlement(cid, 50)
        assert False, "expected a refusal"
    except AssertionError as e:
        assert "only a contested case may be settled before trial" in str(e)


def test_the_proposer_cannot_accept_their_own_offer(vm, court, accounts):
    cid = contested(vm, court, accounts)
    vm.sender = accounts["alice"]
    court.propose_settlement(cid, 70)
    try:
        court.accept_settlement(cid)
        assert False, "expected a refusal"
    except AssertionError as e:
        assert "proposer cannot accept their own settlement" in str(e)


def test_a_bystander_cannot_propose_or_accept(vm, court, accounts):
    cid = contested(vm, court, accounts)
    vm.sender = accounts["carol"]
    try:
        court.propose_settlement(cid, 50)
        assert False, "expected a refusal"
    except AssertionError as e:
        assert "only a party to the case may propose a settlement" in str(e)


def test_a_share_over_100_is_refused(vm, court, accounts):
    cid = contested(vm, court, accounts)
    vm.sender = accounts["alice"]
    try:
        court.propose_settlement(cid, 140)
        assert False, "expected a refusal"
    except AssertionError as e:
        assert "complainant_share must be between 0 and 100" in str(e)


def test_a_rejected_proposal_cannot_be_accepted(vm, court, accounts):
    cid = contested(vm, court, accounts)
    vm.sender = accounts["alice"]
    court.propose_settlement(cid, 70)
    vm.sender = accounts["bob"]
    court.reject_settlement(cid)
    try:
        court.accept_settlement(cid)
        assert False, "expected a refusal"
    except AssertionError as e:
        assert "there is no proposal to accept" in str(e)


def test_a_case_cannot_be_settled_after_it_has_been_heard(vm, court, accounts):
    cid = contested(vm, court, accounts)
    mock_evidence(vm)
    # Low confidence sends the case to appeal — it has been heard, and the pot now
    # carries a finding, so the pre-trial settlement window is closed.
    vm.mock_llm(LEADER_PROMPT, opinion(verdict="INFRINGING", overlap=80, confidence=50))
    court.adjudicate(cid)
    assert case_of(court, cid)["status"] == "ESCALATED"

    vm.sender = accounts["alice"]
    try:
        court.propose_settlement(cid, 50)
        assert False, "expected a refusal"
    except AssertionError as e:
        assert "only a contested case may be settled before trial" in str(e)


# --------------------------------------------------------------------- mediator


def test_the_mediator_records_a_recommendation_without_moving_money(vm, court, accounts):
    cid = contested(vm, court, accounts)
    mock_evidence(vm)
    vm.mock_llm(MEDIATOR_PROMPT, mediation(share=65, lean="DERIVATIVE_FAIR"))

    vm.sender = accounts["alice"]
    court.request_mediation(cid)

    case = case_of(court, cid)
    assert case["mediation_share"] == 65
    assert case["mediation_reason"]
    assert case["status"] == "CONTESTED"  # still open; nothing moved
    assert court.get_withdrawable(accounts["alice"]) == "0"
    assert court.get_withdrawable(accounts["bob"]) == "0"


def test_the_mediator_leaves_no_recommendation_when_the_evidence_is_unreadable(vm, court, accounts):
    cid = contested(vm, court, accounts)
    # A page under MIN_EVIDENCE_CHARS reads as no evidence.
    mock_evidence(vm, origin="too short", accused="also short")
    vm.mock_llm(MEDIATOR_PROMPT, mediation())

    vm.sender = accounts["bob"]
    court.request_mediation(cid)

    case = case_of(court, cid)
    assert case["mediation_share"] == 255  # sentinel: the mediator did not run to a number


def test_parties_can_settle_on_the_mediators_number(vm, court, accounts):
    cid = contested(vm, court, accounts)  # 2 GEN pot
    mock_evidence(vm)
    vm.mock_llm(MEDIATOR_PROMPT, mediation(share=75, lean="INFRINGING"))

    vm.sender = accounts["alice"]
    court.request_mediation(cid)
    share = case_of(court, cid)["mediation_share"]
    court.propose_settlement(cid, share)
    vm.sender = accounts["bob"]
    court.accept_settlement(cid)

    assert court.get_withdrawable(accounts["alice"]) == str(150 * GEN // 100)
    assert court.get_withdrawable(accounts["bob"]) == str(50 * GEN // 100)
