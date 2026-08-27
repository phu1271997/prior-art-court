export function Consensus() {
  return (
    <section id="consensus" className="marketing-section consensus-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">What consensus actually decides</span>
          <h2>Consensus decides the verdict. Arithmetic decides the money.</h2>
          <p className="lede">
            The adjudicator is never asked how much anyone should be paid. It
            answers one categorical question, and the payout is derived from
            bonds that were escrowed before the question was asked. A fully
            compromised, unanimous validator set can therefore still only
            move the stakes the parties themselves put up.
          </p>
        </header>

        <div className="consensus-split">
          <article className="consensus-cell">
            <span className="consensus-label">Consensus</span>
            <h3>Validators must agree on the finding, not the wording.</h3>
            <p>
              Every validator independently fetches both pages and re-reasons.
              A leader proposes; the rest accept only if they reached the same
              verdict, and the same overlap percentage give-or-take a
              tolerance. Two validators who write different reasons but reach
              the same finding still agree. Two who reach opposite findings
              do not pass, even if their JSON matches.
            </p>
            <pre className="consensus-snippet">
              <code>{`def agrees(leader_result) -> bool:
    theirs = json.loads(leader_result.calldata)
    mine   = json.loads(hear())
    if theirs["verdict"] != mine["verdict"]:
        return False
    return abs(theirs["overlap_pct"]
             - mine["overlap_pct"]) <= 25`}</code>
            </pre>
          </article>

          <article className="consensus-cell">
            <span className="consensus-label">Arithmetic</span>
            <h3>The pot is fixed before the hearing.</h3>
            <p>
              Pot equals complainant bond plus counter-bond plus appeal fee.
              The verdict picks which of two addresses receives it. That is
              the entire arithmetic, and it is why a compromised validator
              set cannot mint value here: the worst it can do is hand one
              party's own stake to the other.
            </p>
            <pre className="consensus-snippet">
              <code>{`pot     = complainant_bond
        + counter_bond
        + appeal_fee
winner  = complainant if verdict is INFRINGING
          else respondent`}</code>
            </pre>
          </article>
        </div>
      </div>
    </section>
  );
}
