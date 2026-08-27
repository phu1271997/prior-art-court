const FAQ = [
  {
    q: "What does it cost to file a complaint?",
    a: "The bond itself, staked with the complaint. Win and the bond comes back with the respondent's counter-bond if the case was contested. Lose an uncontested complaint and the bond is forfeited; that is what makes filing rubbish expensive. The bond has no fixed minimum beyond being greater than zero, but a serious dispute should carry a serious stake.",
  },
  {
    q: "Can the AI decide how much money changes hands?",
    a: "No. The adjudicator answers one categorical question: INFRINGING, DERIVATIVE_FAIR, INDEPENDENT, or EVIDENCE_UNAVAILABLE. The payout is derived from the bonds that were escrowed before the question was asked. A compromised validator set can hand one party's own stake to the other; it cannot mint value.",
  },
  {
    q: "What happens if the evidence page is unreadable?",
    a: "The court treats it as no evidence rather than as no similarity. A dead link, a cookie wall, a JS shell, or a 404 becomes a verdict of EVIDENCE_UNAVAILABLE and the case escalates to the three-source appeal. If the appeal still cannot read enough evidence, every stake goes back to whoever put it up.",
  },
  {
    q: "Can a decided case be appealed?",
    a: "No. An appeal exists because the first instance said it could not decide safely, not because a party disliked a decision it could. A settled verdict is final. The appeal instance reads three sources and answers one extra question the first instance never asked: which work was published first.",
  },
  {
    q: "What kinds of work can the court judge?",
    a: "Whatever has a published doctrine. Five categories are seeded today: news articles, source code, academic papers, documentation, and marketing copy. Bringing a new medium under the court's jurisdiction takes no code; it takes a paragraph of English registered in the PolicyRegistry contract stating what counts as protected expression, what reuse is legitimate, and what must not be treated as copying.",
  },
  {
    q: "How is this different from a diff or a plagiarism checker?",
    a: "Substantial similarity of protected expression is not a diff. Two texts can share 90% of their words and be a legitimate quotation. Two texts can share no complete sentence and one still be a rip-off of the other's structure and sequence. And even if the check were mechanical, the evidence lives at URLs on the open web and has to be read at judgement time, which a deterministic chain cannot do without an oracle.",
  },
  {
    q: "Why is this on studionet and not testnet or mainnet?",
    a: "GenLayer is in its testnet phase. Studionet is the Studio-hosted network where the SDK, RPC, and Explorer are stable enough for a public demo. Testnets like Asimov and Bradbury are validator-focused; when GenLayer promotes a mainnet, we redeploy and update the frontend chain.",
  },
  {
    q: "Do I have to trust the validators?",
    a: "No more than you have to trust that a majority of Ethereum validators are honest. Validators are staked, slashed for the wrong answer, and every validator runs its own model with its own random seed. Optimistic Democracy is designed so that agreeing with a wrong leader costs a validator more than checking for themselves.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="marketing-section faq-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">Questions the reviewer asked most</span>
          <h2>Frequently asked.</h2>
        </header>

        <div className="faq-list">
          {FAQ.map((entry) => (
            <details key={entry.q} className="faq-item">
              <summary>{entry.q}</summary>
              <p>{entry.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
