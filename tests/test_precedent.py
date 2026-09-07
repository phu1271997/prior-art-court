"""
The precedent engine — stare decisis for the court.

A court that forgets every case the moment it settles is a sequence of unrelated
verdicts, not a body of law. These tests pin down the four things that make the
precedent engine a court rather than a log:

  * a case that settles on the merits enters the body of law for its category;
  * the NEXT case of that kind is heard with those prior decisions in front of
    the adjudicator (proved by keying the mock to the precedent block itself —
    if the block never reached the prompt, no mock matches and the call fails);
  * the citation the adjudicator gives back is sanitised on-chain — a
    hallucinated case id is dropped, an out-of-vocabulary alignment is coerced;
  * a case that did NOT settle on the merits (escalated, refunded) teaches the
    court nothing and never becomes precedent.
"""

import json

from conftest import (
    DOCTRINE,
    GEN,
    case_of,
    contest,
    file_case,
    mock_evidence,
    opinion,
)

LEADER_PROMPT = r"impartial adjudicator"


def hear(vm, court, cid, response=None, **kwargs):
    # The conftest shim rewrites the response's discipline_token to whatever the
    # prompt asks for, so opinion()'s case_id default need not match the case id.
    vm.mock_llm(LEADER_PROMPT, response if response is not None else opinion(**kwargs))
    court.adjudicate(cid)
    return case_of(court, cid)


def opinion_with_precedent(alignment, cited, **kwargs):
    """A well-formed opinion that also answers the precedent questions."""
    body = json.loads(opinion(**kwargs))
    body["precedent_alignment"] = alignment
    body["cited_precedents"] = cited
    return json.dumps(body)


def settle_one(vm, court, complainant, verdict="INFRINGING"):
    """File and settle a single uncontested merits case; return its id."""
    cid = file_case(vm, court, complainant)
    mock_evidence(vm)
    hear(vm, court, cid, verdict=verdict, overlap=81, confidence=90)
    return cid


# --------------------------------------------------------------- entering the law


def test_the_first_case_in_a_category_is_heard_without_precedent(vm, court, accounts):
    assert court.get_precedent_count("news-article") == 0

    case = case_of(court, settle_one(vm, court, accounts["alice"]))

    # Nothing to follow: the court says so on the record rather than inventing a lineage.
    assert case["precedent_alignment"] == "NONE"
    assert case["cited_precedents"] == []
    assert case["status"] == "RESOLVED"


def test_a_merits_verdict_enters_the_body_of_law(vm, court, accounts):
    cid = settle_one(vm, court, accounts["alice"], verdict="INFRINGING")

    assert court.get_precedent_count("news-article") == 1
    law = json.loads(court.get_precedents("news-article", 0))
    assert len(law) == 1
    assert law[0]["case_id"] == cid
    assert law[0]["verdict"] == "INFRINGING"
    assert law[0]["reason"]  # the reasoning travels with the precedent


def test_an_escalated_case_never_enters_the_body_of_law(vm, court, accounts):
    cid = file_case(vm, court, accounts["alice"])
    mock_evidence(vm)
    # Low confidence sends the case to appeal instead of settlement — it decided
    # nothing on the merits, so it must not become precedent.
    case = hear(vm, court, cid, verdict="INFRINGING", overlap=81, confidence=50, case_id=cid)

    assert case["status"] == "ESCALATED"
    assert court.get_precedent_count("news-article") == 0


# ---------------------------------------------------- precedent reaches the bench


def test_a_later_case_is_heard_with_prior_decisions_in_front_of_it(vm, court, accounts):
    first = settle_one(vm, court, accounts["alice"], verdict="INFRINGING")

    second = file_case(vm, court, accounts["bob"])
    mock_evidence(vm)
    # This mock ONLY matches a prompt that actually contains the precedent block
    # for case #first. If precedent never reached the prompt, no mock matches and
    # adjudicate fails loudly under strict mocks — which is the assertion.
    vm.clear_mocks()
    mock_evidence(vm)
    resp = opinion_with_precedent(
        "FOLLOWED", [first], verdict="INFRINGING", overlap=80, confidence=90,
        case_id=second,
    )
    vm.mock_llm(rf"PRECEDENT . case #{first}", resp)

    court.adjudicate(second)
    case = case_of(court, second)

    assert case["precedent_alignment"] == "FOLLOWED"
    assert case["cited_precedents"] == [first]


def test_a_hallucinated_citation_is_dropped_and_a_bad_alignment_is_coerced(vm, court, accounts):
    first = settle_one(vm, court, accounts["alice"], verdict="INFRINGING")

    second = file_case(vm, court, accounts["bob"])
    vm.clear_mocks()
    mock_evidence(vm)
    # The model cites a case that was never placed before it (999) and reports an
    # alignment outside the court's vocabulary. The court records neither.
    resp = opinion_with_precedent(
        "TOTALLY-MADE-UP", [999, first], verdict="INFRINGING", overlap=80,
        confidence=90
    )
    vm.mock_llm(LEADER_PROMPT, resp)

    court.adjudicate(second)
    case = case_of(court, second)

    # 999 was never on offer -> dropped; `first` was -> kept.
    assert case["cited_precedents"] == [first]
    # "TOTALLY-MADE-UP" is not a known alignment -> coerced to NONE.
    assert case["precedent_alignment"] == "NONE"


# --------------------------------------------------------- category scoping / order


def test_precedent_is_scoped_to_its_own_category(vm, court, registry, accounts):
    registry.register_policy("documentation", DOCTRINE)

    # A settled news-article case is precedent for news-article only.
    settle_one(vm, court, accounts["alice"], verdict="INFRINGING")
    assert court.get_precedent_count("news-article") == 1
    assert court.get_precedent_count("documentation") == 0

    # A documentation case is heard with NO precedent (a generic opinion with no
    # precedent fields settles it), and joins its own category's law afterwards.
    doc = file_case(vm, court, accounts["bob"], category="documentation")
    vm.clear_mocks()
    mock_evidence(vm)
    case = hear(vm, court, doc, verdict="INDEPENDENT", overlap=5, confidence=90)

    assert case["precedent_alignment"] == "NONE"
    assert court.get_precedent_count("documentation") == 1
    assert court.get_precedent_count("news-article") == 1


def test_the_case_law_view_lists_newest_first(vm, court, accounts):
    a = settle_one(vm, court, accounts["alice"], verdict="INFRINGING")
    vm.clear_mocks()
    b = settle_one(vm, court, accounts["bob"], verdict="INDEPENDENT")

    law = json.loads(court.get_precedents("news-article", 0))
    assert [row["case_id"] for row in law] == [b, a]
    assert court.get_precedent_count("news-article") == 2
