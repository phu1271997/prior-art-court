"""
Phase 8 — three new ecosystem doctrines (SLA / academic misconduct / bug-bounty
severity) plus a sanity check that the doctrine seed count is now nine.

The point of these tests is not to relitigate what each doctrine says — that
is the doctrine's own text and it may be amended in place. The point is to
pin down what the deploy seed WILL register on a fresh chain, so a milestone
submission can point at "nine categories" and know that number is not going
to shift under it.
"""

import pytest

from contracts.policies import POLICIES


ECOSYSTEM_CATEGORIES = ("sla-clause", "academic-misconduct", "bug-bounty-severity")


def test_the_deploy_seed_has_nine_categories():
    """News + source-code + academic-paper + documentation + marketing-copy +
    patent-claim + sla-clause + academic-misconduct + bug-bounty-severity."""
    assert len(POLICIES) == 9


@pytest.mark.parametrize("category", ECOSYSTEM_CATEGORIES)
def test_each_ecosystem_doctrine_is_seed_ready(category):
    """The PolicyRegistry refuses doctrines shorter than 120 chars — the seed
    text must clear that bar or the deploy script will halt."""
    assert category in POLICIES
    assert len(POLICIES[category]) >= 120


def test_the_sla_clause_doctrine_states_a_favour_clause():
    """A verdict prompt should be able to resolve genuinely ambiguous
    contract terms; the sla-clause doctrine tells the adjudicator which way
    to lean when the SLA itself is silent."""
    text = POLICIES["sla-clause"]
    assert "customer" in text.lower()
    assert "drafting" in text.lower() or "customer's ordinary understanding" in text.lower()


def test_the_academic_misconduct_doctrine_carves_out_self_plagiarism():
    """Self-overlap between a preprint and its final version is a real edge
    case that a naive similarity check would get wrong; the doctrine has to
    say so explicitly."""
    text = POLICIES["academic-misconduct"]
    assert "self-plagiarism" in text.lower()


def test_the_bug_bounty_doctrine_addresses_chained_vulnerabilities():
    """A vulnerability chain that combines two mid-tier primitives is the
    common controversy in bounty severity disputes."""
    text = POLICIES["bug-bounty-severity"]
    assert "chain" in text.lower() or "chained" in text.lower()


def test_every_seeded_category_is_a_kebab_case_slug():
    """The court lowercases and strips categories on file_case; every seeded
    category must already be in that canonical form so the frontend can
    match on equality."""
    for category in POLICIES:
        assert category == category.strip().lower()
        assert " " not in category
        assert "_" not in category
