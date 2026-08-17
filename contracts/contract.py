# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
PriorArtCourt — a decentralized court for prior-art disputes. [INTELLIGENT]

Someone publishes a piece of work. Someone else publishes something that looks a
lot like it. Who decides whether that is copying, fair reuse, or coincidence?

Today the answer is: a platform. A moderation team, a DMCA queue, a GitHub abuse
report, a journal's editorial board. One private party, applying an unpublished
standard, with money and reputation on the line and no appeal you can inspect.

This contract replaces that private party with a court whose reasoning happens
on-chain and whose verdict is agreed by a validator set that cannot be lobbied.

    1. A complainant stakes a bond and files two URLs: the original, and the work
       alleged to copy it.
    2. The respondent may stake a matching counter-bond to contest.
    3. `adjudicate` fetches BOTH pages from the live web *inside the contract*,
       applies the plain-English doctrine registered for that category of work,
       and returns a verdict — under Optimistic Democracy. Every validator
       independently fetches and re-reasons; a custom validator function accepts
       their answers only when the VERDICT matches, never when the prose matches.
    4. The loser's bond pays the winner.

Why this cannot exist anywhere else:

  * The judgement is irreducibly subjective. "Substantial similarity of protected
    expression" is not a diff. Two texts can share 90% of their words and be a
    legitimate quotation; two texts can share no sentence and one still be a
    rip-off of the other's structure. No deterministic function decides this.
  * The evidence lives on the open web, and must be read at adjudication time.
    An oracle relaying "page A says X" would just reintroduce the trusted party
    this court exists to remove.
  * There is real money on the outcome, so a single AI service deciding it is
    exactly the failure mode — it can be bought, and it cannot be audited.

GenLayer is the only place where all three hold at once. That is the whole reason
this contract exists.

--- Where the guarantees come from -------------------------------------------

Consensus decides the VERDICT. Arithmetic decides the MONEY. The LLM is never
asked how much anyone should be paid; it is asked one categorical question, and
the payout is derived deterministically from bonds that were escrowed before the
question was asked. A fully compromised, unanimous validator set can still only
move the bonds that the parties themselves put up.

On top of that the contract refuses to settle when the model's own output is
internally inconsistent (INFRINGING with a trivial overlap figure), when the
model reports low confidence, or when the evidence could not be fetched. Those
cases escalate to an appeal that reads a THIRD source and decides precedence.
"""

from genlayer import *

from dataclasses import dataclass
import json


# ---------------------------------------------------------------- vocabulary

VERDICT_INFRINGING = "INFRINGING"
VERDICT_DERIVATIVE_FAIR = "DERIVATIVE_FAIR"
VERDICT_INDEPENDENT = "INDEPENDENT"
VERDICT_UNAVAILABLE = "EVIDENCE_UNAVAILABLE"
_VERDICTS = [
    VERDICT_INFRINGING,
    VERDICT_DERIVATIVE_FAIR,
    VERDICT_INDEPENDENT,
    VERDICT_UNAVAILABLE,
]

STATUS_FILED = "FILED"
STATUS_CONTESTED = "CONTESTED"
STATUS_ESCALATED = "ESCALATED"
STATUS_RESOLVED = "RESOLVED"
STATUS_WITHDRAWN = "WITHDRAWN"

PUBLISHER_ORIGIN = "ORIGIN"
PUBLISHER_ACCUSED = "ACCUSED"
PUBLISHER_UNCLEAR = "UNCLEAR"


# ------------------------------------------------------------------ thresholds

# Below this the court will not take the model's word for it. A close call that
# the adjudicator itself flags as close is exactly the case that deserves the
# second, three-source instance rather than a confident-looking payout.
CONFIDENCE_FLOOR = 70

# A verdict of INFRINGING that comes with a trivial overlap figure is the model
# contradicting itself. Rather than trust half of it, escalate.
MIN_OVERLAP_FOR_INFRINGING = 40

# How far two independent validators may differ on the overlap figure and still
# be judged to have reached the same conclusion. Wide on purpose: overlap is an
# estimate, the verdict is the decision, and a court that never reaches consensus
# is not a court. The verdict itself must match exactly.
OVERLAP_TOLERANCE = 25

# A page that renders to less than this is a 404, a paywall, a JS shell, or a
# cookie banner — not evidence.
MIN_EVIDENCE_CHARS = 200

# Keep the prompt bounded so a long page cannot blow the context and turn a real
# dispute into a parse failure. Both exhibits are truncated identically, so the
# comparison stays symmetric.
MAX_EVIDENCE_CHARS = 6000


class _Unavailable:
    """Sentinel prose for the two ways evidence can fail to arrive."""

    FETCH = "The court could not fetch one or both exhibits at adjudication time."
    THIN = "One or both exhibits rendered to too little text to adjudicate against."


# ------------------------------------------------------------------ interfaces


@gl.contract_interface
class PolicyRegistry:
    """The doctrine layer, as the court sees it. Read-only: doctrine is law, not state."""

    class View:
        def get_policy(self, category: str) -> str: ...

        def has_policy(self, category: str) -> bool: ...

        def get_revision(self, category: str) -> int: ...


# --------------------------------------------------------------------- storage


@allow_storage
@dataclass
class Case:
    complainant: Address
    respondent: Address
    category: str
    origin_url: str
    accused_url: str
    corroboration_url: str
    claim_text: str
    bond: bigint
    counter_bond: bigint
    appeal_fee: bigint
    appellant: Address
    status: str
    verdict: str
    overlap_pct: u8
    confidence: u8
    first_publisher: str
    reason: str
    instance: u8  # 0 = not yet heard, 1 = first instance, 2 = appeal (final)
    winner: Address
    payout: bigint


class Contract(gl.Contract):
    admin: Address
    policy_registry: Address

    case_count: u256
    cases: TreeMap[str, Case]  # keyed by str(case_id) — see R19

    # case_id -> JSON provenance entries, appended in chronological order
    history: TreeMap[str, DynArray[str]]

    # complainant / respondent address hex -> the case ids they are party to
    party_index: TreeMap[str, DynArray[u256]]

    # address hex -> GEN this account may pull out of the court
    withdrawable: TreeMap[str, bigint]

    # bonds forfeited by frivolous uncontested complaints
    forfeited_pool: bigint

    # append-only public docket, read by the UI
    docket: DynArray[str]

    def __init__(self, policy_registry: str) -> None:
        self.admin = gl.message.sender_address
        self.policy_registry = _to_address(policy_registry)
        self.case_count = 0
        self.forfeited_pool = bigint(0)

    # ---------------------------------------------------------------- internal

    def _policies(self):
        return PolicyRegistry(self.policy_registry)

    def _case(self, case_id: int) -> Case:
        key = str(case_id)
        assert key in self.cases, "court: unknown case"
        return self.cases[key]

    def _credit(self, account: Address, amount: int) -> None:
        """
        Credit a payout instead of pushing it.

        Pull payments, for two reasons. The obvious one is that a push inside a
        settlement can fail and take the whole verdict down with it. The
        GenLayer-specific one is that a value transfer is dispatched as a message,
        while a write to this contract's own storage lands the moment the
        transaction is accepted — so crediting here makes the settlement visible
        on-chain immediately, and `withdraw` moves the value separately.
        """
        if amount <= 0:
            return
        key = _addr_str(account)
        self.withdrawable[key] = bigint(int(self.withdrawable.get(key, bigint(0))) + amount)

    def _log(self, entry: dict) -> None:
        self.docket.append(json.dumps(entry))

    def _record(self, case_id: int, entry: dict) -> None:
        self.history.get_or_insert_default(str(case_id)).append(json.dumps(entry))

    def _index_party(self, account: Address, case_id: int) -> None:
        self.party_index.get_or_insert_default(_addr_str(account)).append(u256(case_id))

    # ------------------------------------------------------------ case lifecycle

    @gl.public.write.payable
    def file_case(
        self, category: str, origin_url: str, accused_url: str, claim_text: str
    ) -> None:
        """
        File a prior-art complaint, staking a bond on it.

        The bond is the anti-spam mechanism and the stake in one. Win, and it comes
        back (with the respondent's counter-bond, if the case was contested). Lose,
        and it is forfeited. Nothing about this court is free, on purpose: an
        adjudication costs every validator in the set an LLM run and two page
        fetches, and a complaint that costs nothing to file is a denial-of-service
        vector against the entire network.
        """
        bond = int(gl.message.value)
        assert bond > 0, "court: bond must be greater than zero"

        slug = category.strip().lower()
        assert self._policies().view().has_policy(slug), "court: no doctrine for this category"

        origin = origin_url.strip()
        accused = accused_url.strip()
        assert _is_http_url(origin), "court: origin_url must be an http(s) URL"
        assert _is_http_url(accused), "court: accused_url must be an http(s) URL"
        assert origin.lower() != accused.lower(), "court: both URLs point at the same page"
        assert len(claim_text.strip()) >= 20, "court: claim_text too thin to answer"

        case_id = int(self.case_count)
        self.case_count = u256(case_id + 1)

        complainant = gl.message.sender_address
        self.cases[str(case_id)] = gl.storage.inmem_allocate(
            Case,
            complainant,
            _zero_address(),
            slug,
            origin,
            accused,
            "",
            claim_text.strip(),
            bigint(bond),
            bigint(0),
            bigint(0),
            _zero_address(),
            STATUS_FILED,
            "",
            u8(0),
            u8(0),
            PUBLISHER_UNCLEAR,
            "",
            u8(0),
            _zero_address(),
            bigint(0),
        )

        self._index_party(complainant, case_id)
        self._record(
            case_id,
            {
                "kind": "filed",
                "complainant": _addr_str(complainant),
                "category": slug,
                "doctrine_revision": int(self._policies().view().get_revision(slug)),
                "bond": bond,
            },
        )
        self._log(
            {
                "kind": "filed",
                "case_id": case_id,
                "category": slug,
                "complainant": _addr_str(complainant),
                "bond": bond,
            }
        )

    @gl.public.write.payable
    def contest_case(self, case_id: int) -> None:
        """
        Contest a complaint by matching its bond.

        Matching is required rather than optional. A respondent who could contest
        for a token amount would turn every complaint into a coin flip with
        asymmetric downside for the complainant.
        """
        case = self._case(case_id)
        counter = int(gl.message.value)

        assert case.status == STATUS_FILED, "court: case is no longer open for contest"
        assert gl.message.sender_address != case.complainant, (
            "court: the complainant cannot contest their own case"
        )
        assert counter >= int(case.bond), (
            "court: counter-bond must at least match the complainant's bond"
        )

        respondent = gl.message.sender_address
        case.respondent = respondent
        case.counter_bond = bigint(counter)
        case.status = STATUS_CONTESTED

        self._index_party(respondent, case_id)
        self._record(
            case_id,
            {"kind": "contested", "respondent": _addr_str(respondent), "counter_bond": counter},
        )
        self._log({"kind": "contested", "case_id": case_id, "counter_bond": counter})

    @gl.public.write
    def withdraw_case(self, case_id: int) -> None:
        """Drop an uncontested complaint and take the bond back."""
        case = self._case(case_id)
        assert gl.message.sender_address == case.complainant, "court: complainant only"
        assert case.status == STATUS_FILED, "court: only an uncontested case may be withdrawn"

        refund = int(case.bond)
        case.status = STATUS_WITHDRAWN
        self._credit(case.complainant, refund)

        self._record(case_id, {"kind": "withdrawn", "refund": refund})
        self._log({"kind": "withdrawn", "case_id": case_id})

    # ------------------------------------------------------- first instance

    @gl.public.write
    def adjudicate(self, case_id: int) -> None:
        """
        [INTELLIGENT METHOD] — the first instance.

        Fetches both exhibits from the live web inside the contract, applies the
        registered doctrine, and decides. Runs under Optimistic Democracy: a leader
        validator reasons and proposes; every other validator independently fetches
        the same two pages, re-reasons from scratch, and the validator function
        below accepts only if they reached the SAME VERDICT.

        This is the line that decides whether the contract is a real court or a
        JSON-shaped decoration. Two validators that disagree about whether a work
        was copied must NOT be able to pass consensus by agreeing about the shape
        of the object they disagreed in.
        """
        case = self._case(case_id)
        assert case.status in (STATUS_FILED, STATUS_CONTESTED), (
            "court: case is not awaiting a first-instance hearing"
        )
        assert int(case.instance) == 0, "court: case has already been heard"

        # Read every piece of state BEFORE entering the non-deterministic block —
        # storage is not reachable from inside it. The closure captures these.
        category = str(case.category)
        origin_url = str(case.origin_url)
        accused_url = str(case.accused_url)
        claim_text = str(case.claim_text)
        doctrine = self._policies().view().get_policy(category)
        revision = int(self._policies().view().get_revision(category))

        def hear() -> str:
            exhibit_a = _fetch(origin_url)
            exhibit_b = _fetch(accused_url)
            if exhibit_a is None or exhibit_b is None:
                return _unavailable(_Unavailable.FETCH)
            if len(exhibit_a) < MIN_EVIDENCE_CHARS or len(exhibit_b) < MIN_EVIDENCE_CHARS:
                return _unavailable(_Unavailable.THIN)
            return _extract_json(gl.nondet.exec_prompt(_first_instance_prompt(
                category, doctrine, claim_text, origin_url, accused_url, exhibit_a, exhibit_b
            )))

        def agrees(leader_result) -> bool:
            """
            Accept the leader's opinion only if this validator reached the same
            decision — not the same words.

            Two honest LLM runs over the same two pages will phrase `reason`
            completely differently and will not land on the same `overlap_pct`.
            Comparing those literally would mean a court that can never reach a
            verdict. Comparing only the JSON shape would mean a court where one
            validator says INFRINGING, another says INDEPENDENT, and both pass —
            which is not a court at all.

            So: the verdict must match exactly, and the overlap estimate must be
            in the same neighbourhood. Confidence is deliberately NOT compared;
            it is the model's report on itself, it is the noisiest field, and the
            decision it drives (whether to escalate) is taken deterministically
            below from the value that actually reached consensus.
            """
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                theirs = json.loads(_as_text(leader_result.calldata))
                mine = json.loads(hear())
            except Exception:
                return False

            if _verdict_of(theirs) != _verdict_of(mine):
                return False
            return abs(_pct(theirs.get("overlap_pct")) - _pct(mine.get("overlap_pct"))) <= (
                OVERLAP_TOLERANCE
            )

        opinion = json.loads(gl.vm.run_nondet(hear, agrees))

        # Normalize defensively. A field that is missing or oddly typed must not
        # throw away a consensus round that a whole validator set just paid for.
        verdict = _verdict_of(opinion)
        overlap = _pct(opinion.get("overlap_pct"))
        confidence = _pct(opinion.get("confidence"))
        publisher = _publisher_of(opinion)
        reason = str(opinion.get("reason", ""))[:1200]

        case.verdict = verdict
        case.overlap_pct = u8(overlap)
        case.confidence = u8(confidence)
        case.first_publisher = publisher
        case.reason = reason
        case.instance = u8(1)

        self._record(
            case_id,
            {
                "kind": "first_instance",
                "verdict": verdict,
                "overlap_pct": overlap,
                "confidence": confidence,
                "first_publisher": publisher,
                "doctrine_revision": revision,
                "reason": reason,
            },
        )

        # --- deterministic review of the model's own answer -------------------
        # Consensus establishes that the validator set agreed. It does not
        # establish that what they agreed on is safe to move money over. These
        # three checks are arithmetic, they run after consensus, and any one of
        # them sends the case to the appeal instance instead of to settlement.
        if verdict == VERDICT_UNAVAILABLE:
            self._escalate(case_id, case, "evidence_unavailable")
            return
        if confidence < CONFIDENCE_FLOOR:
            self._escalate(case_id, case, "low_confidence")
            return
        if verdict == VERDICT_INFRINGING and overlap < MIN_OVERLAP_FOR_INFRINGING:
            self._escalate(case_id, case, "inconsistent_finding")
            return

        self._settle(case_id, case, verdict, publisher)

    # ------------------------------------------------------------ appeal

    @gl.public.write.payable
    def appeal(self, case_id: int, corroboration_url: str) -> None:
        """
        [INTELLIGENT METHOD] — the final instance.

        Only an escalated case may be appealed, and only once. That is a deliberate
        limit: an appeal exists because the first instance said it could not decide,
        not because a party disliked a decision it could. A settled case is final,
        and no payout is ever clawed back.

        The appeal differs from the first instance in kind, not just in degree. It
        reads THREE sources instead of two — the appellant must supply a
        corroborating URL (an archive snapshot, a repository history, a citation
        index, a dated third-party reference) — and it answers a question the first
        instance never asked: which work was published FIRST.

        That question matters more than similarity. If the accused page turns out to
        predate the "original", the complaint is not weak, it is inverted, and the
        court says so regardless of how similar the two works are. That inversion is
        applied deterministically after consensus, in `_settle`.
        """
        case = self._case(case_id)
        assert case.status == STATUS_ESCALATED, "court: only an escalated case may be appealed"
        assert int(case.instance) == 1, "court: this case has no first-instance finding to appeal"
        assert gl.message.sender_address in (case.complainant, case.respondent), (
            "court: only a party to the case may appeal"
        )

        fee = int(gl.message.value)
        assert fee > 0, "court: an appeal must carry a fee"

        corroboration = corroboration_url.strip()
        assert _is_http_url(corroboration), "court: corroboration_url must be an http(s) URL"

        category = str(case.category)
        origin_url = str(case.origin_url)
        accused_url = str(case.accused_url)
        claim_text = str(case.claim_text)
        first_finding = str(case.verdict)
        doctrine = self._policies().view().get_policy(category)

        case.corroboration_url = corroboration
        case.appeal_fee = bigint(fee)
        case.appellant = gl.message.sender_address

        def rehear() -> str:
            exhibit_a = _fetch(origin_url)
            exhibit_b = _fetch(accused_url)
            exhibit_c = _fetch(corroboration)
            if exhibit_a is None or exhibit_b is None:
                return _unavailable(_Unavailable.FETCH)
            if len(exhibit_a) < MIN_EVIDENCE_CHARS or len(exhibit_b) < MIN_EVIDENCE_CHARS:
                return _unavailable(_Unavailable.THIN)
            return _extract_json(gl.nondet.exec_prompt(_appeal_prompt(
                category,
                doctrine,
                claim_text,
                first_finding,
                origin_url,
                accused_url,
                corroboration,
                exhibit_a,
                exhibit_b,
                exhibit_c if exhibit_c is not None else "(the corroborating source could not be fetched)",
            )))

        def agrees(leader_result) -> bool:
            """
            The final instance is judged on both of the things it decides.

            A verdict match alone is not enough here, because the appeal's own
            inversion rule keys off `first_publisher`: two validators who agree the
            works are similar but disagree about who published first have NOT
            agreed on the outcome of this case, they have agreed on its facts and
            split on its result. Overlap is not compared at all at this instance —
            it stopped being load-bearing once precedence entered the question.
            """
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                theirs = json.loads(_as_text(leader_result.calldata))
                mine = json.loads(rehear())
            except Exception:
                return False
            return (
                _verdict_of(theirs) == _verdict_of(mine)
                and _publisher_of(theirs) == _publisher_of(mine)
            )

        opinion = json.loads(gl.vm.run_nondet(rehear, agrees))

        verdict = _verdict_of(opinion)
        overlap = _pct(opinion.get("overlap_pct"))
        confidence = _pct(opinion.get("confidence"))
        publisher = _publisher_of(opinion)
        reason = str(opinion.get("reason", ""))[:1200]

        case.verdict = verdict
        case.overlap_pct = u8(overlap)
        case.confidence = u8(confidence)
        case.first_publisher = publisher
        case.reason = reason
        case.instance = u8(2)

        self._record(
            case_id,
            {
                "kind": "appeal",
                "appellant": _addr_str(gl.message.sender_address),
                "corroboration_url": corroboration,
                "verdict": verdict,
                "overlap_pct": overlap,
                "confidence": confidence,
                "first_publisher": publisher,
                "reason": reason,
                "fee": fee,
            },
        )

        # The appeal is the last instance, so it must always terminate the case.
        # If even three sources could not be read, nobody wins: every stake goes
        # back to whoever put it up. A court that cannot see the evidence has no
        # business redistributing money over it.
        if verdict == VERDICT_UNAVAILABLE:
            self._refund_all(case_id, case)
            return

        self._settle(case_id, case, verdict, publisher)

    # ---------------------------------------------------------- settlement

    def _escalate(self, case_id: int, case: Case, ground: str) -> None:
        case.status = STATUS_ESCALATED
        self._record(case_id, {"kind": "escalated", "ground": ground})
        self._log({"kind": "escalated", "case_id": case_id, "ground": ground})

    def _settle(self, case_id: int, case: Case, verdict: str, publisher: str) -> None:
        """
        Turn a verdict into money. No LLM output reaches this function as a number.

        The pot is the sum of what the parties escrowed, and nothing else. The
        verdict picks which of two addresses it goes to. That is the entire
        arithmetic, and it is why a compromised validator set cannot mint value
        here: the worst it can do is hand one party's own stake to the other.
        """
        complainant_wins = verdict == VERDICT_INFRINGING

        # Precedence inverts the complaint outright. Established at the appeal
        # instance only, where the court actually looked for it.
        if int(case.instance) >= 2 and publisher == PUBLISHER_ACCUSED:
            complainant_wins = False

        pot = int(case.bond) + int(case.counter_bond) + int(case.appeal_fee)
        contested = case.respondent != _zero_address()

        if contested:
            winner = case.complainant if complainant_wins else case.respondent
            payout = pot
            self._credit(winner, payout)
        elif complainant_wins:
            # Vindicated, but there is no counterparty to collect from — an
            # uncontested complaint returns its own stake and nothing more.
            winner = case.complainant
            payout = pot
            self._credit(winner, payout)
        else:
            # A complaint nobody bothered to contest, that the court then rejected.
            # The bond is forfeited: this is what makes filing rubbish expensive.
            winner = _zero_address()
            payout = 0
            self.forfeited_pool = bigint(int(self.forfeited_pool) + pot)

        case.status = STATUS_RESOLVED
        case.winner = winner
        case.payout = bigint(payout)

        self._record(
            case_id,
            {
                "kind": "settled",
                "verdict": verdict,
                "winner": _addr_str(winner),
                "payout": payout,
                "contested": contested,
                "instance": int(case.instance),
            },
        )
        self._log(
            {
                "kind": "settled",
                "case_id": case_id,
                "verdict": verdict,
                "winner": _addr_str(winner),
                "payout": payout,
            }
        )

    def _refund_all(self, case_id: int, case: Case) -> None:
        """Unwind every stake to whoever put it up. Nobody wins, nobody is charged."""
        self._credit(case.complainant, int(case.bond))
        self._credit(case.appellant, int(case.appeal_fee))
        if case.respondent != _zero_address():
            self._credit(case.respondent, int(case.counter_bond))

        case.status = STATUS_RESOLVED
        case.winner = _zero_address()
        case.payout = bigint(0)

        self._record(case_id, {"kind": "settled", "verdict": VERDICT_UNAVAILABLE, "refunded": True})
        self._log({"kind": "settled", "case_id": case_id, "verdict": VERDICT_UNAVAILABLE})

    # ------------------------------------------------------------- payouts

    @gl.public.write
    def withdraw(self) -> None:
        """Pull whatever the court owes you. Balance is zeroed before the transfer."""
        account = gl.message.sender_address
        key = _addr_str(account)
        amount = int(self.withdrawable.get(key, bigint(0)))
        assert amount > 0, "court: nothing to withdraw"

        self.withdrawable[key] = bigint(0)

        # `on='accepted'` rather than the SDK default of 'finalized'.
        #
        # The default is the right one for a transfer emitted from inside a
        # decision that might still be unwound. This is not that: `withdraw` is a
        # standalone transaction whose only input is a balance that was already
        # committed by an earlier settlement, and which this call has already
        # zeroed. There is nothing here for finalization to protect. What
        # finalization would cost is real — on hosted studionet, finalization is
        # not reliably triggerable, and a payout that waits for it is a payout the
        # winner never receives.
        gl.get_contract_at(account).emit_transfer(value=u256(amount), on="accepted")

    @gl.public.write
    def sweep_forfeited(self) -> None:
        """Move forfeited bonds to the admin's withdrawable balance."""
        assert gl.message.sender_address == self.admin, "court: admin only"
        amount = int(self.forfeited_pool)
        assert amount > 0, "court: nothing forfeited"
        self.forfeited_pool = bigint(0)
        self._credit(self.admin, amount)

    # --------------------------------------------------------------- views

    @gl.public.view
    def get_case(self, case_id: int) -> str:
        return json.dumps(self._case_dict(case_id))

    @gl.public.view
    def get_cases(self, limit: int) -> str:
        """Newest first. `limit <= 0` returns the whole docket."""
        total = int(self.case_count)
        count = total if limit <= 0 else min(limit, total)
        return json.dumps([self._case_dict(i) for i in range(total - 1, total - count - 1, -1)])

    @gl.public.view
    def get_cases_for(self, account: Address) -> str:
        ids = self.party_index.get(_addr_str(account), None)
        if ids is None:
            return json.dumps([])
        return json.dumps([self._case_dict(int(i)) for i in ids])

    @gl.public.view
    def get_history(self, case_id: int) -> str:
        entries = self.history.get(str(case_id), None)
        if entries is None:
            return json.dumps([])
        return json.dumps([json.loads(e) for e in entries])

    @gl.public.view
    def get_docket(self, limit: int) -> str:
        total = len(self.docket)
        start = 0 if limit <= 0 or limit >= total else total - limit
        return json.dumps([json.loads(self.docket[i]) for i in range(start, total)])

    @gl.public.view
    def get_case_count(self) -> int:
        return int(self.case_count)

    @gl.public.view
    def get_withdrawable(self, account: Address) -> str:
        return str(int(self.withdrawable.get(_addr_str(account), bigint(0))))

    @gl.public.view
    def get_forfeited_pool(self) -> str:
        return str(int(self.forfeited_pool))

    @gl.public.view
    def get_policy_registry(self) -> str:
        return self.policy_registry.as_hex

    def _case_dict(self, case_id: int) -> dict:
        case = self._case(case_id)
        return {
            "case_id": case_id,
            "complainant": _addr_str(case.complainant),
            "respondent": _addr_str(case.respondent),
            "category": str(case.category),
            "origin_url": str(case.origin_url),
            "accused_url": str(case.accused_url),
            "corroboration_url": str(case.corroboration_url),
            "claim_text": str(case.claim_text),
            "bond": str(int(case.bond)),
            "counter_bond": str(int(case.counter_bond)),
            "appeal_fee": str(int(case.appeal_fee)),
            "appellant": _addr_str(case.appellant),
            "status": str(case.status),
            "verdict": str(case.verdict),
            "overlap_pct": int(case.overlap_pct),
            "confidence": int(case.confidence),
            "first_publisher": str(case.first_publisher),
            "reason": str(case.reason),
            "instance": int(case.instance),
            "winner": _addr_str(case.winner),
            "payout": str(int(case.payout)),
        }


# ----------------------------------------------------------------- prompts


def _first_instance_prompt(
    category: str,
    doctrine: str,
    claim_text: str,
    origin_url: str,
    accused_url: str,
    exhibit_a: str,
    exhibit_b: str,
) -> str:
    return f"""You are sitting as an impartial adjudicator in a prior-art dispute. You
apply the doctrine you are given, and nothing else. You are not asked what is fair
in general, what the law is in any particular country, or what you would prefer.

DISPUTE CATEGORY: {category}

GOVERNING DOCTRINE — this is the standard you must apply:
{doctrine}

THE COMPLAINT, as written by the party alleging copying:
{claim_text}

EXHIBIT A — the work claimed as the original, fetched from {origin_url}:
<<<EXHIBIT_A
{_truncate(exhibit_a)}
EXHIBIT_A>>>

EXHIBIT B — the work alleged to copy it, fetched from {accused_url}:
<<<EXHIBIT_B
{_truncate(exhibit_b)}
EXHIBIT_B>>>

Decide the following, and be strict with yourself about each one:

- verdict: EXACTLY one of
    INFRINGING       B reproduces protected expression from A beyond what the
                     doctrine above permits.
    DERIVATIVE_FAIR  B is clearly built on A, but stays inside what the doctrine
                     permits: quotation, citation, commentary, parody, or genuine
                     transformation.
    INDEPENDENT      B is not derived from A at all. Any resemblance comes from
                     shared subject matter, shared facts, or convention.

- overlap_pct: 0-100. The share of B's PROTECTED EXPRESSION that is traceable to A.
  Shared facts, shared ideas, technical terminology, standard structure and common
  phrasing are NOT overlap. Only expression counts. Two documents about the same
  topic start at 0, not at 50.

- confidence: 0-100. How confident you are in the verdict, honestly. Report a LOW
  number when the exhibits are truncated or thin, when the works are in different
  formats, or when the call is genuinely close. Understating your confidence sends
  the case to a fuller hearing; overstating it moves money on a coin flip.

- first_publisher: ORIGIN, ACCUSED, or UNCLEAR. Which exhibit carries evidence in
  its own text — dates, version numbers, references to the other — of having been
  published first. Answer UNCLEAR unless the pages themselves show it. Do not guess
  from tone or quality.

- reason: 2 to 4 sentences, addressed to the losing party. Point at the specific
  passages, structures or elements that decided it. Do not restate the doctrine.

Reply with ONLY valid JSON, no prose, no markdown fences:
{{"verdict": str, "overlap_pct": int, "confidence": int, "first_publisher": str,
  "reason": str}}"""


def _appeal_prompt(
    category: str,
    doctrine: str,
    claim_text: str,
    first_finding: str,
    origin_url: str,
    accused_url: str,
    corroboration_url: str,
    exhibit_a: str,
    exhibit_b: str,
    exhibit_c: str,
) -> str:
    return f"""You are sitting as the FINAL instance in a prior-art dispute. The first
instance could not decide it safely — its finding was '{first_finding}' — so the case
comes to you with a third source, and with one extra question that the first
instance did not answer.

Your decision ends the case. Nothing is escalated after you.

DISPUTE CATEGORY: {category}

GOVERNING DOCTRINE — the standard you must apply:
{doctrine}

THE COMPLAINT, as written by the party alleging copying:
{claim_text}

EXHIBIT A — claimed original, fetched from {origin_url}:
<<<EXHIBIT_A
{_truncate(exhibit_a)}
EXHIBIT_A>>>

EXHIBIT B — work alleged to copy it, fetched from {accused_url}:
<<<EXHIBIT_B
{_truncate(exhibit_b)}
EXHIBIT_B>>>

EXHIBIT C — corroborating source submitted on appeal, fetched from {corroboration_url}:
<<<EXHIBIT_C
{_truncate(exhibit_c)}
EXHIBIT_C>>>

Answer, in this order of importance:

- first_publisher: ORIGIN, ACCUSED, or UNCLEAR. This is the question the appeal
  exists to settle. Use Exhibit C as your primary evidence for it — an archive
  snapshot, a commit or revision history, a citation index, a dated reference.
  Cross-check it against dates, version markers and cross-references inside A and B
  themselves. Answer ACCUSED if the evidence shows the accused work came first: a
  complaint against a work that predates the "original" is not a weak complaint, it
  is an inverted one, and saying so is the single most useful thing you can do here.
  Answer UNCLEAR only if all three exhibits are genuinely silent on timing.

- verdict: EXACTLY one of INFRINGING, DERIVATIVE_FAIR, INDEPENDENT, applying the
  doctrine to A and B as the first instance did — but now with Exhibit C in front of
  you. If C shows the material in dispute was already public in a third place before
  either party used it, neither party owns that expression, and the verdict is
  INDEPENDENT.

- overlap_pct: 0-100, share of B's protected expression traceable to A. Facts,
  ideas, terminology and convention are not overlap.

- confidence: 0-100, honest. It no longer changes the outcome at this instance, but
  it is recorded with your decision permanently.

- reason: 2 to 4 sentences. State plainly what Exhibit C established, and how that
  changed or confirmed the first instance's finding.

Reply with ONLY valid JSON, no prose, no markdown fences:
{{"verdict": str, "overlap_pct": int, "confidence": int, "first_publisher": str,
  "reason": str}}"""


# ------------------------------------------------------------------- helpers


def _fetch(url: str):
    """
    Fetch a page from inside the non-deterministic block. Returns None on failure.

    A dead link, a timeout or a TLS error is a fact about the evidence, not a bug in
    the contract — it must become a verdict of EVIDENCE_UNAVAILABLE that every
    validator can independently reproduce, not an exception that aborts the round
    and leaves the case stuck in FILED forever.
    """
    try:
        return gl.nondet.web.render(url, mode="text")
    except Exception:
        return None


def _unavailable(note: str) -> str:
    return json.dumps(
        {
            "verdict": VERDICT_UNAVAILABLE,
            "overlap_pct": 0,
            "confidence": 0,
            "first_publisher": PUBLISHER_UNCLEAR,
            "reason": note,
        }
    )


def _truncate(text: str) -> str:
    if len(text) <= MAX_EVIDENCE_CHARS:
        return text
    return text[:MAX_EVIDENCE_CHARS] + "\n[exhibit truncated for length]"


def _extract_json(raw) -> str:
    """
    Reduce whatever the model returned to a JSON object string.

    `exec_prompt` hands back plain text on-chain, but a runtime configured for
    structured output hands back an already-decoded object instead. Both are the
    same answer, so both are accepted here rather than one of them being a crash.
    The rest is the usual cleanup: models wrap JSON in markdown fences and bracket
    it with prose, and neither is a reason to throw away a consensus round.
    """
    if isinstance(raw, (dict, list)):
        return json.dumps(raw)

    fence = "`" * 3
    text = str(raw).replace(fence + "json", "").replace(fence, "").strip()
    start = text.find("{")
    end = text.rfind("}")
    assert start != -1 and end > start, "court: adjudicator did not return a JSON object"
    return text[start : end + 1]


def _as_text(payload) -> str:
    """The leader's payload arrives as str, bytes or already-decoded JSON."""
    if isinstance(payload, str):
        return payload
    if isinstance(payload, (bytes, bytearray)):
        return bytes(payload).decode("utf-8", "replace")
    return json.dumps(payload)


def _verdict_of(opinion) -> str:
    """Coerce whatever the model said into one of the four verdicts this court knows."""
    if not isinstance(opinion, dict):
        return VERDICT_UNAVAILABLE
    raw = str(opinion.get("verdict", "")).strip().upper().replace(" ", "_")
    return raw if raw in _VERDICTS else VERDICT_UNAVAILABLE


def _publisher_of(opinion) -> str:
    if not isinstance(opinion, dict):
        return PUBLISHER_UNCLEAR
    raw = str(opinion.get("first_publisher", "")).strip().upper()
    return raw if raw in (PUBLISHER_ORIGIN, PUBLISHER_ACCUSED, PUBLISHER_UNCLEAR) else (
        PUBLISHER_UNCLEAR
    )


def _pct(value) -> int:
    """Clamp anything the model offers as a percentage into 0-100."""
    try:
        number = int(float(value))
    except (TypeError, ValueError):
        return 0
    return max(0, min(100, number))


def _is_http_url(url: str) -> bool:
    lowered = url.strip().lower()
    return (lowered.startswith("http://") or lowered.startswith("https://")) and len(lowered) > 12


def _to_address(value) -> Address:
    """
    Coerce a caller-supplied address into an `Address`, whatever form it arrived in.

    Deployment clients do not agree on how to encode an address argument. Studio's
    deploy form sends a hex literal through as an integer; the Python SDK sends a
    `CalldataAddress`; a hand-written call may send the hex string. Only the last
    two would reach a bare `Address` annotation intact, and the failure mode of the
    first is opaque — the assignment blows up deep inside the storage layer with
    `'int' object has no attribute 'as_bytes'`.

    Normalizing here means the contract deploys identically from Studio, from the
    CLI, and from the test VM.
    """
    if isinstance(value, Address):
        return value
    if isinstance(value, (bytes, bytearray)):
        return Address(bytes(value))
    if isinstance(value, str):
        text = value.strip()
        if text.lower().startswith("0x"):
            text = text[2:]
        assert len(text) <= 40, "address: too long to be a 20-byte address"
        return Address(bytes.fromhex(text.rjust(40, "0")))
    if isinstance(value, int):
        assert 0 <= value < (1 << 160), "address: out of range for 20 bytes"
        return Address(value.to_bytes(20, "big"))
    assert False, "address: unsupported address encoding"


def _addr_str(addr) -> str:
    """Stable string form of an address — `as_hex` is not present on every build."""
    address = _to_address(addr)
    try:
        return address.as_hex
    except Exception:
        return str(address)


def _zero_address() -> Address:
    return Address("0x" + "0" * 40)
