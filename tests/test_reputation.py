"""
Standing — derived from decided cases only, and pulled rather than pushed.

Nothing in the court calls this contract. It reads settled cases back out and
folds them into a permanent record, which is why a settlement can never be left
half-applied by a reputation write that did not land.
"""

import json

from conftest import (
    GEN,
    contest,
    file_case,
    mock_evidence,
    opinion,
    rejects,
)

LEADER_PROMPT = r"impartial adjudicator"


def decide(vm, court, accounts, verdict="INFRINGING", contested=True, **kwargs):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    if contested:
        contest(vm, court, case_id, accounts["bob"])
    mock_evidence(vm)
    vm.mock_llm(
        LEADER_PROMPT, opinion(verdict=verdict, overlap=kwargs.get("overlap", 80), confidence=90)
    )
    court.adjudicate(case_id)
    return case_id


def standing(reputation, account) -> dict:
    return json.loads(reputation.get_standing(account))


def test_an_unknown_party_starts_at_the_base_standing(reputation, accounts):
    record = standing(reputation, accounts["carol"])
    assert record["standing"] == 100
    assert record["filed"] == 0


def test_a_won_case_credits_the_complainant_and_debits_the_respondent(
    vm, court, reputation, accounts
):
    case_id = decide(vm, court, accounts, verdict="INFRINGING")
    reputation.sync_case(case_id)

    alice = standing(reputation, accounts["alice"])
    bob = standing(reputation, accounts["bob"])

    assert (alice["filed"], alice["won"], alice["lost"]) == (1, 1, 0)
    assert alice["standing"] == 115
    assert (bob["contested"], bob["won"], bob["lost"]) == (1, 0, 1)
    assert bob["standing"] == 80


def test_a_successful_defence_credits_the_respondent(vm, court, reputation, accounts):
    case_id = decide(vm, court, accounts, verdict="INDEPENDENT", overlap=5)
    reputation.sync_case(case_id)

    assert standing(reputation, accounts["bob"])["won"] == 1
    assert standing(reputation, accounts["alice"])["lost"] == 1


def test_a_forfeited_complaint_is_recorded_as_such(vm, court, reputation, accounts):
    """
    Filing rubbish nobody bothered to contest is its own category, and it costs
    more standing than losing a real fight.
    """
    case_id = decide(vm, court, accounts, verdict="INDEPENDENT", overlap=3, contested=False)
    reputation.sync_case(case_id)

    alice = standing(reputation, accounts["alice"])
    assert (alice["filed"], alice["forfeited"], alice["lost"]) == (1, 1, 0)
    assert alice["standing"] == 70


def test_an_unreadable_case_is_nobodys_fault(vm, court, reputation, accounts):
    """Punishing a party for a dead link would make standing a measure of luck."""
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    contest(vm, court, case_id, accounts["bob"])
    # Neither exhibit is reachable, so the first instance escalates; drive it to a
    # final EVIDENCE_UNAVAILABLE through the appeal.
    court.adjudicate(case_id)
    vm.mock_web(r"archive\.example/", {"method": "GET", "status": 200, "body": "snapshot " * 40})
    vm.mock_llm(r"FINAL instance", opinion())
    vm.sender = accounts["alice"]
    vm.value = GEN
    court.appeal(case_id, "https://archive.example/snapshot/original-report")
    vm.value = 0

    reputation.sync_case(case_id)

    alice = standing(reputation, accounts["alice"])
    bob = standing(reputation, accounts["bob"])
    assert alice["undecided"] == 1 and alice["won"] == 0 and alice["lost"] == 0
    assert bob["undecided"] == 1 and bob["won"] == 0 and bob["lost"] == 0
    assert alice["standing"] == 100 and bob["standing"] == 100


def test_an_undecided_case_cannot_be_recorded(vm, court, reputation, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    with rejects("case is not resolved yet"):
        reputation.sync_case(case_id)


def test_a_case_is_recorded_once(vm, court, reputation, accounts):
    case_id = decide(vm, court, accounts)
    reputation.sync_case(case_id)

    with rejects("case already recorded"):
        reputation.sync_case(case_id)

    assert reputation.get_synced_count() == 1
    assert reputation.is_synced(case_id) is True


def test_sync_recent_folds_what_is_ready_and_skips_what_is_not(vm, court, reputation, accounts):
    first = decide(vm, court, accounts, verdict="INFRINGING")
    second = decide(vm, court, accounts, verdict="INDEPENDENT", overlap=2)
    pending = file_case(vm, court, accounts["carol"], bond=GEN)

    reputation.sync_recent(10)

    assert reputation.is_synced(first) is True
    assert reputation.is_synced(second) is True
    assert reputation.is_synced(pending) is False
    assert reputation.get_synced_count() == 2

    # Running it again is a no-op rather than a double count.
    reputation.sync_recent(10)
    assert reputation.get_synced_count() == 2


def test_the_leaderboard_ranks_by_standing(vm, court, reputation, accounts):
    reputation.sync_case(decide(vm, court, accounts, verdict="INFRINGING"))
    reputation.sync_case(decide(vm, court, accounts, verdict="INFRINGING"))

    board = json.loads(reputation.get_leaderboard(0))
    assert [row["address"] for row in board] == [
        accounts["alice"].as_hex.lower(),
        accounts["bob"].as_hex.lower(),
    ]
    assert board[0]["standing"] == 130
    assert board[1]["standing"] == 60

    assert len(json.loads(reputation.get_leaderboard(1))) == 1


def test_only_the_admin_may_repoint_at_a_redeployed_court(vm, reputation, accounts):
    vm.sender = accounts["alice"]
    with rejects("admin only"):
        reputation.set_court(accounts["alice"])

    vm.sender = accounts["admin"]
    reputation.set_court(accounts["carol"])
    assert reputation.get_court() == accounts["carol"].as_hex
