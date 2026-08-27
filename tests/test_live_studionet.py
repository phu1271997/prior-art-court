"""
Live-network smoke tests. Slow lane.

These do not run in the default `pytest` invocation. Run them with:

    pytest -m slow --network studionet    # or localnet

The slow suite exists to prove one thing the fast suite cannot: that the
already-deployed contracts on studionet still answer their public views
correctly. It is a regression net for redeploys, not a substitute for the
fast suite's exhaustive coverage of edge cases, which requires the ability
to install mocks and rewind state.

The fast suite (`pytest`, the default) covers the money paths, both
intelligent instances, doctrine publication and amendment, and reputation
derivation — 72 cases as of writing — all offline, deterministic, and
completing in under a second.
"""

from __future__ import annotations

import os

import pytest

pytestmark = pytest.mark.slow


COURT_ADDRESS = "0x082FcFeFEE1B7642C42bd5E1eBaa6C029fe19869"
POLICY_REGISTRY_ADDRESS = "0xFC3A3422c64c3B84eDb8B31a333C8531B8Ba1755"
REPUTATION_ADDRESS = "0xF950283384B69900a4B13aCDEc99A7adB137CA7e"

STUDIONET_CHAIN_ID = 61999


def _client():
    """
    Build a genlayer-py client against the live network.

    Import inside the function so that the fast suite never triggers the
    optional dependency. If genlayer-py is not installed the slow suite
    skips rather than errors.
    """
    try:
        from genlayer_py import create_client  # type: ignore
        from genlayer_py.chains import studionet  # type: ignore
    except ImportError as exc:
        pytest.skip(f"genlayer-py not installed ({exc}); slow suite skipped")

    return create_client(chain=studionet)


def _read(client, address: str, method: str, args=None):
    """Wrap the read call so a hosted rate-limit shows up as a skip, not a fail."""
    try:
        return client.read_contract(
            address=address, function_name=method, args=args or []
        )
    except Exception as exc:  # noqa: BLE001 — network shape varies
        message = str(exc).lower()
        if any(word in message for word in ("rate", "timeout", "429", "temporarily")):
            pytest.skip(f"studionet returned a transient error: {exc}")
        raise


def test_court_schema_is_reachable():
    """The court contract answers the RPC. Nothing else works if this does not."""
    if os.environ.get("SKIP_LIVE_TESTS"):
        pytest.skip("SKIP_LIVE_TESTS set")

    client = _client()
    count = _read(client, COURT_ADDRESS, "get_case_count")
    assert int(count) >= 0, f"case count came back nonsensical: {count!r}"


def test_registry_publishes_at_least_one_doctrine():
    """The court refuses complaints in categories with no doctrine, so at least one must exist."""
    client = _client()
    cats = _read(client, POLICY_REGISTRY_ADDRESS, "get_categories")
    payload = cats if isinstance(cats, (list, dict)) else __import__("json").loads(cats)
    assert isinstance(payload, list), f"expected a list of policies, got {type(payload)}"
    assert len(payload) >= 1, "no doctrine registered — the court has no jurisdiction"
    for entry in payload:
        assert entry.get("doctrine"), f"empty doctrine text for {entry.get('category')!r}"


def test_reputation_matches_court_address():
    """Reputation should be pointed at the same court the frontend is."""
    client = _client()
    linked = _read(client, REPUTATION_ADDRESS, "get_court")
    assert linked.lower() == COURT_ADDRESS.lower(), (
        f"reputation points at {linked}, expected {COURT_ADDRESS}"
    )
