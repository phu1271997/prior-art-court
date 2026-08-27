import { CHAIN_NAME } from "../lib/chain";
import type { Case, Policy } from "../lib/types";

interface Props {
  cases: Case[];
  policies: Policy[];
}

export function Hero({ cases, policies }: Props) {
  const filed = cases.length;
  const resolved = cases.filter((c) => c.status === "RESOLVED").length;
  const infringing = cases.filter((c) => c.verdict === "INFRINGING").length;
  const cleared = cases.filter(
    (c) => c.verdict === "INDEPENDENT" || c.verdict === "DERIVATIVE_FAIR"
  ).length;
  const appealed = cases.filter((c) => c.instance === 2).length;

  const STATS = [
    { label: "Cases filed", value: filed.toString() },
    { label: "Verdicts settled", value: resolved.toString() },
    { label: "Found infringing", value: infringing.toString() },
    { label: "Cleared", value: cleared.toString() },
    { label: "Went to appeal", value: appealed.toString() },
    { label: "Categories under jurisdiction", value: policies.length.toString() },
  ];

  return (
    <section id="top" className="marketing-section hero-section">
      <div className="section-inner hero-inner">
        <div className="hero-mark" aria-hidden="true">
          <span>§</span>
        </div>

        <div className="hero-copy">
          <span className="hero-eyebrow">
            An intelligent court on GenLayer {CHAIN_NAME}
          </span>
          <h1>
            A court for copying disputes,
            <br />
            where the judge reads both works itself
            <br />
            and cannot be lobbied.
          </h1>
          <p className="hero-lede">
            Someone publishes something. Someone else publishes something that
            looks a lot like it. Prior Art Court settles the dispute on-chain:
            both parties stake, an Intelligent Contract fetches both works from
            the live web, applies published doctrine, and decides under
            decentralized validator consensus.
          </p>
          <div className="hero-cta">
            <a href="#court" className="hero-primary">
              Open the court
            </a>
            <a href="#how-it-works" className="hero-secondary">
              Read how it works
            </a>
          </div>
        </div>

        <dl className="hero-stats" aria-label="Court statistics">
          {STATS.map((stat) => (
            <div key={stat.label} className="hero-stat">
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
