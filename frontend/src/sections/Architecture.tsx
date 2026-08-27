const BOXES = [
  {
    id: "registry",
    name: "PolicyRegistry",
    role: "Doctrine, revision-locked",
    body: "The court's whole integration surface. Every kind of work under the court's jurisdiction carries a paragraph of English here. Bringing a new medium under the court takes a registered paragraph, not code.",
    methods: ["register_policy", "get_policy", "list_categories"],
    color: "seal",
  },
  {
    id: "court",
    name: "PriorArtCourt",
    role: "Cases, bonds, and both intelligent instances",
    body: "The lifecycle in one contract: file, contest, hear, escalate, appeal, settle. The two intelligent methods (adjudicate, appeal) fetch pages on-chain and reason under Optimistic Democracy. Money moves only through arithmetic, never through the model.",
    methods: ["file_case", "contest_case", "adjudicate", "appeal", "withdraw"],
    color: "ink",
  },
  {
    id: "reputation",
    name: "Reputation",
    role: "Standing pulled from settled cases",
    body: "Never written to by the court. Reads the court's history and derives standing on demand. Pull, not push: a cross-contract write is dispatched as a message and would leave standing half-applied if the transaction later unwound.",
    methods: ["get_standing", "sync_recent", "get_leaderboard"],
    color: "upheld",
  },
];

export function Architecture() {
  return (
    <section id="architecture" className="marketing-section architecture-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">Three contracts, one court</span>
          <h2>Doctrine is separate from the court. Standing is derived, not pushed.</h2>
          <p className="lede">
            Everything the court judges against lives in one contract.
            Everything about a case's outcome lives in another. A third
            reads them back and derives standing. Nothing writes across
            contracts — cross-contract writes are messages, and a message
            that arrives after a settlement is a settlement that got half
            applied.
          </p>
        </header>

        <div className="architecture-graph">
          {BOXES.map((box) => (
            <article key={box.id} className={`arch-box arch-box-${box.color}`}>
              <header className="arch-box-header">
                <h3>{box.name}</h3>
                <span className="arch-box-role">{box.role}</span>
              </header>
              <p>{box.body}</p>
              <ul className="arch-methods">
                {box.methods.map((m) => (
                  <li key={m}>
                    <code>{m}</code>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="architecture-flow" aria-hidden="true">
          <div className="flow-line flow-registry-court">
            <span className="flow-label">read doctrine at hearing</span>
          </div>
          <div className="flow-line flow-court-reputation">
            <span className="flow-label">read settled cases on demand</span>
          </div>
        </div>

        <p className="architecture-footnote">
          The court reads the registry synchronously — the doctrine and its
          revision arrive in the same transaction as the hearing. The
          reputation contract polls the court through its public views; the
          court never knows it exists.
        </p>
      </div>
    </section>
  );
}
