export type Verdict =
  | "INFRINGING"
  | "DERIVATIVE_FAIR"
  | "INDEPENDENT"
  | "EVIDENCE_UNAVAILABLE"
  | "";

export type CaseStatus =
  | "FILED"
  | "CONTESTED"
  | "ESCALATED"
  | "RESOLVED"
  | "WITHDRAWN";

export type FirstPublisher = "ORIGIN" | "ACCUSED" | "UNCLEAR";

/** Mirrors `Contract._case_dict`. Amounts are decimal strings of wei. */
export interface Case {
  case_id: number;
  complainant: string;
  respondent: string;
  category: string;
  origin_url: string;
  accused_url: string;
  corroboration_url: string;
  claim_text: string;
  bond: string;
  counter_bond: string;
  appeal_fee: string;
  appellant: string;
  status: CaseStatus;
  verdict: Verdict;
  overlap_pct: number;
  confidence: number;
  first_publisher: FirstPublisher;
  reason: string;
  instance: number;
  winner: string;
  payout: string;
}

export interface Policy {
  category: string;
  revision: number;
  doctrine: string;
}

export interface Standing {
  address: string;
  filed: number;
  contested: number;
  won: number;
  lost: number;
  forfeited: number;
  undecided: number;
  standing: number;
}

export const ZERO_ADDRESS = "0x" + "0".repeat(40);

export const VERDICT_LABEL: Record<string, string> = {
  INFRINGING: "Infringing",
  DERIVATIVE_FAIR: "Derivative but fair",
  INDEPENDENT: "Independent work",
  EVIDENCE_UNAVAILABLE: "Evidence unreadable",
};

export const STATUS_LABEL: Record<CaseStatus, string> = {
  FILED: "Awaiting a respondent",
  CONTESTED: "Contested",
  ESCALATED: "Escalated to appeal",
  RESOLVED: "Decided",
  WITHDRAWN: "Withdrawn",
};

const WEI = 10n ** 18n;

/** "1.5" -> 1500000000000000000n, without dragging in a units library. */
export function toWei(amount: string): bigint {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error("Enter an amount in GEN, e.g. 1.5");
  const [whole, fraction = ""] = trimmed.split(".");
  const padded = (fraction + "0".repeat(18)).slice(0, 18);
  return BigInt(whole) * WEI + BigInt(padded || "0");
}

/** Wei string -> a short human amount. Exact where it can be, rounded where it cannot. */
export function fromWei(wei: string | bigint, decimals = 4): string {
  const value = typeof wei === "bigint" ? wei : BigInt(wei || "0");
  const whole = value / WEI;
  const fraction = (value % WEI).toString().padStart(18, "0").slice(0, decimals);
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

export function shortAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function sameAddress(a?: string, b?: string): boolean {
  return Boolean(a && b) && a!.toLowerCase() === b!.toLowerCase();
}

export function isZero(address?: string): boolean {
  return !address || address.toLowerCase() === ZERO_ADDRESS;
}
