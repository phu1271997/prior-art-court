export function Walkthrough() {
  return (
    <section id="how-to-use" className="marketing-section walkthrough-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">How to file or contest</span>
          <h2>Three actions, everything moves through the court.</h2>
          <p className="lede">
            Read the doctrine first: the standard is public before the case
            exists. Then stake, wait for the network to reason, and pull the
            pot when it settles.
          </p>
        </header>

        <ol className="steps">
          <li>
            <div className="step-marker">
              <span>A</span>
            </div>
            <div className="step-body">
              <h3>Connect a funded studionet wallet.</h3>
              <p>
                The app switches (or adds) the GenLayer Studio network for
                you on connect. Fund your address from the Studio{" "}
                <em>Accounts</em> panel by transferring GEN from a pre-funded
                account. Studionet and testnet are separate networks, so the
                public testnet faucet does not fund this one.
              </p>
            </div>
          </li>
          <li>
            <div className="step-marker">
              <span>B</span>
            </div>
            <div className="step-body">
              <h3>File a complaint, or contest one.</h3>
              <p>
                Open the doctrine panel first. Pick a category, paste the two
                URLs, describe what was taken, stake a bond. If you are the
                accused, matching the bond contests. Uncontested complaints
                still go to the court, and a rejected uncontested complaint
                forfeits the filer's bond.
              </p>
            </div>
          </li>
          <li>
            <div className="step-marker">
              <span>C</span>
            </div>
            <div className="step-body">
              <h3>Send it to the court, then withdraw.</h3>
              <p>
                Either party can call <em>adjudicate</em>. Every validator
                fetches both pages and reasons independently, so the wait is
                measured in minutes, not seconds. Once the verdict is
                on-chain, the winner pulls the pot with <em>withdraw</em>.
              </p>
            </div>
          </li>
        </ol>

        <p className="walkthrough-footnote">
          A close call escalates automatically. You can appeal an escalated
          case with a third source; you cannot appeal a case the court
          already decided.
        </p>
      </div>
    </section>
  );
}
