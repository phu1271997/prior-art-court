# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
Achievements — soulbound badges the court mints from settled cases.

Prior Art Court already has an on-chain reputation, but standing is a scalar:
it tells you how the account is doing, not what they did to get there. This
contract records the events that shaped it — the first case ever filed, the
first win as a respondent, a comeback from a losing streak — and hands the
account a permanent, non-transferable badge for each. Nothing about a badge is
economic; nothing enforces gating on one. They are a public credential that
says "this account, on this case, did this thing," and they exist so a reader
of an account's row on the leaderboard can see the shape of the record, not
just the number.

The name is deliberate. Every event a badge issues for is already in the
court's history — this contract just re-indexes it as a per-account list, in
the same way `Reputation` re-indexes the same events as a per-account counter.
Both read the court; neither writes to it; and the court never learns either
exists.

Non-transferability is enforced by omission. There is no transfer method. A
badge minted to an address stays with that address forever. That is the whole
point: a bought account cannot buy a track record.
"""

from genlayer import *

from dataclasses import dataclass
import json


# ---------------------------------------------------------------- vocabulary

# The full set of badges this contract will ever mint. Keeping the list closed
# (rather than letting parties invent categories) means the frontend never has
# to guess what to render, and every badge has a defined provenance.
BADGE_FIRST_FILING = "FIRST_FILING"
BADGE_FIRST_CONTEST = "FIRST_CONTEST"
BADGE_FIRST_WIN = "FIRST_WIN"
BADGE_FIVE_WINS = "FIVE_WINS"
BADGE_TEN_WINS = "TEN_WINS"
BADGE_JUST_DEFENDER = "JUST_DEFENDER"  # respondent who defeated an unfounded complaint
BADGE_APPELLATE_WINNER = "APPELLATE_WINNER"  # won at the final instance
BADGE_PRECEDENT_INVERTER = "PRECEDENT_INVERTER"  # precedence inversion vindicated them

_ALL_BADGES = (
    BADGE_FIRST_FILING,
    BADGE_FIRST_CONTEST,
    BADGE_FIRST_WIN,
    BADGE_FIVE_WINS,
    BADGE_TEN_WINS,
    BADGE_JUST_DEFENDER,
    BADGE_APPELLATE_WINNER,
    BADGE_PRECEDENT_INVERTER,
)


# ------------------------------------------------------------------ interfaces

@gl.contract_interface
class PriorArtCourt:
    """Read-only view of the court, as this contract needs it."""

    class View:
        def get_case(self, case_id: int) -> str: ...
        def get_case_count(self) -> int: ...


@gl.contract_interface
class Reputation:
    """Read-only view of the reputation contract."""

    class View:
        def get_standing(self, account: Address) -> str: ...


# ------------------------------------------------------------------ storage


@allow_storage
@dataclass
class Badge:
    kind: str
    case_id: u256
    minted_at_case_count: u256


class Contract(gl.Contract):
    admin: Address
    court: Address
    reputation: Address

    # address hex (lowercase) -> ordered list of badges
    badges: TreeMap[str, DynArray[Badge]]

    # case_id string -> True once we have folded that case's badge events in
    minted_from: TreeMap[str, bool]
    minted_count: u256

    # For fast dedup checks — one entry per (address, kind).
    holders: TreeMap[str, bool]

    # Public roster of every address that has ever earned a badge, in first-mint
    # order. The frontend uses this to render the badges gallery.
    roster: DynArray[str]

    def __init__(self, court: str, reputation: str) -> None:
        self.admin = gl.message.sender_address
        self.court = _to_address(court)
        self.reputation = _to_address(reputation)
        self.minted_count = 0

    # --------------------------------------------------------------- minting

    @gl.public.write
    def mint_from_case(self, case_id: int) -> None:
        """
        Fold a settled case into whichever accounts earned a badge for it.

        Permissionless on purpose — the court records the truth, this contract
        surfaces it, and anyone should be able to trigger that surfacing. The
        idempotency guard makes the second call a no-op rather than a mint of
        duplicate badges.
        """
        key = str(case_id)
        if self.minted_from.get(key, False):
            return

        case = json.loads(self._court().view().get_case(case_id))
        assert case.get("status") == "RESOLVED", "achievements: case is not resolved yet"

        complainant = _to_address(case["complainant"])
        respondent = _to_address(case["respondent"])
        winner = _to_address(case["winner"])
        instance = int(case.get("instance", 0))
        publisher = str(case.get("first_publisher", "UNCLEAR"))

        # Every case triggers the "first filing" candidate for its complainant.
        self._maybe_award(complainant, BADGE_FIRST_FILING, case_id)

        # A respondent exists only for contested cases.
        if respondent != _zero_address():
            self._maybe_award(respondent, BADGE_FIRST_CONTEST, case_id)

        # A real winner exists only for cases the court did not refund.
        if winner != _zero_address():
            self._maybe_award(winner, BADGE_FIRST_WIN, case_id)
            wins = self._wins_for(winner)
            if wins >= 5:
                self._maybe_award(winner, BADGE_FIVE_WINS, case_id)
            if wins >= 10:
                self._maybe_award(winner, BADGE_TEN_WINS, case_id)
            if instance >= 2:
                self._maybe_award(winner, BADGE_APPELLATE_WINNER, case_id)
            # Just defender: the respondent won, meaning the complaint was
            # unfounded and the court said so. That is a much stronger public
            # signal than "won a case" in the abstract.
            if respondent != _zero_address() and _same(winner, respondent):
                self._maybe_award(respondent, BADGE_JUST_DEFENDER, case_id)
            # Precedence inverter: the appeal's inversion rule fired — the
            # accused work turned out to predate the "original".
            if instance >= 2 and publisher == "ACCUSED":
                self._maybe_award(winner, BADGE_PRECEDENT_INVERTER, case_id)

        self.minted_from[key] = True
        self.minted_count = u256(int(self.minted_count) + 1)

    @gl.public.write
    def mint_recent(self, limit: int) -> None:
        """Fold up to `limit` most recent cases at once — a cheap way to
        bootstrap a frontend that just came online."""
        total = int(self._court().view().get_case_count())
        take = total if limit <= 0 or limit > total else limit
        for i in range(total - 1, total - take - 1, -1):
            case = json.loads(self._court().view().get_case(i))
            if case.get("status") == "RESOLVED":
                self.mint_from_case(i)

    # ----------------------------------------------------------- admin knobs

    @gl.public.write
    def set_court(self, court: Address) -> None:
        assert gl.message.sender_address == self.admin, "achievements: admin only"
        self.court = court

    @gl.public.write
    def set_reputation(self, reputation: Address) -> None:
        assert gl.message.sender_address == self.admin, "achievements: admin only"
        self.reputation = reputation

    # --------------------------------------------------------------- views

    @gl.public.view
    def get_badges(self, account: Address) -> str:
        key = _addr_str(account).lower()
        entries = self.badges.get(key, None)
        if entries is None:
            return json.dumps([])
        return json.dumps([
            {
                "kind": str(badge.kind),
                "case_id": int(badge.case_id),
                "minted_at": int(badge.minted_at_case_count),
            }
            for badge in entries
        ])

    @gl.public.view
    def get_holders(self) -> str:
        """The full roster of addresses that have earned at least one badge."""
        return json.dumps([addr for addr in self.roster])

    @gl.public.view
    def get_minted_count(self) -> int:
        return int(self.minted_count)

    @gl.public.view
    def get_court(self) -> str:
        return self.court.as_hex

    @gl.public.view
    def get_reputation(self) -> str:
        return self.reputation.as_hex

    @gl.public.view
    def get_badge_catalog(self) -> str:
        """Publish the full closed vocabulary so a frontend need not hard-code it."""
        return json.dumps(list(_ALL_BADGES))

    # ------------------------------------------------------------ internal

    def _court(self):
        return PriorArtCourt(self.court)

    def _reputation(self):
        return Reputation(self.reputation)

    def _maybe_award(self, account: Address, kind: str, case_id: int) -> None:
        """Idempotent single-badge mint. First mint also registers the roster row."""
        key = _addr_str(account).lower()
        holder_key = key + "|" + kind
        if self.holders.get(holder_key, False):
            return
        if key not in self.badges:
            self.roster.append(key)
        self.badges.get_or_insert_default(key).append(
            gl.storage.inmem_allocate(
                Badge, kind, u256(case_id), u256(int(self.minted_count))
            )
        )
        self.holders[holder_key] = True

    def _wins_for(self, account: Address) -> int:
        """
        How many wins the account has on the reputation ledger. Read live from
        the Reputation contract — mint_from_case is called after the court has
        settled, so any prior wins are already reflected there when the caller
        remembered to sync them.
        """
        try:
            record = json.loads(self._reputation().view().get_standing(account))
            return int(record.get("won", 0))
        except Exception:
            return 0


# --------------------------------------------------------------------- helpers


def _same(a: Address, b: Address) -> bool:
    try:
        return a.as_hex.lower() == b.as_hex.lower()
    except Exception:
        return str(a).lower() == str(b).lower()


def _zero_address() -> Address:
    return Address("0x" + "0" * 40)


def _to_address(value) -> Address:
    if isinstance(value, Address):
        return value
    if isinstance(value, (bytes, bytearray)):
        return Address(bytes(value))
    if isinstance(value, str):
        text = value.strip()
        if text.lower().startswith("0x"):
            text = text[2:]
        assert len(text) <= 40, "address: too long"
        return Address(bytes.fromhex(text.rjust(40, "0")))
    if isinstance(value, int):
        assert 0 <= value < (1 << 160), "address: out of range"
        return Address(value.to_bytes(20, "big"))
    assert False, "address: unsupported encoding"


def _addr_str(addr) -> str:
    address = _to_address(addr)
    try:
        return address.as_hex
    except Exception:
        return str(address)
