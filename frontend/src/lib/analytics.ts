/**
 * Pure aggregation over the docket. Nothing here fetches or knows about React —
 * it turns the array of cases the app already loaded into the numbers the
 * analytics dashboard renders. Kept pure so it is trivial to reason about and
 * (should we want to) test.
 */

import { fromWei } from "./types";
import type { Case } from "./types";

export interface Bucket {
  label: string;
  count: number;
}

export interface CourtStats {
  total: number;
  resolved: number;
  escalated: number;
  pending: number; // filed or contested, not yet heard
  mediated: number; // resolved by agreement
  adjudicated: number; // resolved by a verdict
  contestRate: number; // share of cases that drew a counter-bond, 0-100
  settlementRate: number; // share of resolved cases settled by agreement, 0-100
  verdicts: Bucket[]; // distribution of substantive verdicts
  categories: Bucket[]; // cases per doctrine category
  overlap: Bucket[]; // overlap histogram for adjudicated cases
  totalStakedGen: string; // human GEN across every bond, counter-bond and appeal fee
  valueMovedGen: string; // human GEN that actually changed hands at settlement
}

const VERDICT_ORDER = ["INFRINGING", "DERIVATIVE_FAIR", "INDEPENDENT", "EVIDENCE_UNAVAILABLE"];
const VERDICT_SHORT: Record<string, string> = {
  INFRINGING: "Infringing",
  DERIVATIVE_FAIR: "Derivative / fair",
  INDEPENDENT: "Independent",
  EVIDENCE_UNAVAILABLE: "Unreadable",
};

const OVERLAP_BANDS: [string, number, number][] = [
  ["0–20%", 0, 20],
  ["20–40%", 20, 40],
  ["40–60%", 40, 60],
  ["60–80%", 60, 80],
  ["80–100%", 80, 101],
];

export function computeStats(cases: Case[]): CourtStats {
  const total = cases.length;
  let resolved = 0;
  let escalated = 0;
  let pending = 0;
  let mediated = 0;
  let contested = 0;

  const verdictCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const overlapCounts = OVERLAP_BANDS.map(() => 0);

  let staked = 0n;
  let moved = 0n;

  for (const c of cases) {
    if (!isZeroAddr(c.respondent)) contested += 1;
    staked += BigInt(c.bond || "0") + BigInt(c.counter_bond || "0") + BigInt(c.appeal_fee || "0");

    categoryCounts[c.category] = (categoryCounts[c.category] ?? 0) + 1;

    if (c.status === "ESCALATED") escalated += 1;
    else if (c.status === "FILED" || c.status === "CONTESTED") pending += 1;
    else if (c.status === "RESOLVED") {
      resolved += 1;
      if (c.resolution === "MEDIATED") {
        mediated += 1;
        // A settlement moves the whole pot between the two parties.
        moved += BigInt(c.bond || "0") + BigInt(c.counter_bond || "0");
      } else {
        moved += BigInt(c.payout || "0");
        if (c.verdict) verdictCounts[c.verdict] = (verdictCounts[c.verdict] ?? 0) + 1;
        // Overlap histogram is only meaningful for a real, readable finding.
        if (c.verdict && c.verdict !== "EVIDENCE_UNAVAILABLE") {
          const band = OVERLAP_BANDS.findIndex(([, lo, hi]) => c.overlap_pct >= lo && c.overlap_pct < hi);
          if (band >= 0) overlapCounts[band] += 1;
        }
      }
    }
  }

  const adjudicated = resolved - mediated;

  return {
    total,
    resolved,
    escalated,
    pending,
    mediated,
    adjudicated,
    contestRate: total ? Math.round((contested / total) * 100) : 0,
    settlementRate: resolved ? Math.round((mediated / resolved) * 100) : 0,
    verdicts: VERDICT_ORDER.filter((v) => verdictCounts[v]).map((v) => ({
      label: VERDICT_SHORT[v] ?? v,
      count: verdictCounts[v],
    })),
    categories: Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count })),
    overlap: OVERLAP_BANDS.map(([label], i) => ({ label, count: overlapCounts[i] })),
    totalStakedGen: fromWei(staked, 2),
    valueMovedGen: fromWei(moved, 2),
  };
}

function isZeroAddr(a?: string): boolean {
  return !a || /^0x0+$/i.test(a);
}
