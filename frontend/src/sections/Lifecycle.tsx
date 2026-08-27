const LIFECYCLE: Array<{ step: string; title: string; body: string; kind: "party" | "court" }> = [
  {
    step: "1",
    title: "File",
    kind: "party",
    body: "Complainant stakes a bond and posts two URLs: the original, and the work alleged to copy it.",
  },
  {
    step: "2",
    title: "Contest",
    kind: "party",
    body: "Respondent may stake a matching counter-bond. Silence is a choice, and it has a price.",
  },
  {
    step: "3",
    title: "Hear",
    kind: "court",
    body: "The court fetches both pages on-chain, applies the doctrine, reasons. Every validator repeats the work independently.",
  },
  {
    step: "4",
    title: "Escalate",
    kind: "court",
    body: "Close calls, self-contradictions, or unreadable evidence move the case to a three-source appeal.",
  },
  {
    step: "5",
    title: "Collect",
    kind: "party",
    body: "The winner withdraws the pot. Every step is on the docket, inspectable on the Studio explorer.",
  },
];

export function Lifecycle() {
  return (
    <section id="how-it-works" className="marketing-section lifecycle-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">How a case moves through the court</span>
          <h2>Five steps, from filing to withdrawal.</h2>
          <p className="lede">
            Two of the five steps are performed by the parties. Three are
            performed by the court itself, reading and reasoning on-chain.
          </p>
        </header>

        <ol className="lifecycle" aria-label="Case lifecycle">
          {LIFECYCLE.map((entry) => (
            <li key={entry.step} className={`lifecycle-step lifecycle-${entry.kind}`}>
              <div className="lifecycle-marker" aria-hidden="true">
                <span className="lifecycle-num">{entry.step}</span>
              </div>
              <div className="lifecycle-content">
                <h3>{entry.title}</h3>
                <p>{entry.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="lifecycle-legend">
          <span className="lifecycle-swatch lifecycle-party" aria-hidden="true" />{" "}
          Parties act.{" "}
          <span className="lifecycle-swatch lifecycle-court" aria-hidden="true" />{" "}
          The court hears.
        </p>
      </div>
    </section>
  );
}
