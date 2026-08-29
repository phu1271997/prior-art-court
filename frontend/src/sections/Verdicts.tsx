import { explorerContract, ADDRESSES } from "../lib/chain";
import { usePick } from "../lib/i18n";
import type { Case } from "../lib/types";
import { VERDICT_LABEL, fromWei, isZero } from "../lib/types";

interface Props {
  cases: Case[];
}

const CONTENT = {
  en: {
    eyebrow: "Real decisions, on-chain",
    headingWithCount: (n: number) =>
      `${n} verdict${n === 1 ? "" : "s"} settled on this court so far.`,
    headingEmpty: "The court is live; no verdicts settled yet.",
    lede:
      "Every card below is a real transaction on studionet. Click one " +
      "and you land on the court's explorer entry, with the leader " +
      "reasoning, the validators who agreed, and the doctrine revision " +
      "applied.",
    empty:
      "File the first case from the court panel below. Once it settles, " +
      "it will show up here.",
    cta: "Browse every transaction on the court’s explorer entry →",
    overlap: "Overlap",
    confidence: "Confidence",
    instance: "Instance",
    payout: "Payout",
    appeal: "appeal",
    first: "first",
  },
  vi: {
    eyebrow: "Phan quyet thuc, tren chuoi",
    headingWithCount: (n: number) =>
      `${n} phan quyet da chot tren toa nay.`,
    headingEmpty: "Toa dang hoat dong; chua co phan quyet nao.",
    lede:
      "Moi the ben duoi la mot giao dich thuc tren studionet. Nhan vao " +
      "de xem tren explorer: ly do cua leader, cac validator dong y, " +
      "va ban an le duoc ap dung.",
    empty:
      "Nop vu kien dau tien tu bang phien toa ben duoi. Khi chot, " +
      "no se hien o day.",
    cta: "Duyet tat ca giao dich tren explorer →",
    overlap: "Trung lap",
    confidence: "Do tin cay",
    instance: "Phien xu",
    payout: "Chi tra",
    appeal: "phuc tham",
    first: "so tham",
  },
};

export function Verdicts({ cases }: Props) {
  const t = usePick(CONTENT);
  const resolved = cases.filter((c) => c.status === "RESOLVED");

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
          <span className="section-eyebrow">{t.eyebrow}</span>
          <h2>
            {showcase.length > 0
              ? t.headingWithCount(resolved.length)
              : t.headingEmpty}
          </h2>
          <p className="lede">{t.lede}</p>
        </header>

        {showcase.length > 0 ? (
          <div className="verdicts-grid">
            {showcase.map((c) => (
              <VerdictCard key={c.case_id} entry={c} t={t} />
            ))}
          </div>
        ) : (
          <p className="verdicts-empty">{t.empty}</p>
        )}

        <p className="verdicts-cta">
          <a href={explorerContract(ADDRESSES.court)} target="_blank" rel="noreferrer">
            {t.cta}
          </a>
        </p>
      </div>
    </section>
  );
}

function VerdictCard({ entry, t }: { entry: Case; t: typeof CONTENT.en }) {
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
          <dt>{t.overlap}</dt>
          <dd>{entry.overlap_pct}%</dd>
        </div>
        <div>
          <dt>{t.confidence}</dt>
          <dd>{entry.confidence}%</dd>
        </div>
        <div>
          <dt>{t.instance}</dt>
          <dd>{entry.instance === 2 ? t.appeal : t.first}</dd>
        </div>
        <div>
          <dt>{t.payout}</dt>
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
