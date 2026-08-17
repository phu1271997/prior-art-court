# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
Reputation — the standing of every party who has ever appeared before the court.

A court that only moves money forgets. This contract remembers: who files
complaints that hold up, who contests and wins, and who files rubbish and forfeits
a bond for it. Standing is public, permanent, and derived from nothing but decided
cases.

--- Why this contract PULLS instead of being PUSHED ---------------------------

The obvious design is for the court to call into this contract when it settles a
case. That design is wrong here, and the reason is specific to GenLayer: a
cross-contract WRITE is dispatched as a message at finalization, while a write to a
contract's own storage lands the moment the transaction is accepted. Wiring
settlement to a cross-contract write would make the court's most important
operation depend on a second, later step — and a settlement that has moved money
but not recorded reputation is a settlement that is half done.

So the direction is inverted. Nothing calls this contract. This contract reads the
court, which is a synchronous cross-contract VIEW, and updates its own storage.
`sync_case` is permissionless: anyone may advance the record, nobody may forge it,
and the court's settlement never waits on it.
"""

from genlayer import *

from dataclasses import dataclass
import json


BASE_STANDING = 100
POINTS_PER_WIN = 15
PENALTY_PER_LOSS = 20
PENALTY_PER_FORFEIT = 30

STATUS_RESOLVED = "RESOLVED"
VERDICT_INFRINGING = "INFRINGING"
VERDICT_UNAVAILABLE = "EVIDENCE_UNAVAILABLE"
ZERO_ADDRESS = "0x" + "0" * 40


@gl.contract_interface
class PriorArtCourt:
    """The court, as the reputation layer sees it. Views only, on purpose."""

    class View:
        def get_case(self, case_id: int) -> str: ...

        def get_case_count(self) -> int: ...


@allow_storage
@dataclass
class Record:
    filed: u256  # complaints brought
    contested: u256  # complaints defended against
    won: u256  # decided in this party's favour
    lost: u256  # decided against them, with a counterparty collecting
    forfeited: u256  # uncontested complaints the court rejected outright
    undecided: u256  # cases that ended with the evidence unreadable


class Contract(gl.Contract):
    admin: Address
    court: Address

    # str(case_id) -> already folded into the record
    synced: TreeMap[str, bool]
    synced_count: u256

    # address hex -> that party's record
    records: TreeMap[str, Record]
    parties: DynArray[str]

    def __init__(self, court: Address) -> None:
        self.admin = gl.message.sender_address
        self.court = court
        self.synced_count = 0

    # ---------------------------------------------------------------- internal

    def _record_for(self, address_hex: str) -> Record:
        key = address_hex.strip().lower()
        if key not in self.records:
            self.parties.append(key)
            self.records[key] = gl.storage.inmem_allocate(
                Record, u256(0), u256(0), u256(0), u256(0), u256(0), u256(0)
            )
        return self.records[key]

    def _standing(self, record: Record) -> int:
        raw = (
            BASE_STANDING
            + POINTS_PER_WIN * int(record.won)
            - PENALTY_PER_LOSS * int(record.lost)
            - PENALTY_PER_FORFEIT * int(record.forfeited)
        )
        return max(0, raw)

    def _record_dict(self, address_hex: str) -> dict:
        key = address_hex.strip().lower()
        if key not in self.records:
            return {
                "address": key,
                "filed": 0,
                "contested": 0,
                "won": 0,
                "lost": 0,
                "forfeited": 0,
                "undecided": 0,
                "standing": BASE_STANDING,
            }
        record = self.records[key]
        return {
            "address": key,
            "filed": int(record.filed),
            "contested": int(record.contested),
            "won": int(record.won),
            "lost": int(record.lost),
            "forfeited": int(record.forfeited),
            "undecided": int(record.undecided),
            "standing": self._standing(record),
        }

    # ------------------------------------------------------------------ writes

    @gl.public.write
    def sync_case(self, case_id: int) -> None:
        """
        Fold one settled case into the permanent record. Permissionless.

        Reads the case from the court as a view — synchronous, same transaction —
        and writes only to this contract's own storage. Refuses anything that is
        not finished, and refuses to count the same case twice.
        """
        key = str(case_id)
        assert key not in self.synced, "reputation: case already recorded"

        case = json.loads(PriorArtCourt(self.court).view().get_case(case_id))
        assert str(case.get("status", "")) == STATUS_RESOLVED, (
            "reputation: case is not resolved yet"
        )

        complainant = str(case.get("complainant", "")).strip().lower()
        respondent = str(case.get("respondent", "")).strip().lower()
        verdict = str(case.get("verdict", ""))
        winner = str(case.get("winner", "")).strip().lower()
        contested = respondent != "" and respondent != ZERO_ADDRESS

        complainant_record = self._record_for(complainant)
        complainant_record.filed = u256(int(complainant_record.filed) + 1)

        if verdict == VERDICT_UNAVAILABLE:
            # Nobody's fault, nobody's credit — the evidence simply could not be
            # read. Counting this as a loss would punish a party for a dead link.
            complainant_record.undecided = u256(int(complainant_record.undecided) + 1)
            if contested:
                respondent_record = self._record_for(respondent)
                respondent_record.contested = u256(int(respondent_record.contested) + 1)
                respondent_record.undecided = u256(int(respondent_record.undecided) + 1)
        elif contested:
            respondent_record = self._record_for(respondent)
            respondent_record.contested = u256(int(respondent_record.contested) + 1)
            if winner == complainant:
                complainant_record.won = u256(int(complainant_record.won) + 1)
                respondent_record.lost = u256(int(respondent_record.lost) + 1)
            else:
                respondent_record.won = u256(int(respondent_record.won) + 1)
                complainant_record.lost = u256(int(complainant_record.lost) + 1)
        elif verdict == VERDICT_INFRINGING:
            complainant_record.won = u256(int(complainant_record.won) + 1)
        else:
            # Uncontested and rejected: the bond was forfeited. This is the entry
            # that makes filing rubbish expensive twice over.
            complainant_record.forfeited = u256(int(complainant_record.forfeited) + 1)

        self.synced[key] = True
        self.synced_count = u256(int(self.synced_count) + 1)

    @gl.public.write
    def sync_recent(self, limit: int) -> None:
        """
        Fold up to `limit` of the most recent settled cases, skipping any that are
        unfinished or already recorded. Convenience for the UI's "refresh standings".
        """
        assert limit > 0, "reputation: limit must be positive"
        total = int(PriorArtCourt(self.court).view().get_case_count())
        scanned = 0
        case_id = total - 1

        while case_id >= 0 and scanned < limit:
            scanned = scanned + 1
            key = str(case_id)
            case_id = case_id - 1
            if key in self.synced:
                continue
            case = json.loads(PriorArtCourt(self.court).view().get_case(int(key)))
            if str(case.get("status", "")) != STATUS_RESOLVED:
                continue
            self.sync_case(int(key))

    @gl.public.write
    def set_court(self, court: Address) -> None:
        """Repoint at a redeployed court. Admin only — the records themselves stay."""
        assert gl.message.sender_address == self.admin, "reputation: admin only"
        self.court = court

    # ------------------------------------------------------------------- views

    @gl.public.view
    def get_standing(self, account: Address) -> str:
        return json.dumps(self._record_dict(_addr_str(account)))

    @gl.public.view
    def get_leaderboard(self, limit: int) -> str:
        """Every party the court has decided on, best standing first."""
        rows = [self._record_dict(p) for p in self.parties]
        rows.sort(key=lambda r: (-r["standing"], -r["won"], r["address"]))
        if limit > 0:
            rows = rows[:limit]
        return json.dumps(rows)

    @gl.public.view
    def get_synced_count(self) -> int:
        return int(self.synced_count)

    @gl.public.view
    def is_synced(self, case_id: int) -> bool:
        return str(case_id) in self.synced

    @gl.public.view
    def get_court(self) -> str:
        return self.court.as_hex


def _addr_str(addr: Address) -> str:
    try:
        return addr.as_hex
    except Exception:
        return str(addr)
