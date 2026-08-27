export function Problem() {
  return (
    <section id="problem" className="marketing-section problem-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">The problem this court replaces</span>
          <h2>Today, a platform decides whether you copied someone.</h2>
          <p className="lede">
            A moderation team, a DMCA queue, an editorial board. One private
            party applying an unpublished standard, with money and reputation
            on the line and no appeal you can inspect. Handing the same
            decision to a single AI service just swaps a biased judge for an
            unauditable one.
          </p>
        </header>

        <div className="problem-grid">
          <article className="problem-cell">
            <span className="problem-label">01 · Standard</span>
            <h3>Unpublished.</h3>
            <p>
              You cannot know what you are being judged against, and neither
              can the person judging you. The rules only exist inside the
              moderator's head.
            </p>
          </article>
          <article className="problem-cell">
            <span className="problem-label">02 · Judge</span>
            <h3>Has an interest.</h3>
            <p>
              The platform that hosts the accused work also decides whether
              it infringes. It sees every complaint against every account
              paying it fees.
            </p>
          </article>
          <article className="problem-cell">
            <span className="problem-label">03 · Appeal</span>
            <h3>Not inspectable.</h3>
            <p>
              "Reviewed and upheld" is the entire reasoning you are entitled
              to. Nobody else can check the finding, because nobody else can
              see the finding.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
