const CASES = [
  {
    tag: "Freelance escrow",
    title: "Did the deliverable match the brief?",
    body: "Client stakes payment. Freelancer stakes their fee. The court reads the brief, reads the delivery, applies the doctrine registered for the medium, and decides whether the work meets the standard.",
    doctrine: "deliverable-review",
  },
  {
    tag: "Grant milestones",
    title: "Did the grantee ship what they promised?",
    body: "Foundation escrows a milestone payment. Grantee links the promised artefact (a report, a repo, a benchmark). The court reads it against the milestone description and releases or refunds.",
    doctrine: "grant-milestone",
  },
  {
    tag: "Bug bounty severity",
    title: "Is this a critical, or a low?",
    body: "Reporter files an advisory URL. The vendor stakes the disputed tier. The court reads the advisory against the published severity doctrine and settles on the payout the reporter is owed.",
    doctrine: "severity-rubric",
  },
  {
    tag: "Academic misconduct",
    title: "Is this paragraph plagiarised?",
    body: "Accused and accuser both stake. The court fetches both papers, applies the doctrine for academic work — quotation is legitimate, uncited paraphrase is not — and decides.",
    doctrine: "academic-paper",
  },
  {
    tag: "Moderation appeals",
    title: "Was this post removed correctly?",
    body: "User whose content was taken down files a case against the moderation decision. The court reads the post and the platform's own published rule, decides, and pays out the reinstated user if the rule was misapplied.",
    doctrine: "moderation-review",
  },
  {
    tag: "Contract clause interpretation",
    title: "Was the SLA breached?",
    body: "Two parties disagree on whether an outage counted under the service agreement. The court reads the incident report and the agreement, decides whether the clause was tripped, and releases the credit.",
    doctrine: "sla-clause",
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="marketing-section usecases-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">Beyond copying disputes</span>
          <h2>The primitive is stake, fetch, judge, settle.</h2>
          <p className="lede">
            Prior art is the sharpest demo because the evidence is public,
            the judgement is famously subjective, and being wrong is
            obvious. The same shape fits any dispute where the facts are on
            the web and the standard is written in words rather than
            numbers.
          </p>
        </header>

        <div className="usecases-grid">
          {CASES.map((c) => (
            <article key={c.tag} className="usecase-card">
              <span className="usecase-tag">{c.tag}</span>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
              <footer className="usecase-doctrine">
                Doctrine key: <code>{c.doctrine}</code>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
