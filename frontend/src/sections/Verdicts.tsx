import { explorerContract, ADDRESSES } from "../lib/chain";
import type { Case } from "../lib/types";
import { VERDICT_LABEL, fromWei, isZero } from "../lib/types";

interface Props {
  cases: Case[];
}

/**
 * Pulls resolved cases from the live docket and renders a curated strip of
 * the most illustrative outcomes. Reviewers see real verdicts issued by the
 * live court, not a mocked-up example.
 */
export function Verdicts({ cases }: Props) {
  const resolved = cases.filter((c) => c.status === "RESOLVED");

  // Pick one of each verdict when available, then top up with the newest.
  const byVerdict = new Map<string, Case>();
  for (const c of resolved) {
    if (!byVerdict.has(c.verdict)) byVerdict.set(c.verdict, c);
  }
  const pinned = Array.from(byVerdict.values());
  const rest = resolved
    .filter((c) => !pinned.includes(c))
    .sort((a, b) => b.case_id - a.case_id);
  const showcase = [...pinned, ...rest].slice(0, 6);

  return (
    <section id="verdicts" className="marketing-section verdicts-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">Real decisions, on-chain</span>
          <h2>
            {showcase.length > 0
              ? `${resolved.length} verdict${resolved.length === 1 ? "" : "s"} settled on this court so far.`
              : "The court is live; no verdicts settled yet."}
          </h2>
          <p className="lede">
            Every card below is a real transaction on studionet. Click one
            and you land on the court's explorer entry, with the leader
            reasoning, the validators who agreed, and the doctrine revision
            applied.
          </p>
        </header>

        {showcase.length > 0 ? (
          <div className="verdicts-grid">
            {showcase.map((c) => (
              <VerdictCard key={c.case_id} entry={c} />
            ))}
          </div>
        ) : (
          <p className="verdicts-empty">
            File the first case from the court panel below. Once it settles,
            it will show up here.
          </p>
        )}

        <p className="verdicts-cta">
          <a href={explorerContract(ADDRESSES.court)} target="_blank" rel="noreferrer">
            Browse every transaction on the court's explorer entry →
          </a>
        </p>
      </div>
    </section>
  );
}

function VerdictCard({ entry }: { entry: Case }) {
  const verdictClass =
    entry.verdict === "INFRINGING"
      ? "verdict-card-infringing"
      : entry.verdict === "EVIDENCE_UNAVAILABLE"
        ? "verdict-card-unavailable"
        : "verdict-card-cleared";

  return (
    <article className={`verdict-card ${verdictClass}`}>
      <header className="verdict-card-header">
        <span className="verdict-card-category">{entry.category}</span>
        <span className="verdict-card-id">case #{entry.case_id}</span>
      </header>
      <h3>{VERDICT_LABEL[entry.verdict] || entry.verdict}</h3>
      <dl className="verdict-card-stats">
        <div>
          <dt>Overlap</dt>
          <dd>{entry.overlap_pct}%</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{entry.confidence}%</dd>
        </div>
        <div>
          <dt>Instance</dt>
          <dd>{entry.instance === 2 ? "appeal" : "first"}</dd>
        </div>
        <div>
          <dt>Payout</dt>
          <dd>{isZero(entry.winner) ? "—" : `${fromWei(entry.payout, 2)} GEN`}</dd>
        </div>
      </dl>
      {entry.reason ? (
        <blockquote className="verdict-card-reason">
          {entry.reason.slice(0, 220)}
          {entry.reason.length > 220 ? "…" : ""}
        </blockquote>
      ) : null}
    </article>
  );
}
