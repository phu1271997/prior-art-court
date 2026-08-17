"""
Deploy Prior Art Court to GenLayer studionet.

    python scripts/deploy.py                     # studionet (the project default)
    python scripts/deploy.py --chain localnet    # local node, for fast iteration
    python scripts/deploy.py --skip-policies     # redeploy code, keep doctrine as-is

Requires GENLAYER_PRIVATE_KEY in the environment, or in a .env at the repo root.
The account it belongs to must already hold GEN on studionet — fund it from the
Studio's Accounts panel before running this. studionet and testnet are separate
networks and the testnet faucet does not fund studionet.

Deploy order is fixed by the constructor arguments:

    PolicyRegistry            (no dependencies)
        -> Contract           (takes the registry address: doctrine is read at
                               adjudication time, so the court must know it)
            -> Reputation     (takes the court address: standing is derived by
                               reading settled cases back out of the court)

On success this writes contracts/deployments.json and frontend/.env.local, so the
frontend picks up the new addresses with no code change.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from genlayer_py import create_account, create_client
from genlayer_py.chains import localnet, studionet
from genlayer_py.types import CalldataAddress, TransactionStatus

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from contracts.policies import POLICIES  # noqa: E402

CONTRACTS = ROOT / "contracts"
CHAINS = {"studionet": studionet, "localnet": localnet}


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
    """Tolerate a pasted key that lost its 0x, kept its quotes, or trailed a space."""
    key = raw.strip().strip('"').strip("'").strip()
    if key.lower().startswith("0x"):
        key = key[2:]
    key = key.lower()
    if len(key) != 64 or any(c not in "0123456789abcdef" for c in key):
        raise SystemExit(
            "GENLAYER_PRIVATE_KEY is not a 32-byte hex key — expected 64 hex "
            "characters, with or without a leading 0x."
        )
    return "0x" + key


def contract_address(receipt) -> str | None:
    """The receipt shape has moved between SDK versions — probe the known places."""
    if isinstance(receipt, dict):
        for key in ("contract_address", "contractAddress"):
            if receipt.get(key):
                return receipt[key]
        for nested in ("data", "tx_data_decoded"):
            block = receipt.get(nested) or {}
            if isinstance(block, dict) and block.get("contract_address"):
                return block["contract_address"]
    return getattr(receipt, "contract_address", None)


def deploy(client, account, label: str, filename: str, args: list) -> str:
    code = (CONTRACTS / filename).read_bytes()
    print(f"  {label:16} deploying ...", end=" ", flush=True)

    tx_hash = client.deploy_contract(code=code, account=account, args=args)
    receipt = client.wait_for_transaction_receipt(
        transaction_hash=tx_hash, status=TransactionStatus.ACCEPTED, retries=60
    )

    address = contract_address(receipt)
    if not address:
        print("FAILED")
        raise SystemExit(f"{label}: no contract address in receipt:\n{receipt}")

    print(address)
    return address


def call(client, account, address: str, fn: str, args: list) -> None:
    preview = ", ".join(str(a) for a in args)
    print(f"  {fn}({preview[:52]}{'...' if len(preview) > 52 else ''}) ...", end=" ", flush=True)
    tx_hash = client.write_contract(
        address=address, function_name=fn, account=account, args=args
    )
    client.wait_for_transaction_receipt(
        transaction_hash=tx_hash, status=TransactionStatus.ACCEPTED, retries=60
    )
    print("ok")


def main() -> None:
    parser = argparse.ArgumentParser(description="Deploy Prior Art Court")
    parser.add_argument("--chain", default="studionet", choices=sorted(CHAINS))
    parser.add_argument("--skip-policies", action="store_true")
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    raw_key = os.environ.get("GENLAYER_PRIVATE_KEY")
    if not raw_key:
        raise SystemExit(
            "GENLAYER_PRIVATE_KEY is not set. Put it in .env at the repo root, and "
            "make sure that account holds GEN on studionet."
        )

    chain = CHAINS[args.chain]
    account = create_account(normalize_key(raw_key))
    client = create_client(chain=chain, account=account)

    print(f"\nPrior Art Court -> {args.chain}")
    print(f"  deployer         {account.address}\n")

    registry = deploy(client, account, "PolicyRegistry", "policy_registry.py", [])
    court = deploy(
        client, account, "Court", "contract.py", [CalldataAddress(bytes.fromhex(registry[2:]))]
    )
    reputation = deploy(
        client, account, "Reputation", "reputation.py", [CalldataAddress(bytes.fromhex(court[2:]))]
    )

    if not args.skip_policies:
        print("\n  registering doctrine")
        for category, doctrine in POLICIES.items():
            call(client, account, registry, "register_policy", [category, doctrine])

    deployments = {
        "chain": args.chain,
        "chain_id": getattr(chain, "id", None),
        "deployer": account.address,
        "contracts": {
            "PolicyRegistry": registry,
            "PriorArtCourt": court,
            "Reputation": reputation,
        },
        "categories": sorted(POLICIES),
    }
    (CONTRACTS / "deployments.json").write_text(json.dumps(deployments, indent=2) + "\n")

    env_local = ROOT / "frontend" / ".env.local"
    env_local.parent.mkdir(parents=True, exist_ok=True)
    env_local.write_text(
        "\n".join(
            [
                f"VITE_GENLAYER_CHAIN={args.chain}",
                f"VITE_COURT_ADDRESS={court}",
                f"VITE_POLICY_REGISTRY_ADDRESS={registry}",
                f"VITE_REPUTATION_ADDRESS={reputation}",
                "",
            ]
        )
    )

    print("\n  wrote contracts/deployments.json")
    print("  wrote frontend/.env.local\n")
    print(f"  PolicyRegistry   {registry}")
    print(f"  PriorArtCourt    {court}")
    print(f"  Reputation       {reputation}\n")


if __name__ == "__main__":
    main()
