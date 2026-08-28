"""
Negative-path and boundary tests that pin down the court's input filters.

The lifecycle, adjudication, and appeal suites cover behaviour when
inputs are valid. This file covers what happens when they are not: bad
URL schemes, boundary bond amounts, whitespace-only text, off-by-one
claim lengths, case-folded categories, and the read-view surface for
inputs that name a case that never existed.
"""

import json

import pytest

from conftest import ACCUSED_URL, CLAIM, GEN, ORIGIN_URL, file_case, rejects


# ---------------------------------------------------------------- URL schemes


@pytest.mark.parametrize(
    "bad_origin",
    [
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "file:///etc/passwd",
        "ftp://example.org/report",
        "ws://example.org/report",
        "://example.org/report",
        "example.org/report",   # no scheme at all
        "",
        "   ",
    ],
)
def test_origin_url_scheme_is_strictly_http_or_https(vm, court, accounts, bad_origin):
    """The court fetches from the open web only. Anything else is refused at filing."""
    vm.sender = accounts["alice"]
    vm.value = GEN
    with rejects("origin_url must be an http(s) URL"):
        court.file_case("news-article", bad_origin, ACCUSED_URL, CLAIM)
    vm.value = 0


@pytest.mark.parametrize(
    "bad_accused",
    [
        "javascript:alert(1)",
        "file:///etc/hosts",
        "chrome://settings",
        "about:blank",
    ],
)
def test_accused_url_scheme_is_strictly_http_or_https(vm, court, accounts, bad_accused):
    vm.sender = accounts["alice"]
    vm.value = GEN
    with rejects("accused_url must be an http(s) URL"):
        court.file_case("news-article", ORIGIN_URL, bad_accused, CLAIM)
    vm.value = 0


def test_very_short_urls_are_refused(vm, court, accounts):
    """A URL under 12 chars cannot carry both scheme and host; it is not fetchable."""
    vm.sender = accounts["alice"]
    vm.value = GEN
    with rejects("origin_url must be an http(s) URL"):
        court.file_case("news-article", "http://a", ACCUSED_URL, CLAIM)
    vm.value = 0


def test_same_page_rejected_case_insensitively(vm, court, accounts):
    """
    Two URLs that only differ in host casing point at the same page. The
    court must not accept the pair, because there is nothing to adjudicate
    when both exhibits are one exhibit.
    """
    vm.sender = accounts["alice"]
    vm.value = GEN
    with rejects("both URLs point at the same page"):
        court.file_case(
            "news-article",
            "https://Example.org/PATH",
            "https://EXAMPLE.ORG/PATH",
            CLAIM,
        )
    vm.value = 0


# --------------------------------------------------------------- claim length


def test_claim_at_exactly_the_boundary_is_accepted(vm, court, accounts):
    """
    Twenty printable characters is the floor. The contract accepts twenty,
    refuses nineteen. This test pins the boundary so a future tightening
    does not silently move it.
    """
    twenty_char_claim = "12345678901234567890"  # exactly 20 characters
    assert len(twenty_char_claim) == 20
    vm.sender = accounts["alice"]
    vm.value = GEN
    court.file_case("news-article", ORIGIN_URL, ACCUSED_URL, twenty_char_claim)
    vm.value = 0


def test_claim_one_character_short_is_refused(vm, court, accounts):
    nineteen_char_claim = "1234567890123456789"  # 19 characters
    assert len(nineteen_char_claim) == 19
    vm.sender = accounts["alice"]
    vm.value = GEN
    with rejects("claim_text too thin to answer"):
        court.file_case("news-article", ORIGIN_URL, ACCUSED_URL, nineteen_char_claim)
    vm.value = 0


def test_whitespace_only_claim_is_refused_even_when_long(vm, court, accounts):
    """
    The contract trims claim_text before measuring, so a hundred spaces is
    still no complaint.
    """
    vm.sender = accounts["alice"]
    vm.value = GEN
    with rejects("claim_text too thin to answer"):
        court.file_case("news-article", ORIGIN_URL, ACCUSED_URL, "   \t\n" * 50)
    vm.value = 0


# ----------------------------------------------------------------- category


def test_category_case_and_whitespace_are_folded(vm, court, accounts):
    """
    The court accepts a category regardless of the casing or padding the
    caller sent. The stored form is always the lowercase, trimmed key,
    which is what the doctrine registry publishes under.
    """
    vm.sender = accounts["alice"]
    vm.value = GEN
    court.file_case("  News-Article ", ORIGIN_URL, ACCUSED_URL, CLAIM)
    vm.value = 0

    case = json.loads(court.get_case(0))
    assert case["category"] == "news-article"


# ------------------------------------------------------------- unknown case


def test_contesting_an_unknown_case_is_refused(vm, court, accounts):
    vm.sender = accounts["bob"]
    vm.value = GEN
    with rejects("court: unknown case"):
        court.contest_case(999)
    vm.value = 0


def test_adjudicating_an_unknown_case_is_refused(vm, court, accounts):
    vm.sender = accounts["alice"]
    with rejects("court: unknown case"):
        court.adjudicate(42)


def test_withdrawing_an_unknown_case_is_refused(vm, court, accounts):
    vm.sender = accounts["alice"]
    with rejects("court: unknown case"):
        court.withdraw_case(7)


def test_reading_an_unknown_case_history_returns_empty(vm, court, accounts):
    """
    Reading history for a case id that never existed is a legitimate read
    (the frontend polls for freshness). It must return an empty list, not
    fail, so a client that races ahead of a filing does not crash.
    """
    payload = json.loads(court.get_history(9999))
    assert payload == []


# --------------------------------------------------------------- admin sweep


def test_sweep_by_non_admin_is_refused(vm, court, accounts):
    """The forfeit pool belongs to the admin. Anyone else asking is refused."""
    vm.sender = accounts["alice"]
    with rejects("court: admin only"):
        court.sweep_forfeited()


def test_sweep_when_nothing_is_forfeited_is_refused(vm, court, accounts):
    """A no-op sweep is refused rather than silently succeeding."""
    vm.sender = accounts["admin"]
    with rejects("court: nothing forfeited"):
        court.sweep_forfeited()


# --------------------------------------------------------------- pagination


def test_get_cases_with_limit_zero_returns_the_whole_docket(vm, court, accounts):
    """
    limit <= 0 is documented as 'the whole docket'. Assert it, so a future
    refactor cannot quietly reinterpret the sentinel as 'return nothing'.
    """
    file_case(vm, court, accounts["alice"])
    file_case(vm, court, accounts["alice"])
    file_case(vm, court, accounts["alice"])

    all_cases = json.loads(court.get_cases(0))
    assert len(all_cases) == 3
    # Newest first — case 2 (the third filed) comes back at index 0.
    assert [c["case_id"] for c in all_cases] == [2, 1, 0]
