import { useEffect, useMemo, useState } from "react";
import * as court from "../lib/court";
import { usePick } from "../lib/i18n";
import { VERDICT_LABEL } from "../lib/types";
import type { Policy, Precedent } from "../lib/types";

interface Props {
  policies: Policy[];
  onSelect: (caseId: number) => void;
}

const CONTENT = {
  en: {
    eyebrow: "Stare decisis",
    heading: "The court's own case law",
    lede: "Every case that settles on the merits becomes precedent. When the next dispute of the same kind is heard, these prior decisions are placed in front of the adjudicator — the court reasons from its own record, like cases decided alike.",
    empty: "No decisions in this category yet. The first settled case starts the line.",
    reliedOn: "cited",
    align: {
      FOLLOWED: "Followed precedent",
      DISTINGUISHED: "Distinguished precedent",
      DEPARTED: "Departed from precedent",
      NONE: "First of its kind",
    } as Record<string, string>,
    overlap: "overlap",
    view: "Open case",
  },
  vi: {
    eyebrow: "An le",
    heading: "Kho an le cua chinh toa",
    lede: "Moi vu chot theo noi dung deu tro thanh an le. Khi vu tiep theo cung loai duoc xet xu, cac phan quyet truoc do se dat truoc hoi dong — toa suy luan tu chinh ho so cua minh, vu giong nhau xu giong nhau.",
    empty: "Chua co phan quyet nao trong nhom nay. Vu dau tien chot se mo dau.",
    reliedOn: "trich dan",
    align: {
      FOLLOWED: "Tuan theo an le",
      DISTINGUISHED: "Phan biet an le",
      DEPARTED: "Di nguoc an le",
      NONE: "Vu dau tien",
    } as Record<string, string>,
    overlap: "trung lap",
    view: "Mo vu",
  },
};

export function CaseLaw({ policies, onSelect }: Props) {
  const t = usePick(CONTENT);
  const categories = useMemo(() => policies.map((p) => p.category), [policies]);
  const [active, setActive] = useState<string | null>(null);
  const [byCategory, setByCategory] = useState<Record<string, Precedent[]>>({});
  const [loading, setLoading] = useState(false);

  // Default the active tab to the first category once policies arrive.
  useEffect(() => {
    if (active === null && categories.length > 0) setActive(categories[0]);
  }, [categories, active]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    court
      .getPrecedents(active, 0)
      .then((rows) => {
        if (!cancelled) setByCategory((prev) => ({ ...prev, [active]: rows }));
      })
      .catch(() => {
        if (!cancelled) setByCategory((prev) => ({ ...prev, [active]: [] }));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  if (categories.length === 0) return null;

  const rows = active ? byCategory[active] ?? [] : [];

  return (
    <section id="case-law" className="marketing-section case-law-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">{t.eyebrow}</span>
          <h2>{t.heading}</h2>
          <p className="lede">{t.lede}</p>
        </header>

        <div className="case-law-tabs" role="tablist">
          {categories.map((category) => (
            <button
              key={category}
              role="tab"
              aria-selected={active === category}
              className={`case-law-tab ${active === category ? "is-active" : ""}`}
              onClick={() => setActive(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {loading && rows.length === 0 ? (
          <p className="lede case-law-empty">…</p>
        ) : rows.length === 0 ? (
          <p className="lede case-law-empty">{t.empty}</p>
        ) : (
          <ol className="case-law-list">
            {rows.map((row) => (
              <li key={row.case_id} className={`case-law-card verdict-${row.verdict.toLowerCase()}`}>
                <div className="case-law-card-head">
                  <span className="case-number">Case #{row.case_id}</span>
                  <span className={`verdict-chip verdict-${row.verdict.toLowerCase()}`}>
                    {VERDICT_LABEL[row.verdict] ?? row.verdict}
                  </span>
                  {row.precedent_alignment && row.precedent_alignment !== "NONE" ? (
                    <span className={`align-badge align-${row.precedent_alignment.toLowerCase()}`}>
                      {t.align[row.precedent_alignment] ?? row.precedent_alignment}
                    </span>
                  ) : null}
                </div>
                <p className="case-law-reason">{row.reason || "—"}</p>
                <div className="case-law-meta">
                  <span>
                    {row.overlap_pct}% {t.overlap}
                  </span>
                  {row.cited_precedents && row.cited_precedents.length > 0 ? (
                    <span className="case-law-cites">
                      {t.reliedOn}:{" "}
                      {row.cited_precedents.map((cid, i) => (
                        <span key={cid}>
                          {i > 0 ? ", " : ""}#{cid}
                        </span>
                      ))}
                    </span>
                  ) : null}
                  <button type="button" className="case-law-open" onClick={() => onSelect(row.case_id)}>
                    {t.view} →
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
