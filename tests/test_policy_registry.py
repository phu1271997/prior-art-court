"""PolicyRegistry — doctrine is the law the court applies, so publishing it is guarded."""

import json

from conftest import DOCTRINE, rejects


def test_registered_doctrine_is_readable(registry):
    assert registry.has_policy("news-article") is True
    assert registry.get_policy("news-article") == DOCTRINE
    assert registry.get_revision("news-article") == 1


def test_category_lookup_is_case_and_space_insensitive(registry):
    assert registry.has_policy("  News-Article ") is True
    assert registry.get_policy("NEWS-ARTICLE") == DOCTRINE


def test_unknown_category_is_rejected_rather_than_defaulted(vm, registry):
    """A missing doctrine must fail loudly — a court with no law is worse than no court."""
    assert registry.has_policy("photography") is False
    with rejects("unknown category"):
        registry.get_policy("photography")


def test_thin_doctrine_is_refused(vm, registry, accounts):
    """A slogan is not a standard: an adjudicator handed one invents the rest itself."""
    vm.sender = accounts["admin"]
    with rejects("doctrine too thin"):
        registry.register_policy("recipes", "Do not copy recipes.")


def test_only_admin_may_publish_doctrine(vm, registry, accounts):
    vm.sender = accounts["alice"]
    with rejects("admin only"):
        registry.register_policy("news-article", DOCTRINE + " Amended.")


def test_amending_bumps_the_revision_without_duplicating_the_category(vm, registry, accounts):
    vm.sender = accounts["admin"]
    registry.register_policy("news-article", DOCTRINE + " Amended for clarity.")

    assert registry.get_revision("news-article") == 2
    categories = json.loads(registry.get_categories())
    assert [row["category"] for row in categories] == ["news-article"]
    assert categories[0]["doctrine"].endswith("Amended for clarity.")


def test_admin_can_be_handed_over(vm, registry, accounts):
    vm.sender = accounts["admin"]
    registry.transfer_admin(accounts["alice"])

    vm.sender = accounts["admin"]
    with rejects("admin only"):
        registry.register_policy("news-article", DOCTRINE)

    vm.sender = accounts["alice"]
    registry.register_policy("news-article", DOCTRINE + " Under new stewardship.")
    assert registry.get_revision("news-article") == 2
