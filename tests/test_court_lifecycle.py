"""
The parts of the court that hold money and do not think.

Everything here is deterministic: filing, contesting, withdrawing, and pulling a
payout. These are the paths an attacker reaches first, so they are guarded first.
"""

import json

from conftest import (
    ACCUSED_URL,
    CLAIM,
    GEN,
    ORIGIN_URL,
    case_of,
    contest,
    file_case,
    rejects,
)


def test_filing_records_the_complaint_and_escrows_the_bond(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=3 * GEN)

    case = case_of(court, case_id)
    assert case["status"] == "FILED"
    assert case["complainant"] == accounts["alice"].as_hex
    assert case["respondent"] == "0x" + "0" * 40
    assert case["bond"] == str(3 * GEN)
    assert case["origin_url"] == ORIGIN_URL
    assert case["accused_url"] == ACCUSED_URL
    assert case["instance"] == 0
    assert court.get_case_count() == 1

    history = json.loads(court.get_history(case_id))
    assert [entry["kind"] for entry in history] == ["filed"]
    assert history[0]["doctrine_revision"] == 1


def test_a_free_complaint_is_refused(vm, court, accounts):
    """The bond IS the spam defence — every adjudication costs the whole validator set."""
    vm.sender = accounts["alice"]
    vm.value = 0
    with rejects("bond must be greater than zero"):
        court.file_case("news-article", ORIGIN_URL, ACCUSED_URL, CLAIM)


def test_a_category_with_no_doctrine_cannot_be_litigated(vm, court, accounts):
    vm.sender = accounts["alice"]
    vm.value = GEN
    with rejects("no doctrine for this category"):
        court.file_case("photography", ORIGIN_URL, ACCUSED_URL, CLAIM)
    vm.value = 0


def test_urls_must_be_fetchable_and_distinct(vm, court, accounts):
    vm.sender = accounts["alice"]
    vm.value = GEN

    with rejects("origin_url must be an http(s) URL"):
        court.file_case("news-article", "ftp://example.org/a", ACCUSED_URL, CLAIM)

    with rejects("accused_url must be an http(s) URL"):
        court.file_case("news-article", ORIGIN_URL, "javascript:void(0)", CLAIM)

    with rejects("both URLs point at the same page"):
        court.file_case("news-article", ORIGIN_URL, ORIGIN_URL.upper(), CLAIM)

    vm.value = 0


def test_a_complaint_must_actually_state_something(vm, court, accounts):
    vm.sender = accounts["alice"]
    vm.value = GEN
    with rejects("claim_text too thin"):
        court.file_case("news-article", ORIGIN_URL, ACCUSED_URL, "they copied us")
    vm.value = 0


def test_contesting_requires_matching_the_bond(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=5 * GEN)

    vm.sender = accounts["bob"]
    vm.value = 2 * GEN
    with rejects("counter-bond must at least match"):
        court.contest_case(case_id)
    vm.value = 0

    contest(vm, court, case_id, accounts["bob"], counter=5 * GEN)
    case = case_of(court, case_id)
    assert case["status"] == "CONTESTED"
    assert case["respondent"] == accounts["bob"].as_hex
    assert case["counter_bond"] == str(5 * GEN)


def test_the_complainant_cannot_contest_their_own_case(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"])
    vm.sender = accounts["alice"]
    vm.value = GEN
    with rejects("cannot contest their own case"):
        court.contest_case(case_id)
    vm.value = 0


def test_a_case_can_only_be_contested_once(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"])
    contest(vm, court, case_id, accounts["bob"])

    vm.sender = accounts["carol"]
    vm.value = GEN
    with rejects("no longer open for contest"):
        court.contest_case(case_id)
    vm.value = 0


def test_an_unknown_case_is_not_silently_created(vm, court, accounts):
    vm.sender = accounts["bob"]
    vm.value = GEN
    with rejects("unknown case"):
        court.contest_case(99)
    vm.value = 0


def test_withdrawing_an_uncontested_case_returns_the_bond(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=2 * GEN)

    vm.sender = accounts["alice"]
    court.withdraw_case(case_id)

    assert case_of(court, case_id)["status"] == "WITHDRAWN"
    assert court.get_withdrawable(accounts["alice"]) == str(2 * GEN)


def test_a_contested_case_cannot_be_withdrawn(vm, court, accounts):
    """Otherwise a complainant could bait a counter-bond and then walk away."""
    case_id = file_case(vm, court, accounts["alice"])
    contest(vm, court, case_id, accounts["bob"])

    vm.sender = accounts["alice"]
    with rejects("only an uncontested case may be withdrawn"):
        court.withdraw_case(case_id)


def test_only_the_complainant_may_withdraw(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"])
    vm.sender = accounts["bob"]
    with rejects("complainant only"):
        court.withdraw_case(case_id)


def test_withdraw_pays_out_once_and_zeroes_the_balance(vm, court, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=2 * GEN)
    vm.sender = accounts["alice"]
    court.withdraw_case(case_id)

    court.withdraw()

    assert vm._transfers == [
        {"to": accounts["alice"].as_hex, "value": 2 * GEN, "on": "accepted"}
    ]
    assert court.get_withdrawable(accounts["alice"]) == "0"

    with rejects("nothing to withdraw"):
        court.withdraw()


def test_an_account_owed_nothing_cannot_withdraw(vm, court, accounts):
    vm.sender = accounts["carol"]
    with rejects("nothing to withdraw"):
        court.withdraw()


def test_the_party_index_lists_both_sides(vm, court, accounts):
    first = file_case(vm, court, accounts["alice"])
    second = file_case(vm, court, accounts["alice"])
    contest(vm, court, first, accounts["bob"])

    alice_cases = json.loads(court.get_cases_for(accounts["alice"]))
    bob_cases = json.loads(court.get_cases_for(accounts["bob"]))

    assert [case["case_id"] for case in alice_cases] == [first, second]
    assert [case["case_id"] for case in bob_cases] == [first]
    assert json.loads(court.get_cases_for(accounts["carol"])) == []


def test_the_docket_reads_newest_first(vm, court, accounts):
    file_case(vm, court, accounts["alice"])
    file_case(vm, court, accounts["carol"])

    newest = json.loads(court.get_cases(1))
    assert [case["case_id"] for case in newest] == [1]

    everything = json.loads(court.get_cases(0))
    assert [case["case_id"] for case in everything] == [1, 0]


def test_the_registry_address_survives_any_encoding(vm, registry, accounts):
    """
    Studio's deploy form hands a hex literal through as an integer, the SDK sends
    an Address, and a hand-written call may send a string. All three name the same
    contract, so all three must deploy.
    """
    from gltest.direct import create_address

    from conftest import REGISTRY_SEED, deploy

    expected = create_address(REGISTRY_SEED)
    vm.sender = accounts["admin"]

    for encoding in (int(expected.as_hex, 16), expected.as_hex, expected):
        instance = deploy(vm, "contract.py", encoding)
        assert instance.get_policy_registry() == expected.as_hex
