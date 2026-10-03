"""
The prior-art registry — timestamped defensive publications.

The registry is the proactive half of the court: an author registers a work and
the consensus clock stamps it, so a later dispute that turns on which work came
first has dated, hard-to-forge on-chain evidence to read.

A timestamp alone is worthless if the page behind the URL can be swapped after
the fact, so each registration is bound to the CONTENT fetched at registration
time (a fingerprint), and that binding is re-verified against the live exhibit
at hearing time. These tests pin down that a registration is stored and
timestamped, that a URL can only be claimed once (no back-dating), that unknown
categories and bad URLs are refused, that the record reaches the adjudicator as
VERIFIED evidence, and — the two regressions the reviewer asked for — that
replaced URL content and an otherwise-unverified registration are NOT used as
publication evidence.
"""

import json

from conftest import (
    EXHIBIT_A,
    EXHIBIT_B,
    ORIGIN_URL,
    ACCUSED_URL,
    _fnv1a_64,
    case_of,
    file_case,
    mock_evidence,
    opinion,
    rejects,
)

import pytest

LEADER_PROMPT = r"impartial adjudicator"

# A long replacement body, distinct from EXHIBIT_A, served AFTER a registration
# was bound — this is the "page swapped after the stamp" attack.
REPLACED_BODY = (
    "This page has been quietly rewritten long after it was registered. None of "
    "the originally fingerprinted sentences survive; the text now makes entirely "
    "different claims about an unrelated matter, which is exactly why the court "
    "must refuse to treat the stale timestamp as proof of this new content. " * 3
)


def _fingerprint(text: str) -> str:
    """Mirror of the contract's _content_fingerprint for assertions."""
    return format(_fnv1a_64((text or "").strip()), "016x")


def test_a_registration_is_stored_and_timestamped(vm, court, accounts):
    assert court.get_registration_count() == 0

    mock_evidence(vm)  # the page must be fetchable — the binding fetches it
    vm.sender = accounts["alice"]
    court.register_work("news-article", ORIGIN_URL, "ignored-caller-hash", "My original report")

    assert court.get_registration_count() == 1
    rows = json.loads(court.get_registrations(0))
    assert len(rows) == 1
    rec = rows[0]
    assert rec["url"] == ORIGIN_URL
    assert rec["author"] == accounts["alice"].as_hex
    assert rec["title"] == "My original report"
    assert rec["registered_at"]  # the consensus clock stamped it
    assert rec["registration_id"] == 0
    # The stored hash is the fingerprint of the FETCHED content, not the caller's.
    assert rec["content_hash"] == _fingerprint(EXHIBIT_A)


def test_a_url_can_only_be_registered_once(vm, court, accounts):
    mock_evidence(vm)
    vm.sender = accounts["alice"]
    court.register_work("news-article", ORIGIN_URL, "", "First claim")

    # A second registration of the same URL — even by the same author — is refused,
    # so an earlier record cannot be superseded or back-dated.
    vm.sender = accounts["bob"]
    with rejects("court: this URL is already registered"):
        court.register_work("news-article", ORIGIN_URL, "", "Late claim")


def test_lookup_by_url(vm, court, accounts):
    mock_evidence(vm)
    vm.sender = accounts["alice"]
    court.register_work("news-article", ORIGIN_URL, "", "Report")

    hit = json.loads(court.get_registration_for(ORIGIN_URL))
    assert hit is not None
    # Bound to the fetched content, not a caller string.
    assert hit["content_hash"] == _fingerprint(EXHIBIT_A)

    miss = json.loads(court.get_registration_for("https://nowhere.example/x"))
    assert miss is None


def test_a_registration_needs_fetchable_content_to_bind(vm, court, accounts):
    """With no reachable page there is nothing to bind the timestamp to, so the
    registration is refused rather than stored as an empty, unverifiable claim."""
    vm.sender = accounts["alice"]  # no web mock registered → fetch fails
    with rejects("could not fetch enough content to bind"):
        court.register_work("news-article", ORIGIN_URL, "", "No page")


def test_an_unknown_category_is_refused(vm, court, accounts):
    vm.sender = accounts["alice"]
    with rejects("policy: unknown category"):
        court.register_work("no-such-doctrine", ORIGIN_URL, "", "x")


def test_a_non_http_url_is_refused(vm, court, accounts):
    vm.sender = accounts["alice"]
    with rejects("court: url must be an http(s) URL"):
        court.register_work("news-article", "ftp://example.org/x", "", "x")


def test_the_registry_record_reaches_the_adjudicator_as_verified(vm, court, accounts):
    # Register the original work (binds to the live content), then hear a case.
    mock_evidence(vm)
    vm.sender = accounts["alice"]
    court.register_work("news-article", ORIGIN_URL, "", "Registered original")

    case_id = file_case(vm, court, accounts["alice"])
    mock_evidence(vm)
    # This mock ONLY matches a prompt that carries the registry block as
    # CONTENT-VERIFIED for the origin exhibit. The live page still matches the
    # bound fingerprint, so the record is presented as valid dated evidence.
    vm.mock_llm(
        r"EXHIBIT ORIGIN is REGISTERED and CONTENT-VERIFIED",
        opinion(verdict="INFRINGING", overlap=80, confidence=90, publisher="ORIGIN"),
    )
    court.adjudicate(case_id)

    case = case_of(court, case_id)
    assert case["verdict"] == "INFRINGING"

    history = json.loads(court.get_history(case_id))
    first = [h for h in history if h.get("kind") == "first_instance"][0]
    assert first["registry_consulted"] == [0]


# --------------------------------------------------- content-binding regressions

def test_replaced_content_makes_the_registration_unverified(vm, court, accounts):
    """Register a page, then swap its content. At hearing the bound fingerprint
    no longer matches, so the record is handed to the adjudicator as UNVERIFIED
    — the stale timestamp cannot launder the new content into dated evidence."""
    mock_evidence(vm)
    vm.sender = accounts["alice"]
    court.register_work("news-article", ORIGIN_URL, "", "Registered original")

    case_id = file_case(vm, court, accounts["alice"])

    # The page behind ORIGIN_URL is rewritten after the stamp.
    vm.clear_mocks()
    mock_evidence(vm, origin=REPLACED_BODY)  # ORIGIN -> replaced, ACCUSED -> EXHIBIT_B

    # Mock only fires on a prompt that marks the registration UNVERIFIED.
    vm.mock_llm(
        r"NO LONGER\s+MATCHES",
        opinion(verdict="INDEPENDENT", overlap=10, confidence=85, publisher="ACCUSED"),
    )
    court.adjudicate(case_id)

    case = case_of(court, case_id)
    assert case["verdict"] == "INDEPENDENT"
    history = json.loads(court.get_history(case_id))
    first = [h for h in history if h.get("kind") == "first_instance"][0]
    # Still consulted (the court looked), but it was not verifiable.
    assert first["registry_consulted"] == [0]


def test_an_unverified_registration_is_not_used_as_publication_evidence(vm, court, accounts):
    """Harder guarantee: when the binding fails to verify, the record is NEVER
    presented as CONTENT-VERIFIED. A mock that only answers the verified prompt
    goes unmatched, so adjudication cannot proceed on it."""
    mock_evidence(vm)
    vm.sender = accounts["alice"]
    court.register_work("news-article", ORIGIN_URL, "", "Registered original")

    case_id = file_case(vm, court, accounts["alice"])

    vm.clear_mocks()
    mock_evidence(vm, origin=REPLACED_BODY)
    # Only a VERIFIED-keyed answer is on offer. If the court ever rendered the
    # swapped registration as verified evidence this would match; it must not,
    # so the prompt is unmocked and adjudicate raises under strict mocks.
    vm.mock_llm(
        r"EXHIBIT ORIGIN is REGISTERED and CONTENT-VERIFIED",
        opinion(verdict="INFRINGING", overlap=80, confidence=90, publisher="ORIGIN"),
    )
    with pytest.raises(Exception):
        court.adjudicate(case_id)
