# Contributing

A short guide for running the court locally, running the tests, and
adding a new doctrine. Contract changes require redeployment, so please
open an issue and get review before proposing them.

## Prerequisites

- Python 3.11 or newer
- Node 20 or newer
- A MetaMask wallet (only needed for the live frontend, not the tests)

## First run

```bash
git clone https://github.com/phu1271997/prior-art-court.git
cd prior-art-court
pip install -r requirements.txt
python -m pytest        # 73 fast tests, ~1 second, offline
```

If the fast suite is green, your environment is good.

## Running the frontend against the deployed studionet contracts

```bash
cd frontend
npm install
npm run dev
```

The frontend reads `frontend/.env.local` for contract addresses. If the
file is missing, either:

- Copy `frontend/.env.example` and paste the deployed addresses from
  `contracts/deployments.json`, or
- Run `python scripts/deploy.py --chain studionet` from the repo root
  (this deploys a fresh set of contracts and rewrites both
  `contracts/deployments.json` and `frontend/.env.local` in place).

The default addresses in the example file point at the live contracts
on studionet, so you do not need to redeploy just to try the app.

## Running the tests

Fast lane (offline, mocked VM, the default):

```bash
python -m pytest              # everything not marked slow
python -m pytest tests/test_court_lifecycle.py -k contest
```

Slow lane (live network):

```bash
pip install genlayer-py
python -m pytest -m slow --network studionet
```

The slow suite carries a small smoke check per contract. Rate-limited
or transient errors from the hosted RPC are converted to skips rather
than failures.

## Frontend build & typecheck

```bash
cd frontend
npm run build          # tsc -b && vite build
```

If the build fails, read the TS output first; almost every failure so
far has been a missing prop on a section component. Nothing dynamic
happens at build time.

## Adding a new doctrine

Doctrine is the court's whole integration surface. Adding a new kind of
work under the court's jurisdiction is not a code change; it is a
paragraph registered on-chain.

1. Draft the paragraph in `contracts/policies.py`. It should say:
   - What counts as protected expression in this medium.
   - What reuse is legitimate (quotation, citation, parody, transformation).
   - What must **not** be treated as copying (shared facts, shared
     conventions, technical vocabulary, common structure).
2. Add the category key + doctrine text to the `POLICIES` dict there.
3. Register it on the live registry:
   ```bash
   python scripts/deploy.py --chain studionet --only-register
   ```
   (or paste the call by hand from `scripts/doctrine-calls.txt` into
   Studio's Run & Debug tab).
4. Verify with the slow suite:
   ```bash
   python -m pytest -m slow --network studionet -k policies
   ```
5. Bump the version in `CHANGELOG.md` under "Added".

## Proposing a contract change

Contract changes need a fresh deployment (studionet contract addresses
change on every deploy), which invalidates the existing on-chain case
history the Explorer submission points at. Please:

1. Open a GitHub issue describing the change and the invariant it
   preserves. The invariants in `docs/ECONOMICS.md` and
   `docs/SECURITY.md` are the floor; a change must not weaken them.
2. Add fast-lane tests for the new behavior before writing the contract
   change. The `conftest.py` mocked VM makes this easy: install LLM
   mocks with `sim_installMocks`, deploy in `direct_deploy`, and assert
   against the resulting state.
3. Include an ADR in `docs/adr/` if the change is load-bearing.

## Code style

- Python contract: `from genlayer import *` only. No alias imports. One
  `gl.Contract` subclass per module, always named `Contract`.
- Frontend: React 19 function components. Vanilla CSS with the design
  tokens in `styles.css`. No Tailwind, no Motion library, no icon
  library. Serif for anything a judge would write; monospace for
  anything the chain wrote.
- Tests: descriptive names. `test_the_pot_is_conserved_across_a_resolution`
  reads better than `test_pot_conservation`.

## What not to add

- A rewrite in Solidity. This is the exact use case Solidity cannot
  address; that is the point of the project.
- Any code path that reads storage from inside a nondet block. Storage
  is not reachable from there; the closure captures what it needs
  *before* the block runs.
- Any `gl.eth.send_value(...)` call. That function does not exist. Use
  `gl.get_contract_at(address).emit_transfer(value=...)`.
- A hard-coded chain id in the frontend. Read it from `studionet.id`.
- A private key in a `VITE_` env var. Anything so prefixed ships to the
  browser.
