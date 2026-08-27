import { useEffect, useState } from "react";

const STORAGE_KEY = "pac.intro.collapsed";

/**
 * Landing panel shown at the top of the court. First-time visitors see the
 * full explanation open; anyone who has read it once can collapse it and the
 * choice sticks per browser. Storage is opportunistic — a private window, a
 * browser that blocks site data, or a preview thumbnail all fall back to open.
 */
export function Introduction() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setOpen(false);
    } catch {
      /* localStorage unavailable — keep the default */
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
    <section className="intro panel" aria-label="Introduction to Prior Art Court">
      <header className="intro-header">
        <div>
          <h2>New here? Start with the doctrine.</h2>
          <p className="lede">
            Prior Art Court settles copying disputes on-chain. Two URLs, one accusation,
            a public standard — the court fetches both works itself and decides under
            validator consensus.
          </p>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => persist(!open)}
          aria-expanded={open}
        >
          {open ? "Hide walkthrough" : "Show walkthrough"}
        </button>
      </header>

      {open ? (
        <div className="intro-body">
          <article className="intro-block">
            <span className="intro-tag">The problem</span>
            <h3>Today, a platform decides whether you copied someone.</h3>
            <p>
              A moderation team, a DMCA queue, an editorial board — one private party
              applying an unpublished standard, with money and reputation on the line
              and no appeal you can inspect. Handing the same decision to an AI service
              swaps a biased judge for an unauditable one: a single server that can be
              bought and cannot be checked.
            </p>
            <p>
              Prior Art Court replaces both with a court whose reasoning happens
              on-chain and whose verdict is agreed by a validator set that reads the
              evidence itself.
            </p>
          </article>

          <article className="intro-block">
            <span className="intro-tag">How the doctrine works</span>
            <h3>The standard is public before the case exists.</h3>
            <p>
              Every kind of work — news articles, source code, academic papers,
              documentation, marketing copy — carries a doctrine registered on-chain in
              plain English: what counts as protected expression, what reuse is
              legitimate, and what must <em>not</em> be treated as copying. You can
              read it before you file. The adjudicator reads exactly the same text.
            </p>
            <p>
              Bringing a new medium under the court takes no code — it takes a
              paragraph of English registered in the <code>PolicyRegistry</code>
              contract. Nothing here is hidden logic.
            </p>
          </article>

          <article className="intro-block">
            <span className="intro-tag">How to file or contest</span>
            <h3>Three steps, and everything moves through the court.</h3>
            <ol className="intro-steps">
              <li>
                <strong>Connect a wallet holding GEN on studionet.</strong> The app
                switches (or adds) the GenLayer network for you. Fund your address
                from the Studio <em>Accounts</em> panel — studionet and testnet are
                separate networks, so the public testnet faucet does not fund this
                one.
              </li>
              <li>
                <strong>File a complaint.</strong> Expand the doctrine panel, pick a
                category, paste the two URLs, describe what was taken, and stake a
                bond. Win and the bond comes back — with the respondent's counter-bond
                if the case was contested. Lose and it is forfeited: that is what
                keeps the docket honest.
              </li>
              <li>
                <strong>Contest, or send it to the court.</strong> If you are the
                accused, match the bond to contest. Either party can then send the
                case to <em>adjudicate</em>: every validator independently fetches both
                pages, applies the doctrine, and votes. Minutes, not seconds — the
                overlay narrates the wait, and the reason it takes minutes is the
                product. Close calls and unreadable evidence escalate to a
                three-source appeal instead of a coin-flip settlement.
              </li>
            </ol>
            <p className="intro-outcome">
              The pot goes to the winner, released via <code>withdraw</code>. Every
              step — filed, contested, heard, settled — is on-chain and inspectable on
              the Studio explorer.
            </p>
          </article>
        </div>
      ) : null}
    </section>
  );
}
