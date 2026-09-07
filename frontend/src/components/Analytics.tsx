import { useMemo } from "react";
import { computeStats } from "../lib/analytics";
import type { Bucket } from "../lib/analytics";
import { usePick } from "../lib/i18n";
import type { Case } from "../lib/types";

interface Props {
  cases: Case[];
}

const CONTENT = {
  en: {
    eyebrow: "The court in numbers",
    heading: "Court analytics",
    lede: "Every figure below is read live from the chain — the same public docket the court settles on. Nothing here is stored off-chain.",
    total: "Cases filed",
    resolved: "Decided",
    settlement: "Settled by agreement",
    escalated: "Escalated to appeal",
    staked: "Total staked",
    moved: "Value settled",
    verdicts: "Verdict distribution",
    categories: "Cases by doctrine",
    overlap: "Overlap of decided infringement cases",
    empty: "No cases yet. The charts fill in as the docket grows.",
    ofResolved: "of decided cases",
  },
  vi: {
    eyebrow: "Toa an qua con so",
    heading: "Thong ke toa an",
    lede: "Moi con so duoi day doc truc tiep tu chuoi — cung so ghi an cong khai ma toa xet xu. Khong gi luu ngoai chuoi.",
    total: "Vu da nop",
    resolved: "Da xu",
    settlement: "Chot bang thoa thuan",
    escalated: "Da khang cao",
    staked: "Tong dat cuoc",
    moved: "Gia tri da chuyen",
    verdicts: "Phan bo phan quyet",
    categories: "Vu theo hoc thuyet",
    overlap: "Do trung lap cua cac vu ket luan xam pham",
    empty: "Chua co vu nao. Bieu do se day len khi so ghi an tang.",
    ofResolved: "cua cac vu da xu",
  },
};

export function Analytics({ cases }: Props) {
  const t = usePick(CONTENT);
  const stats = useMemo(() => computeStats(cases), [cases]);

  return (
    <section id="analytics" className="marketing-section analytics-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">{t.eyebrow}</span>
          <h2>{t.heading}</h2>
          <p className="lede">{t.lede}</p>
        </header>

        {stats.total === 0 ? (
          <p className="lede">{t.empty}</p>
        ) : (
          <>
            <div className="stat-grid">
              <Stat label={t.total} value={String(stats.total)} />
              <Stat label={t.resolved} value={String(stats.resolved)} />
              <Stat
                label={t.settlement}
                value={`${stats.settlementRate}%`}
                sub={`${stats.mediated} ${t.ofResolved}`}
              />
              <Stat label={t.escalated} value={String(stats.escalated)} />
              <Stat label={t.staked} value={`${stats.totalStakedGen} GEN`} />
              <Stat label={t.moved} value={`${stats.valueMovedGen} GEN`} />
            </div>

            <div className="analytics-charts">
              <BarChart title={t.verdicts} buckets={stats.verdicts} tone="verdict" />
              <BarChart title={t.categories} buckets={stats.categories} tone="category" />
              <BarChart title={t.overlap} buckets={stats.overlap} tone="overlap" />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-tile">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {sub ? <span className="stat-sub">{sub}</span> : null}
    </div>
  );
}

function BarChart({ title, buckets, tone }: { title: string; buckets: Bucket[]; tone: string }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const anyData = buckets.some((b) => b.count > 0);
  return (
    <div className="bar-chart">
      <h3>{title}</h3>
      {anyData ? (
        <ul>
          {buckets.map((b) => (
            <li key={b.label}>
              <span className="bar-label">{b.label}</span>
              <span className="bar-track">
                <span
                  className={`bar-fill bar-${tone}-${b.label.replace(/[^a-z]/gi, "").toLowerCase()}`}
                  style={{ width: `${(b.count / max) * 100}%` }}
                />
              </span>
              <span className="bar-count">{b.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="bar-empty">—</p>
      )}
    </div>
  );
}
