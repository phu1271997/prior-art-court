const ROWS = [
  {
    dimension: "The standard",
    platform: "Unpublished. In the moderator's head.",
    ai: "Whatever the vendor put in the system prompt this week.",
    court: "Public English paragraph, revision-locked on-chain, read verbatim at hearing time.",
  },
  {
    dimension: "The judge",
    platform: "The same platform hosting the accused work and collecting its fees.",
    ai: "A single server, opaque, tunable by whoever owns the keys.",
    court: "Decentralized validator set, each running its own model, agreeing on the verdict.",
  },
  {
    dimension: "The evidence",
    platform: "A screenshot uploaded by the complainant.",
    ai: "Whatever the API caller pasted into the prompt.",
    court: "Fetched from the live web inside the contract, at hearing time.",
  },
  {
    dimension: "The appeal",
    platform: "Reviewed by the same team, upheld.",
    ai: "Rerun the prompt, get the same answer.",
    court: "Second instance with a third source and precedence as an extra question.",
  },
  {
    dimension: "The reasoning",
    platform: "Not disclosed.",
    ai: "Disclosed but unverifiable — you cannot rerun the state that produced it.",
    court: "On the docket, with the transaction hash and the exact doctrine revision applied.",
  },
  {
    dimension: "Cost of a wrong call",
    platform: "Borne by the smaller party.",
    ai: "Borne by the smaller party.",
    court: "Bond forfeited by the loser. The judge earns nothing beyond gas.",
  },
];

export function Compare() {
  return (
    <section id="compare" className="marketing-section compare-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">How this differs from the alternatives</span>
          <h2>Every column exists today. Only one is inspectable.</h2>
          <p className="lede">
            Platform moderation and single-vendor AI both answer the same
            question the court answers. The difference is who can check the
            answer, who can see the standard, and who gets paid when the
            answer is wrong.
          </p>
        </header>

        <div className="compare-scroll">
          <table className="compare-table">
            <thead>
              <tr>
                <th aria-label="Dimension" />
                <th>Platform moderation</th>
                <th>Single AI service</th>
                <th className="compare-highlight">Prior Art Court</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.dimension}>
                  <th scope="row">{row.dimension}</th>
                  <td>{row.platform}</td>
                  <td>{row.ai}</td>
                  <td className="compare-highlight">{row.court}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
