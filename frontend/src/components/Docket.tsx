import { useState } from "react";
import { usePick } from "../lib/i18n";
import type { Case } from "../lib/types";
import { STATUS_LABEL, VERDICT_LABEL, fromWei, shortAddress } from "../lib/types";

interface Props {
  cases: Case[];
  selected: number | null;
  onSelect: (caseId: number) => void;
}

const FILTERS = ["ALL", "FILED", "CONTESTED", "ESCALATED", "RESOLVED"] as const;
type Filter = (typeof FILTERS)[number];

const CONTENT = {
  en: {
    title: "The docket",
    empty: "No cases yet. File the first one.",
    filters: {
      ALL: "All",
      FILED: "Filed",
      CONTESTED: "Contested",
      ESCALATED: "Escalated",
      RESOLVED: "Resolved",
    } as Record<string, string>,
    showing: (shown: number, total: number) =>
      shown === total ? `${total} cases` : `${shown} of ${total} cases`,
  },
  vi: {
    title: "So ghi an",
    empty: "Chua co vu nao. Hay nop vu dau tien.",
    filters: {
      ALL: "Tat ca",
      FILED: "Da nop",
      CONTESTED: "Da phan to",
      ESCALATED: "Phuc tham",
      RESOLVED: "Da chot",
    } as Record<string, string>,
    showing: (shown: number, total: number) =>
      shown === total ? `${total} vu` : `${shown} / ${total} vu`,
  },
};

export function Docket({ cases, selected, onSelect }: Props) {
  const t = usePick(CONTENT);
  const [filter, setFilter] = useState<Filter>("ALL");

  const filtered = filter === "ALL"
    ? cases
    : cases.filter((c) => c.status === filter);

  if (cases.length === 0) {
    return (
      <div className="panel">
        <h2>{t.title}</h2>
        <p className="lede">{t.empty}</p>
      </div>
    );
  }

  return (
    <div className="panel docket">
      <h2>{t.title}</h2>

      <div className="docket-filters" role="group" aria-label="Filter">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`docket-filter${filter === f ? " active" : ""}`}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {t.filters[f]}
          </button>
        ))}
      </div>

      <p className="docket-count">{t.showing(filtered.length, cases.length)}</p>

      <ul>
        {filtered.map((entry) => (
          <li key={entry.case_id}>
            <button
              className={selected === entry.case_id ? "docket-row active" : "docket-row"}
              aria-current={selected === entry.case_id ? "true" : undefined}
              aria-label={`Case ${entry.case_id}: ${hostOf(entry.origin_url)} versus ${hostOf(entry.accused_url)}, ${STATUS_LABEL[entry.status]}`}
              onClick={() => onSelect(entry.case_id)}
            >
              <span className="docket-id">#{entry.case_id}</span>
              <span className="docket-main">
                <strong>{hostOf(entry.origin_url)}</strong>
                <span className="versus">v</span>
                <strong>{hostOf(entry.accused_url)}</strong>
                <span className="docket-meta">
                  {entry.category} · {fromWei(entry.bond)} GEN · {shortAddress(entry.complainant)}
                </span>
              </span>
              <span className={`status status-${entry.status.toLowerCase()}`}>
                {entry.verdict && entry.status === "RESOLVED"
                  ? VERDICT_LABEL[entry.verdict] ?? entry.verdict
                  : STATUS_LABEL[entry.status]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
