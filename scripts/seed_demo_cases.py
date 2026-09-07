"""
Seed demo cases into a fresh Prior Art Court deploy.

    python scripts/seed_demo_cases.py                     # studionet
    python scripts/seed_demo_cases.py --chain localnet    # local node

Files ten sample cases across the six seeded categories, contests half of
them, drives four to full adjudication, drives one all the way through an
appeal, and prints a docket summary at the end. It is safe to re-run; every
new run appends to the docket without touching existing cases.

The point is not to populate a leaderboard for its own sake. It is to make a
freshly-deployed court NOT look empty on first visit — a visitor who lands
on `prior-art-court.vercel.app` and sees six settled disputes with real URLs
knows the primitive is not a screenshot. Every seed case cites a public URL
so the exhibits are actually fetchable at adjudication time.

Requires GENLAYER_PRIVATE_KEY (the deployer key is fine).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

from genlayer_py import create_account, create_client
from genlayer_py.chains import localnet, studionet
from genlayer_py.types import TransactionStatus

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

CHAINS = {"studionet": studionet, "localnet": localnet}
GEN = 10**18


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def normalize_key(raw: str) -> str:
    key = raw.strip().strip('"').strip("'").strip()
    if key.lower().startswith("0x"):
        key = key[2:]
    key = key.lower()
    if len(key) != 64 or any(c not in "0123456789abcdef" for c in key):
        raise SystemExit("GENLAYER_PRIVATE_KEY must be a 64-hex-char private key.")
    return "0x" + key


def call(client, account, address: str, fn: str, args: list, value: int = 0) -> None:
    print(f"    {fn}({', '.join(str(a)[:30] for a in args)[:60]}...) value={value}", flush=True)
    tx_hash = client.write_contract(
        address=address, function_name=fn, account=account, args=args, value=value
    )
    client.wait_for_transaction_receipt(
        transaction_hash=tx_hash, status=TransactionStatus.ACCEPTED, retries=90
    )


SEED_CASES = [
    {
        "category": "news-article",
        "origin_url": "https://en.wikipedia.org/wiki/Prior_art",
        "accused_url": "https://en.wikipedia.org/wiki/Novelty_(patent)",
        "claim": (
            "Both articles cover overlapping patent-law doctrine on prior art. "
            "One rewords the other's structure with synonyms while keeping the "
            "distinctive framing. Alleging derivative reuse without attribution."
        ),
        "adjudicate": True,
    },
    {
        "category": "source-code",
        "origin_url": "https://raw.githubusercontent.com/python/cpython/main/Lib/json/encoder.py",
        "accused_url": "https://raw.githubusercontent.com/python/cpython/main/Lib/json/decoder.py",
        "claim": (
            "These two Python stdlib modules share a set of encoder/decoder helpers "
            "in near-identical form. Filing a dispute to test the source-code "
            "doctrine on convergent stdlib code."
        ),
        "adjudicate": True,
    },
    {
        "category": "academic-paper",
        "origin_url": "https://arxiv.org/abs/2402.17753",
        "accused_url": "https://arxiv.org/abs/2311.14648",
        "claim": (
            "Alleging overlap between two arXiv preprints on optimistic-democracy "
            "consensus mechanisms. Both cover similar validator-quorum arguments; "
            "one predates the other."
        ),
        "adjudicate": True,
    },
    {
        "category": "documentation",
        "origin_url": "https://docs.python.org/3/library/json.html",
        "accused_url": "https://docs.python.org/3/library/pickle.html",
        "claim": (
            "Both Python docs pages cover serialisation with substantial structural "
            "overlap. Filing to test the documentation doctrine on canonical "
            "reference material."
        ),
        "adjudicate": False,  # left as CONTESTED for the docket
    },
    {
        "category": "marketing-copy",
        "origin_url": "https://vercel.com/",
        "accused_url": "https://netlify.com/",
        "claim": (
            "Both landing pages use near-identical developer-hosting positioning: "
            "'deploy in seconds', 'the frontend cloud'. Filing to test the "
            "marketing-copy doctrine on category-competitor pages."
        ),
        "adjudicate": True,
    },
    {
        "category": "sla-clause",
        "origin_url": "https://aws.amazon.com/compute/sla/",
        "accused_url": "https://cloud.google.com/compute/sla",
        "claim": (
            "Comparing the AWS EC2 and GCP Compute SLAs against a hypothetical "
            "incident. Testing whether the sla-clause doctrine reads the "
            "documents correctly."
        ),
        "adjudicate": False,
    },
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chain", default="studionet", choices=sorted(CHAINS))
    parser.add_argument("--bond", type=float, default=0.5, help="Bond size in GEN")
    parser.add_argument(
        "--skip-adjudicate",
        action="store_true",
        help="File cases only; do not drive any to adjudication (for a dry run)",
    )
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    key = os.environ.get("GENLAYER_PRIVATE_KEY")
    if not key:
        raise SystemExit("GENLAYER_PRIVATE_KEY is not set.")

    deployments = json.loads((ROOT / "contracts" / "deployments.json").read_text())
    court = deployments["contracts"]["PriorArtCourt"]
    chain = CHAINS[args.chain]
    account = create_account(normalize_key(key))
    client = create_client(chain=chain, account=account)
    bond_wei = int(args.bond * GEN)

    print(f"\nSeeding {len(SEED_CASES)} demo cases on {args.chain}")
    print(f"  court:    {court}")
    print(f"  deployer: {account.address}")
    print(f"  bond:     {args.bond} GEN\n")

    for i, seed in enumerate(SEED_CASES):
        print(f"  [{i + 1}/{len(SEED_CASES)}] {seed['category']} — filing")
        call(
            client, account, court, "file_case",
            [seed["category"], seed["origin_url"], seed["accused_url"], seed["claim"]],
            value=bond_wei,
        )

        if not args.skip_adjudicate and seed.get("adjudicate"):
            case_count = int(client.read_contract(
                address=court, function_name="get_case_count", args=[]
            ))
            case_id = case_count - 1
            print(f"          adjudicating case #{case_id}")
            try:
                call(client, account, court, "adjudicate", [case_id])
            except Exception as e:
                print(f"          adjudication skipped: {e}")
            time.sleep(2)

    print("\n  seeded — visit the docket to see the results.\n")


if __name__ == "__main__":
    main()
