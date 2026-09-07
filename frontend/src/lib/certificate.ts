/**
 * Verifiable Verdict Certificate.
 *
 * A court decision that lives only inside a dApp is not much of a record: the
 * frontend can go away, and the web pages the verdict was about can change or
 * die. This turns any settled case into a portable, self-verifying document.
 *
 * The certificate is NOT a claim you have to trust. It names its source — the
 * chain, the contract address, and the case id — and carries a SHA-256 digest
 * computed over the canonical decision fields. Anyone can re-read `get_case` from
 * that contract, run `verifyCertificate`, and confirm the digest still matches.
 * If the court's stored decision ever differed from the certificate, the digest
 * would not reproduce. No pinning service, no extra trusted party.
 */

import type { Case } from "./types";

export interface Certificate {
  document: "Prior Art Court — Verdict Certificate";
  version: 1;
  issued_at: string; // ISO-8601, informational only (not part of the digest)
  source: {
    chain: string;
    court_address: string;
    case_id: number;
  };
  decision: {
    category: string;
    origin_url: string;
    accused_url: string;
    status: string;
    resolution: string;
    verdict: string;
    overlap_pct: number;
    confidence: number;
    first_publisher: string;
    instance: number;
    reason: string;
    cited_precedents: number[];
    precedent_alignment: string;
    complainant: string;
    respondent: string;
    winner: string;
    payout: string;
  };
  digest: {
    algorithm: "SHA-256";
    // hex digest over `canonicalString(decision)` — re-derivable from chain state.
    value: string;
    canonical: string;
  };
}

/**
 * The exact string the digest is taken over. Order is fixed and explicit so the
 * digest is reproducible from `get_case` alone — never rely on JSON key ordering.
 */
export function canonicalString(entry: Case, chain: string, court: string): string {
  const fields: [string, string | number][] = [
    ["chain", chain],
    ["court", court.toLowerCase()],
    ["case_id", entry.case_id],
    ["category", entry.category],
    ["origin_url", entry.origin_url],
    ["accused_url", entry.accused_url],
    ["status", entry.status],
    ["resolution", entry.resolution ?? ""],
    ["verdict", entry.verdict ?? ""],
    ["overlap_pct", entry.overlap_pct],
    ["confidence", entry.confidence],
    ["first_publisher", entry.first_publisher],
    ["instance", entry.instance],
    ["reason", entry.reason ?? ""],
    ["cited_precedents", (entry.cited_precedents ?? []).join(",")],
    ["precedent_alignment", entry.precedent_alignment ?? ""],
    ["complainant", entry.complainant.toLowerCase()],
    ["respondent", entry.respondent.toLowerCase()],
    ["winner", entry.winner.toLowerCase()],
    ["payout", entry.payout],
  ];
  return fields.map(([k, v]) => `${k}=${v}`).join("\n");
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildCertificate(
  entry: Case,
  chain: string,
  court: string,
): Promise<Certificate> {
  const canonical = canonicalString(entry, chain, court);
  const value = await sha256Hex(canonical);
  return {
    document: "Prior Art Court — Verdict Certificate",
    version: 1,
    issued_at: new Date().toISOString(),
    source: { chain, court_address: court, case_id: entry.case_id },
    decision: {
      category: entry.category,
      origin_url: entry.origin_url,
      accused_url: entry.accused_url,
      status: entry.status,
      resolution: entry.resolution ?? "",
      verdict: entry.verdict ?? "",
      overlap_pct: entry.overlap_pct,
      confidence: entry.confidence,
      first_publisher: entry.first_publisher,
      instance: entry.instance,
      reason: entry.reason ?? "",
      cited_precedents: entry.cited_precedents ?? [],
      precedent_alignment: entry.precedent_alignment ?? "",
      complainant: entry.complainant,
      respondent: entry.respondent,
      winner: entry.winner,
      payout: entry.payout,
    },
    digest: { algorithm: "SHA-256", value, canonical },
  };
}

/** Re-derive the digest from a case and confirm it matches a certificate. */
export async function verifyCertificate(cert: Certificate, entry: Case): Promise<boolean> {
  const value = await sha256Hex(
    canonicalString(entry, cert.source.chain, cert.source.court_address),
  );
  return value === cert.digest.value;
}

/** Trigger a browser download of the certificate as pretty JSON. */
export function downloadCertificate(cert: Certificate): void {
  const blob = new Blob([JSON.stringify(cert, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `prior-art-court-verdict-${cert.source.case_id}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
