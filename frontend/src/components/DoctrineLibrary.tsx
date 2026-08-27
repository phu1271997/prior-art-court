import { useState } from "react";
import { ADDRESSES, explorerContract } from "../lib/chain";
import type { Policy } from "../lib/types";

interface Props {
  policies: Policy[];
}

/**
 * A public library of every doctrine the court has jurisdiction over.
 *
 * The court refuses complaints in categories with no published standard. The
 * standards themselves are plain English, registered on-chain, and read
 * verbatim by the adjudicator at hearing time. Putting them side by side up
 * front lets a visitor see exactly what the court believes about each medium
 * before staking anything.
 */
export function DoctrineLibrary({ policies }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (policies.length === 0) {
    return (
      <section className="doctrine-library" aria-label="Published doctrine">
        <header>
          <span className="section-eyebrow">The doctrine layer</span>
          <h2>No doctrine has been published yet.</h2>
          <p className="lede">
            Until the registry publishes a standard, the court has no
            jurisdiction over anything, and every complaint is refused at
            filing.
          </p>
        </header>
      </section>
    );
  }

  return (
    <section className="doctrine-library" aria-label="Published doctrine">
      <header className="doctrine-header">
        <div>
          <span className="section-eyebrow">The doctrine layer</span>
          <h2>Every standard the court applies is public before you file.</h2>
          <p className="lede">
            The adjudicator reads the paragraph below verbatim at hearing time.
            Doctrine registered on-chain as{" "}
            <a
              href={explorerContract(ADDRESSES.policyRegistry)}
              target="_blank"
              rel="noreferrer"
            >
              PolicyRegistry
            </a>
            . Bringing a new medium under jurisdiction takes a paragraph, not
            code.
          </p>
        </div>
        <span className="doctrine-count">
          {policies.length} categories · revision-locked
        </span>
      </header>

      <div className="doctrine-grid">
        {policies.map((policy) => {
          const isOpen = expanded === policy.category;
          const preview = policy.doctrine.slice(0, 220);
          const hasMore = policy.doctrine.length > 240;
          return (
            <article key={policy.category} className="doctrine-card">
              <header className="doctrine-card-header">
                <h3>{policy.category}</h3>
                <span className="doctrine-revision">rev {policy.revision}</span>
              </header>
              <p className="doctrine-text">
                {isOpen || !hasMore ? policy.doctrine : `${preview}…`}
              </p>
              {hasMore ? (
                <button
                  type="button"
                  className="secondary doctrine-more"
                  onClick={() => setExpanded(isOpen ? null : policy.category)}
                  aria-expanded={isOpen}
                >
                  {isOpen ? "Show less" : "Read the full doctrine"}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
