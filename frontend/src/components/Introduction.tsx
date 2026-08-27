import { useEffect, useState } from "react";

const STORAGE_KEY = "pac.intro.collapsed";

/**
 * The landing panel: hero, the problem, how the court works, walkthrough, FAQ.
 *
 * First-time visitors see the full explanation open; anyone who has read it
 * once can collapse it and the choice sticks per browser. Storage is
 * opportunistic — a private window, a browser that blocks site data, or a
 * preview thumbnail all fall back to open.
 */
export function Introduction() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setOpen(false);
    } catch {
      /* localStorage unavailable, keep default */
    }
  }, []);

  function persist(next: boolean) {
    setOpen(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "0" : "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="intro" aria-label="Introduction to Prior Art Court">
      <header className="intro-header">
        <div className="intro-headline">
          <span className="intro-eyebrow">The court</span>
          <h2>
            A public standard, applied by validators who read the evidence
            themselves.
          </h2>
          <p className="lede">
            Two URLs, a bond, one accusation. The court fetches both works on-chain,
            applies published doctrine, and decides under decentralized validator
            consensus. No moderator, no oracle, no single AI service.
          </p>
        </div>
        <button
          type="button"
          className="secondary intro-toggle"
          onClick={() => persist(!open)}
          aria-expanded={open}
        >
          {open ? "Hide walkthrough" : "Read the walkthrough"}
        </button>
      </header>

      {open ? (
        <div className="intro-body">
          <IntroProblem />
          <IntroLifecycle />
          <IntroConsensus />
          <IntroWalkthrough />
          <IntroFaq />
        </div>
      ) : (
        <p className="intro-summary">
          Skip ahead to the docket below, or reopen the walkthrough any time.
        </p>
      )}
    </section>
  );
}

/* --------------------------------------------------------------- problem */

function IntroProblem() {
  return (
    <article className="intro-block">
      <span className="intro-tag">The problem this court replaces</span>
      <h3>Today, a platform decides whether you copied someone.</h3>
      <p>
        A moderation team, a DMCA queue, an editorial board. One private party,
        applying an unpublished standard, with money and reputation on the line
        and no appeal you can inspect. Handing the same decision to an AI service
        just swaps a biased judge for an unauditable one: a single server that
        can be bought and cannot be checked.
      </p>

      <div className="problem-grid">
        <div className="problem-cell">
          <span className="problem-label">01 · Standard</span>
          <h4>Unpublished.</h4>
          <p>
            You cannot know what you are being judged against, and neither can the
            person judging you.
          </p>
        </div>
        <div className="problem-cell">
          <span className="problem-label">02 · Judge</span>
          <h4>Has an interest.</h4>
          <p>
            The platform hosting the accused work also decides whether it
            infringes.
          </p>
        </div>
        <div className="problem-cell">
          <span className="problem-label">03 · Appeal</span>
          <h4>Not inspectable.</h4>
          <p>
            "Reviewed and upheld" is the entire reasoning you are entitled to.
          </p>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------- lifecycle */

const LIFECYCLE: Array<{ step: string; title: string; body: string; kind: string }> = [
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
    body: "The court fetches both pages on-chain, applies the doctrine, and reasons. Every validator repeats the work independently.",
  },
  {
    step: "4",
    title: "Escalate",
    kind: "court",
    body: "If the model flagged the call as close, contradicted itself, or the evidence was unreadable, the case moves to a three-source appeal.",
  },
  {
    step: "5",
    title: "Collect",
    kind: "party",
    body: "The winner withdraws the pot. Every step is on the docket, inspectable on the Studio explorer.",
  },
];

function IntroLifecycle() {
  return (
    <article className="intro-block">
      <span className="intro-tag">How a case moves through the court</span>
      <h3>Five steps, from filing to withdrawal.</h3>
      <ol className="lifecycle" aria-label="Case lifecycle">
        {LIFECYCLE.map((entry) => (
          <li key={entry.step} className={`lifecycle-step lifecycle-${entry.kind}`}>
            <div className="lifecycle-marker" aria-hidden="true">
              <span className="lifecycle-num">{entry.step}</span>
            </div>
            <div className="lifecycle-content">
              <h4>{entry.title}</h4>
              <p>{entry.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="lifecycle-legend">
        <span className="lifecycle-swatch lifecycle-party" aria-hidden="true" />{" "}
        Parties act. <span className="lifecycle-swatch lifecycle-court" aria-hidden="true" />{" "}
        The court hears.
      </p>
    </article>
  );
}

/* --------------------------------------------------------------- consensus */

function IntroConsensus() {
  return (
    <article className="intro-block">
      <span className="intro-tag">What consensus actually decides</span>
      <h3>Consensus decides the verdict. Arithmetic decides the money.</h3>
      <p>
        The adjudicator is never asked how much anyone should be paid. It
        answers one categorical question, and the payout is derived from bonds
        that were escrowed before the question was asked. A fully compromised,
        unanimous validator set can therefore still only move the stakes the
        parties themselves put up.
      </p>

      <div className="consensus-grid">
        <div className="consensus-cell">
          <span className="consensus-label">Consensus</span>
          <h4>Validators must agree on the finding, not the wording.</h4>
          <p>
            Every validator independently fetches both pages and re-reasons. A
            leader proposes; the rest accept only if they reached the same
            verdict. Two validators who write different reasons but reach the
            same finding still agree. Two who reach opposite findings do not
            pass, even if their JSON matches.
          </p>
        </div>
        <div className="consensus-cell">
          <span className="consensus-label">Arithmetic</span>
          <h4>The pot is fixed before the hearing.</h4>
          <p>
            Pot equals complainant bond plus counter-bond plus appeal fee.
            Verdict picks which of two addresses receives it. Escalated cases
            move no money; a final appeal that still cannot read the evidence
            refunds every stake to whoever put it up.
          </p>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------- walkthrough */

function IntroWalkthrough() {
  return (
    <article className="intro-block">
      <span className="intro-tag">How to file or contest</span>
      <h3>Three actions, everything moves through the court.</h3>
      <ol className="steps">
        <li>
          <div className="step-marker">
            <span>A</span>
          </div>
          <div className="step-body">
            <h4>Connect a funded studionet wallet.</h4>
            <p>
              The app switches (or adds) the GenLayer Studio network for you on
              connect. Fund your address from the Studio <em>Accounts</em>{" "}
              panel by transferring GEN from a pre-funded account. Studionet
              and testnet are separate networks, so the public testnet faucet
              does not fund this one.
            </p>
          </div>
        </li>
        <li>
          <div className="step-marker">
            <span>B</span>
          </div>
          <div className="step-body">
            <h4>File a complaint, or contest one.</h4>
            <p>
              Open the doctrine panel first: the standard being applied is
              public before the case exists. Pick a category, paste the two
              URLs, describe what was taken, stake a bond. If you are the
              accused, matching the bond contests the complaint. Match the
              bond or the case goes uncontested, and an uncontested rejection
              forfeits the filer's bond.
            </p>
          </div>
        </li>
        <li>
          <div className="step-marker">
            <span>C</span>
          </div>
          <div className="step-body">
            <h4>Send it to the court, then withdraw.</h4>
            <p>
              Either party can call <em>adjudicate</em>. Every validator
              fetches both pages and reasons independently, so the wait is
              measured in minutes, not seconds. The overlay narrates what the
              network is doing. Once the verdict is on-chain, the winner pulls
              the pot with <em>withdraw</em>.
            </p>
          </div>
        </li>
      </ol>
    </article>
  );
}

/* ---------------------------------------------------------------- faq */

const FAQ: Array<{ q: string; a: string }> = [
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
];

function IntroFaq() {
  return (
    <article className="intro-block intro-faq">
      <span className="intro-tag">Questions the reviewer asked most</span>
      <h3>Frequently asked.</h3>
      <div className="faq-list">
        {FAQ.map((entry) => (
          <details key={entry.q} className="faq-item">
            <summary>{entry.q}</summary>
            <p>{entry.a}</p>
          </details>
        ))}
      </div>
    </article>
  );
}
