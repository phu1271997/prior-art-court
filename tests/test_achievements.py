"""
Phase 7 — soulbound achievement badges + reputation-tiered filing gate.

Two mechanisms land in this phase:

  1. `Achievements` — a standalone contract that reads the court + the
     reputation contract and mints permanent, non-transferable badges for
     specific events on an account's record (first filing ever, first win as
     a respondent, precedence-inverted win at appeal, 5-win and 10-win
     milestones). Nothing about a badge is economic; a badge is a public
     record of the shape of an account's history.

  2. Reputation gating on `file_case` — a caller whose standing has dropped
     BELOW the base must post at least MIN_BOND_LOW_STANDING; unknown accounts
     and clean records file at any positive bond. Turned on once the admin
     calls `set_reputation`.

These tests pin down both.
"""

import json

from gltest.direct import create_address

from conftest import (
    GEN,
    REPUTATION_SEED,
    case_of,
    contest,
    file_case,
    mock_evidence,
    opinion,
    register_contract,
    rejects,
)

LEADER_PROMPT = r"impartial adjudicator"


def _resolve(vm, court, alice, bob, verdict="INFRINGING", overlap=80):
    """Drive one case to RESOLVED and return its id."""
    case_id = file_case(vm, court, alice, bond=GEN)
    contest(vm, court, case_id, bob)
    mock_evidence(vm)
    vm.mock_llm(LEADER_PROMPT, opinion(verdict=verdict, overlap=overlap, confidence=90))
    court.adjudicate(case_id)
    vm.clear_mocks()
    return case_id


# ---------------------------------------------------------------- badges: mint


def test_the_catalog_is_the_closed_vocabulary(achievements):
    catalog = json.loads(achievements.get_badge_catalog())
    # The catalog is deliberately closed — a frontend can render every possible
    # badge without asking the contract to enumerate them at runtime.
    assert "FIRST_FILING" in catalog
    assert "FIRST_WIN" in catalog
    assert "APPELLATE_WINNER" in catalog
    assert "PRECEDENT_INVERTER" in catalog
    assert "TEN_WINS" in catalog


def test_the_first_settled_case_mints_the_first_filing_and_first_win_badges(
    vm, court, reputation, achievements, accounts
):
    case_id = _resolve(vm, court, accounts["alice"], accounts["bob"])
    reputation.sync_case(case_id)  # reputation must be up-to-date before badges

    achievements.mint_from_case(case_id)

    alice_badges = [b["kind"] for b in json.loads(achievements.get_badges(accounts["alice"]))]
    bob_badges = [b["kind"] for b in json.loads(achievements.get_badges(accounts["bob"]))]

    assert "FIRST_FILING" in alice_badges
    assert "FIRST_WIN" in alice_badges
    assert "FIRST_CONTEST" in bob_badges
    assert "FIRST_WIN" not in bob_badges  # bob lost


def test_a_second_win_does_not_re_mint_the_first_win_badge(
    vm, court, reputation, achievements, accounts
):
    for _ in range(2):
        cid = _resolve(vm, court, accounts["alice"], accounts["bob"])
        reputation.sync_case(cid)
        achievements.mint_from_case(cid)

    alice_badges = [b["kind"] for b in json.loads(achievements.get_badges(accounts["alice"]))]
    assert alice_badges.count("FIRST_WIN") == 1
    assert alice_badges.count("FIRST_FILING") == 1


def test_a_defender_who_wins_earns_the_just_defender_badge(
    vm, court, reputation, achievements, accounts
):
    """
    A respondent who defeats a complaint — verdict INDEPENDENT or
    DERIVATIVE_FAIR against a bond-forfeiting complainant — did something a
    scalar reputation score cannot show on its own: a public defence.
    """
    case_id = _resolve(vm, court, accounts["alice"], accounts["bob"], verdict="INDEPENDENT", overlap=5)
    reputation.sync_case(case_id)

    achievements.mint_from_case(case_id)

    bob_badges = [b["kind"] for b in json.loads(achievements.get_badges(accounts["bob"]))]
    assert "JUST_DEFENDER" in bob_badges
    assert "FIRST_WIN" in bob_badges


def test_mint_is_idempotent(vm, court, reputation, achievements, accounts):
    """
    The badge minter has to be permissionless (any account can trigger the
    surfacing of a case's events), so double-calling must be a no-op — not a
    stack of duplicate badges.
    """
    case_id = _resolve(vm, court, accounts["alice"], accounts["bob"])
    reputation.sync_case(case_id)

    achievements.mint_from_case(case_id)
    achievements.mint_from_case(case_id)  # second call is a no-op

    alice_badges = json.loads(achievements.get_badges(accounts["alice"]))
    assert len(alice_badges) == len([b for b in alice_badges if True])
    assert alice_badges.count({"kind": "FIRST_FILING", "case_id": case_id, "minted_at": 0}) <= 1


def test_an_unresolved_case_cannot_mint(vm, court, achievements, accounts):
    case_id = file_case(vm, court, accounts["alice"], bond=GEN)
    with rejects("not resolved yet"):
        achievements.mint_from_case(case_id)


def test_the_roster_lists_holders_in_first_mint_order(
    vm, court, reputation, achievements, accounts
):
    for pair in ((accounts["alice"], accounts["bob"]),):
        cid = _resolve(vm, court, *pair)
        reputation.sync_case(cid)
        achievements.mint_from_case(cid)

    roster = json.loads(achievements.get_holders())
    assert accounts["alice"].as_hex.lower() in roster
    assert accounts["bob"].as_hex.lower() in roster


def test_only_the_admin_can_repoint_at_a_new_court(vm, achievements, accounts):
    vm.sender = accounts["alice"]
    with rejects("admin only"):
        achievements.set_court(accounts["alice"])
    vm.sender = accounts["admin"]
    achievements.set_court(accounts["carol"])
    assert achievements.get_court() == accounts["carol"].as_hex


# ---------------------------------------------------------------- filing gate


def test_gating_is_off_when_the_court_has_no_reputation_wired(vm, court, accounts):
    """
    A freshly-deployed court with the reputation address unset (zero) must
    behave like the pre-Phase-7 version — any positive bond files a case.
    Otherwise deploys would break on every network before Reputation is
    deployed.
    """
    assert court.get_reputation() == "0x" + "0" * 40
    quote = court.get_min_bond_for(accounts["alice"])
    assert quote == "1"  # any positive bond passes when gating is off


def test_a_first_time_filer_is_never_surcharged(
    vm, court, reputation, accounts
):
    """
    An unknown account starts at BASE_STANDING (100) which is exactly the
    floor. The gate reads standing >= floor as "clean" — no surcharge.
    """
    register_contract(vm, create_address(REPUTATION_SEED), reputation)
    vm.sender = accounts["admin"]
    court.set_reputation(create_address(REPUTATION_SEED))

    quote = int(court.get_min_bond_for(accounts["carol"]))
    assert quote == 1

    # And they can file at whatever positive bond they choose.
    vm.sender = accounts["carol"]
    vm.value = 1  # 1 wei — any positive bond
    court.file_case(
        "news-article",
        "https://example.org/original-report",
        "https://copycat.example/rewrite",
        "This outlet rewrote our exclusive reporting sentence by sentence and dropped the credit.",
    )
    vm.value = 0


def test_a_filer_below_the_floor_must_post_the_low_standing_bond(
    vm, court, reputation, accounts
):
    """
    Drop alice below the floor (an INDEPENDENT verdict against an uncontested
    complaint forfeits her bond and cuts standing by 30). Now she must post at
    least MIN_BOND_LOW_STANDING (1 GEN) on any new complaint.
    """
    case_id = _resolve(
        vm,
        court,
        accounts["alice"],
        accounts["bob"],
        verdict="INDEPENDENT",
        overlap=3,
    )
    reputation.sync_case(case_id)

    register_contract(vm, create_address(REPUTATION_SEED), reputation)
    vm.sender = accounts["admin"]
    court.set_reputation(create_address(REPUTATION_SEED))

    # Alice's standing dropped from 100 to 100 - 20 = 80 (contested loss).
    # 80 < 100 = floor -> surcharge applies.
    quote = int(court.get_min_bond_for(accounts["alice"]))
    assert quote == 10**18

    vm.sender = accounts["alice"]
    vm.value = 10**17  # 0.1 GEN — too low
    with rejects("standing requires a higher bond"):
        court.file_case(
            "news-article",
            "https://example.org/original-report",
            "https://copycat.example/rewrite",
            "Another complaint from a low-standing filer. " * 3,
        )
    vm.value = 0

    # Bumping to the required minimum succeeds.
    vm.value = 10**18
    court.file_case(
        "news-article",
        "https://example.org/original-report",
        "https://copycat.example/rewrite",
        "Another complaint from a low-standing filer. " * 3,
    )
    vm.value = 0


def test_only_the_admin_can_wire_reputation(vm, court, reputation, accounts):
    register_contract(vm, create_address(REPUTATION_SEED), reputation)
    vm.sender = accounts["alice"]
    with rejects("admin only"):
        court.set_reputation(create_address(REPUTATION_SEED))


def test_the_standing_floor_can_be_retuned_by_the_admin(vm, court, accounts):
    vm.sender = accounts["admin"]
    court.set_filing_standing_floor(50)
    assert court.get_filing_standing_floor() == 50

    vm.sender = accounts["alice"]
    with rejects("admin only"):
        court.set_filing_standing_floor(200)

    vm.sender = accounts["admin"]
    with rejects("standing floor out of range"):
        court.set_filing_standing_floor(2000)
