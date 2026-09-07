/** Domain-level wrappers over the three contracts. Nothing here knows about React. */

import { ADDRESSES, asAddress, read, readJson, write } from "./chain";
import type { WriteProgress, WriteResult } from "./chain";
import type { Case, Policy, Standing } from "./types";

export function listPolicies(): Promise<Policy[]> {
  return readJson<Policy[]>(ADDRESSES.policyRegistry, "get_categories");
}

export function listCases(limit = 0): Promise<Case[]> {
  return readJson<Case[]>(ADDRESSES.court, "get_cases", [limit]);
}

export function getCase(caseId: number): Promise<Case> {
  return readJson<Case>(ADDRESSES.court, "get_case", [caseId]);
}

export function getHistory(caseId: number): Promise<Record<string, unknown>[]> {
  return readJson<Record<string, unknown>[]>(ADDRESSES.court, "get_history", [caseId]);
}

export function getWithdrawable(account: string): Promise<string> {
  return read<string>(ADDRESSES.court, "get_withdrawable", [asAddress(account)]);
}

export function getStanding(account: string): Promise<Standing> {
  if (!ADDRESSES.reputation) return Promise.reject(new Error("Reputation is not configured"));
  return readJson<Standing>(ADDRESSES.reputation, "get_standing", [asAddress(account)]);
}

export function getLeaderboard(limit = 10): Promise<Standing[]> {
  if (!ADDRESSES.reputation) return Promise.resolve([]);
  return readJson<Standing[]>(ADDRESSES.reputation, "get_leaderboard", [limit]);
}

type Progress = (progress: WriteProgress) => void;

export function fileCase(
  account: string,
  input: { category: string; originUrl: string; accusedUrl: string; claim: string; bond: bigint },
  onProgress?: Progress
): Promise<WriteResult> {
  return write(
    account,
    ADDRESSES.court,
    "file_case",
    [input.category, input.originUrl, input.accusedUrl, input.claim],
    { value: input.bond, onProgress }
  );
}

export function contestCase(
  account: string,
  caseId: number,
  counterBond: bigint,
  onProgress?: Progress
): Promise<WriteResult> {
  return write(account, ADDRESSES.court, "contest_case", [caseId], {
    value: counterBond,
    onProgress,
  });
}

export function withdrawCase(
  account: string,
  caseId: number,
  onProgress?: Progress
): Promise<WriteResult> {
  return write(account, ADDRESSES.court, "withdraw_case", [caseId], { onProgress });
}

/**
 * The intelligent one. Every validator fetches both pages and re-reasons, so this
 * takes far longer than an ordinary transaction — the caller is expected to say so.
 */
export function adjudicate(
  account: string,
  caseId: number,
  onProgress?: Progress
): Promise<WriteResult> {
  return write(account, ADDRESSES.court, "adjudicate", [caseId], { onProgress });
}

export function appeal(
  account: string,
  caseId: number,
  corroborationUrl: string,
  fee: bigint,
  onProgress?: Progress
): Promise<WriteResult> {
  return write(account, ADDRESSES.court, "appeal", [caseId, corroborationUrl], {
    value: fee,
    onProgress,
  });
}

export function withdrawBalance(account: string, onProgress?: Progress): Promise<WriteResult> {
  return write(account, ADDRESSES.court, "withdraw", [], { onProgress });
}

export function syncStandings(
  account: string,
  limit = 20,
  onProgress?: Progress
): Promise<WriteResult> {
  return write(account, ADDRESSES.reputation, "sync_recent", [limit], { onProgress });
}

/* ------------------------------------------------ Phase 7 achievements + admin */

export interface Badge {
  kind: string;
  case_id: number;
  minted_at: number;
}

export function getBadges(account: string): Promise<Badge[]> {
  if (!ADDRESSES.achievements) return Promise.resolve([]);
  return readJson<Badge[]>(ADDRESSES.achievements, "get_badges", [asAddress(account)]);
}

export function getBadgeHolders(): Promise<string[]> {
  if (!ADDRESSES.achievements) return Promise.resolve([]);
  return readJson<string[]>(ADDRESSES.achievements, "get_holders");
}

export function getBadgeCatalog(): Promise<string[]> {
  if (!ADDRESSES.achievements) return Promise.resolve([]);
  return readJson<string[]>(ADDRESSES.achievements, "get_badge_catalog");
}

export function mintBadgesFromCase(
  account: string,
  caseId: number,
  onProgress?: Progress
): Promise<WriteResult> {
  return write(account, ADDRESSES.achievements, "mint_from_case", [caseId], { onProgress });
}

export function mintBadgesRecent(
  account: string,
  limit = 20,
  onProgress?: Progress
): Promise<WriteResult> {
  return write(account, ADDRESSES.achievements, "mint_recent", [limit], { onProgress });
}

export function getMinBondFor(account: string): Promise<string> {
  return read<string>(ADDRESSES.court, "get_min_bond_for", [asAddress(account)]);
}

export function getFilingStandingFloor(): Promise<number> {
  return read<number>(ADDRESSES.court, "get_filing_standing_floor");
}

/* ---- admin-only ---- */

export function registerPolicy(
  account: string,
  category: string,
  doctrine: string,
  onProgress?: Progress
): Promise<WriteResult> {
  return write(
    account,
    ADDRESSES.policyRegistry,
    "register_policy",
    [category, doctrine],
    { onProgress }
  );
}

export function sweepForfeited(
  account: string,
  onProgress?: Progress
): Promise<WriteResult> {
  return write(account, ADDRESSES.court, "sweep_forfeited", [], { onProgress });
}

export function setReputationOnCourt(
  account: string,
  reputationAddress: string,
  onProgress?: Progress
): Promise<WriteResult> {
  return write(
    account,
    ADDRESSES.court,
    "set_reputation",
    [asAddress(reputationAddress)],
    { onProgress }
  );
}

export function setFilingStandingFloor(
  account: string,
  floor: number,
  onProgress?: Progress
): Promise<WriteResult> {
  return write(account, ADDRESSES.court, "set_filing_standing_floor", [floor], {
    onProgress,
  });
}
