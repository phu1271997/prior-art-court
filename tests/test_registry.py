"""
The prior-art registry — timestamped defensive publications.

The registry is the proactive half of the court: an author registers a work and
the consensus clock stamps it, so a later dispute that turns on which work came
first has dated, hard-to-forge on-chain evidence to read. These tests pin down
that a registration is stored and timestamped, that a URL can only be claimed
once (no back-dating), that unknown categories and bad URLs are refused, and that
the registry record actually reaches the adjudicator at hearing time (proved by
keying the LLM mock to the registry block itself).
"""

import json

from conftest import (
    ORIGIN_URL,
    case_of,
    file_case,
    mock_evidence,
    opinion,
    rejects,
)

LEADER_PROMPT = r"impartial adjudicator"


def test_a_registration_is_stored_and_timestamped(vm, court, accounts):
    assert court.get_registration_count() == 0

    vm.sender = accounts["alice"]
    court.register_work("news-article", ORIGIN_URL, "deadbeef", "My original report")

    assert court.get_registration_count() == 1
    rows = json.loads(court.get_registrations(0))
    assert len(rows) == 1
    rec = rows[0]
    assert rec["url"] == ORIGIN_URL
    assert rec["author"] == accounts["alice"].as_hex
    assert rec["title"] == "My original report"
    assert rec["registered_at"]  # the consensus clock stamped it
    assert rec["registration_id"] == 0


def test_a_url_can_only_be_registered_once(vm, court, accounts):
    vm.sender = accounts["alice"]
    court.register_work("news-article", ORIGIN_URL, "", "First claim")

    # A second registration of the same URL — even by the same author — is refused,
    # so an earlier record cannot be superseded or back-dated.
    vm.sender = accounts["bob"]
    with rejects("court: this URL is already registered"):
        court.register_work("news-article", ORIGIN_URL, "", "Late claim")


def test_lookup_by_url(vm, court, accounts):
    vm.sender = accounts["alice"]
    court.register_work("news-article", ORIGIN_URL, "abc123", "Report")

    hit = json.loads(court.get_registration_for(ORIGIN_URL))
    assert hit is not None
    assert hit["content_hash"] == "abc123"

    miss = json.loads(court.get_registration_for("https://nowhere.example/x"))
    assert miss is None


def test_an_unknown_category_is_refused(vm, court, accounts):
    vm.sender = accounts["alice"]
    with rejects("policy: unknown category"):
        court.register_work("no-such-doctrine", ORIGIN_URL, "", "x")


def test_a_non_http_url_is_refused(vm, court, accounts):
    vm.sender = accounts["alice"]
    with rejects("court: url must be an http(s) URL"):
        court.register_work("news-article", "ftp://example.org/x", "", "x")


def test_the_registry_record_reaches_the_adjudicator(vm, court, accounts):
    # Register the original work, then hear a case about it.
    vm.sender = accounts["alice"]
    court.register_work("news-article", ORIGIN_URL, "deadbeef", "Registered original")

    case_id = file_case(vm, court, accounts["alice"])
    mock_evidence(vm)
    # This mock ONLY matches a prompt that actually carries the registry block for
    # the origin exhibit. If the record never reached the prompt, no mock matches
    # and adjudicate fails loudly under strict mocks — which is the assertion.
    vm.mock_llm(
        r"EXHIBIT ORIGIN is REGISTERED",
        opinion(verdict="INFRINGING", overlap=80, confidence=90, publisher="ORIGIN"),
    )
    court.adjudicate(case_id)

    case = case_of(court, case_id)
    assert case["verdict"] == "INFRINGING"

    # And the court recorded which registry records it consulted.
    history = json.loads(court.get_history(case_id))
    first = [h for h in history if h.get("kind") == "first_instance"][0]
    assert first["registry_consulted"] == [0]
