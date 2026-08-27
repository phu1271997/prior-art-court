const SIGNALS = [
  {
    label: "Signal 01",
    trigger: "Confidence below 70",
    body: "The adjudicator itself flagged the call as close. Rather than move money on a coin flip, the court sends the case up.",
    verdict: "escalate → appeal",
  },
  {
    label: "Signal 02",
    trigger: "INFRINGING at overlap below 40",
    body: "The verdict contradicts the estimate. Half an answer is not an answer, and half an answer that pays out is a payout the loser can rightly dispute.",
    verdict: "escalate → appeal",
  },
  {
    label: "Signal 03",
    trigger: "EVIDENCE_UNAVAILABLE",
    body: "One of the pages could not be fetched, timed out, or rendered to less than 200 characters of real text. Every validator sees the same failure, so the round still holds; it just does not settle.",
    verdict: "escalate → appeal → refund all",
  },
];

export function Signals() {
  return (
    <section id="signals" className="marketing-section signals-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">The signals the court refuses to settle on</span>
          <h2>Consensus is not the same thing as trust.</h2>
          <p className="lede">
            Validators agreeing on an answer establishes that they agreed.
            It does not establish that the answer is safe to move money over.
            Three arithmetic checks run after consensus. Any one of them
            sends the case to the appeal instance instead of to settlement.
          </p>
        </header>

        <div className="signals-list">
          {SIGNALS.map((s) => (
            <article key={s.trigger} className="signal-row">
              <div className="signal-label">{s.label}</div>
              <div className="signal-body">
                <h3>{s.trigger}</h3>
                <p>{s.body}</p>
              </div>
              <div className="signal-outcome">
                <span>Outcome</span>
                <code>{s.verdict}</code>
              </div>
            </article>
          ))}
        </div>

        <p className="signals-footnote">
          The appeal always terminates the case. If even three sources still
          cannot be read, every stake goes back to whoever put it up. A court
          that cannot see the evidence has no business redistributing money
          over it.
        </p>
      </div>
    </section>
  );
}
