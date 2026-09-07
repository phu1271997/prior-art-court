/*
  @prior-art-court/sdk — TypeScript SDK for the Prior Art Court doctrine layer.

  The SDK is a thin, framework-agnostic wrapper over `genlayer-js` that lets any
  third-party site — a moderation dashboard, a bug-bounty submission portal, an
  SLA-monitoring tool — file complaints, read the docket, and stream verdicts
  from the Prior Art Court contracts on GenLayer.

  Design rules:

    1. No secret ever reaches this bundle. Reads run through `readContract` on
       an anonymous client; writes require a caller-supplied `account` (a
       viem/genlayer-js account) which the host site provides — through a
       connected wallet, a hosted key manager, or its own signer.
    2. Contract addresses are constructor-supplied; there is no built-in
       "default" so the SDK cannot silently point at the wrong network.
    3. The public surface is minimal on purpose. It mirrors the domain — file,
       read, adjudicate, appeal, watch — not the contract's internal shape.

  Usage:

    ```ts
    import { PriorArtCourt } from '@prior-art-court/sdk';
    import { studionet } from 'genlayer-js/chains';

    const court = new PriorArtCourt({
      chain: studionet,
      addresses: {
        court: '0x082FcFeFEE1B7642C42bd5E1eBaa6C029fe19869',
        policyRegistry: '0xFC3A3422c64c3B84eDb8B31a333C8531B8Ba1755',
        reputation: '0xF950283384B69900a4B13aCDEc99A7adB137CA7e',
        achievements: '0x0000000000000000000000000000000000000000',
      },
    });

    // Read side — no wallet needed.
    const cases = await court.listCases(10);
    const standing = await court.getStanding('0xabc…');

    // Write side — pass a genlayer-js account.
    await court.fileCase({
      account,
      category: 'sla-clause',
      originUrl: 'https://vendor.example/sla',
      accusedUrl: 'https://status.vendor.example/2026-09-01',
      claim: 'SLA target was 99.9%; the reported incident dropped uptime below.',
      bond: 1_000_000_000_000_000_000n,
    });
    ```
*/

import { createClient } from "genlayer-js";
import { CalldataAddress } from "genlayer-js/types";

// -------------------------------------------------------------- types

type Hex = `0x${string}`;

export interface PriorArtCourtAddresses {
  /** The PriorArtCourt contract — where cases live. */
  court: string;
  /** The PolicyRegistry — doctrine is read here at adjudication time. */
  policyRegistry: string;
  /** The Reputation contract — optional; leave empty for a court without gating. */
  reputation?: string;
  /** The Achievements contract — optional; leave empty for a court without badges. */
  achievements?: string;
}

export interface PriorArtCourtOptions {
  /** A `genlayer-js/chains` chain descriptor. */
  chain: unknown;
  /** Deployed contract addresses on that chain. */
  addresses: PriorArtCourtAddresses;
}

export interface CaseRecord {
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
  status:
    | "FILED"
    | "CONTESTED"
    | "ESCALATED"
    | "RESOLVED"
    | "WITHDRAWN";
  verdict: string;
  overlap_pct: number;
  confidence: number;
  first_publisher: "ORIGIN" | "ACCUSED" | "UNCLEAR";
  reason: string;
  instance: 0 | 1 | 2;
  winner: string;
  payout: string;
}

export interface StandingRecord {
  address: string;
  standing: number;
  filed: number;
  contested: number;
  won: number;
  lost: number;
  forfeited: number;
  undecided: number;
}

export interface PolicyRecord {
  category: string;
  doctrine: string;
  revision: number;
}

export interface Badge {
  kind: string;
  case_id: number;
  minted_at: number;
}

export interface AmicusBriefRecord {
  index: number;
  submitter: string;
  url: string;
  note: string;
  stake: string;
  stance: "SUPPORTING_COMPLAINANT" | "SUPPORTING_RESPONDENT" | "NEUTRAL";
  refunded: boolean;
}

export interface FileCaseInput {
  account: unknown;
  category: string;
  originUrl: string;
  accusedUrl: string;
  claim: string;
  bond: bigint;
}

// -------------------------------------------------------------- client

/**
 * The one class the SDK exports. Construct it once with the deployed contract
 * addresses on your target GenLayer chain, then call the domain methods.
 *
 * Reads are cache-safe (idempotent, no side effects). Writes are the caller's
 * responsibility to await and to handle failure of.
 */
export class PriorArtCourt {
  private readonly chain: unknown;
  private readonly addresses: PriorArtCourtAddresses;

  constructor(opts: PriorArtCourtOptions) {
    this.chain = opts.chain;
    this.addresses = opts.addresses;
  }

  // ----- reads

  /** Return the newest N cases (or the entire docket when `limit <= 0`). */
  async listCases(limit = 0): Promise<CaseRecord[]> {
    return this.readJson<CaseRecord[]>(this.addresses.court, "get_cases", [limit]);
  }

  /** Fetch a single case by id. Throws if it does not exist. */
  async getCase(caseId: number): Promise<CaseRecord> {
    return this.readJson<CaseRecord>(this.addresses.court, "get_case", [caseId]);
  }

  /** Every provenance entry the court has recorded for this case. */
  async getHistory(caseId: number): Promise<Record<string, unknown>[]> {
    return this.readJson<Record<string, unknown>[]>(this.addresses.court, "get_history", [
      caseId,
    ]);
  }

  /** Every doctrine category currently registered, newest revisions. */
  async listPolicies(): Promise<PolicyRecord[]> {
    return this.readJson<PolicyRecord[]>(
      this.addresses.policyRegistry,
      "get_categories",
    );
  }

  /** Reputation record for an account. Falls back to base standing when reputation is not wired. */
  async getStanding(account: string): Promise<StandingRecord | null> {
    if (!this.addresses.reputation) return null;
    return this.readJson<StandingRecord>(
      this.addresses.reputation,
      "get_standing",
      [this.wrapAddress(account)],
    );
  }

  /** Top-N leaderboard. Newest N entries by descending standing. */
  async getLeaderboard(limit = 20): Promise<StandingRecord[]> {
    if (!this.addresses.reputation) return [];
    return this.readJson<StandingRecord[]>(
      this.addresses.reputation,
      "get_leaderboard",
      [limit],
    );
  }

  /** Non-transferable badges an account has earned. */
  async getBadges(account: string): Promise<Badge[]> {
    if (!this.addresses.achievements) return [];
    return this.readJson<Badge[]>(this.addresses.achievements, "get_badges", [
      this.wrapAddress(account),
    ]);
  }

  /** How much GEN this account may currently pull out of the court. */
  async getWithdrawable(account: string): Promise<string> {
    return this.readContract<string>(this.addresses.court, "get_withdrawable", [
      this.wrapAddress(account),
    ]);
  }

  // ----- writes

  /** File a new complaint and stake a bond. Returns the transaction hash. */
  async fileCase(input: FileCaseInput): Promise<string> {
    return this.writeContract(input.account, this.addresses.court, "file_case", [
      input.category,
      input.originUrl,
      input.accusedUrl,
      input.claim,
    ], input.bond);
  }

  /** Match the complainant's bond to contest an open case. */
  async contestCase(opts: {
    account: unknown;
    caseId: number;
    counterBond: bigint;
  }): Promise<string> {
    return this.writeContract(
      opts.account,
      this.addresses.court,
      "contest_case",
      [opts.caseId],
      opts.counterBond,
    );
  }

  /** Trigger the first-instance hearing on an open case. Intelligent. */
  async adjudicate(opts: { account: unknown; caseId: number }): Promise<string> {
    return this.writeContract(
      opts.account,
      this.addresses.court,
      "adjudicate",
      [opts.caseId],
    );
  }

  /** Escalate an ESCALATED case to the final instance with a corroborating URL and fee. */
  async appeal(opts: {
    account: unknown;
    caseId: number;
    corroborationUrl: string;
    fee: bigint;
  }): Promise<string> {
    return this.writeContract(
      opts.account,
      this.addresses.court,
      "appeal",
      [opts.caseId, opts.corroborationUrl],
      opts.fee,
    );
  }

  /** Pull whatever the court owes this account. */
  async withdraw(account: unknown): Promise<string> {
    return this.writeContract(account, this.addresses.court, "withdraw", []);
  }

  // ----- amicus (Phase 9)

  /** Every amicus brief staked on this case, in submission order. */
  async listAmicusBriefs(caseId: number): Promise<AmicusBriefRecord[]> {
    return this.readJson<AmicusBriefRecord[]>(
      this.addresses.court,
      "get_amicus_briefs",
      [caseId],
    );
  }

  /**
   * Stake a URL and a stance into a case as a non-party. The stake must be
   * at least 0.1 GEN; the stance must be one of SUPPORTING_COMPLAINANT /
   * SUPPORTING_RESPONDENT / NEUTRAL.
   */
  async submitAmicus(opts: {
    account: unknown;
    caseId: number;
    url: string;
    note: string;
    stance: "SUPPORTING_COMPLAINANT" | "SUPPORTING_RESPONDENT" | "NEUTRAL";
    stake: bigint;
  }): Promise<string> {
    return this.writeContract(
      opts.account,
      this.addresses.court,
      "submit_amicus",
      [opts.caseId, opts.url, opts.note, opts.stance],
      opts.stake,
    );
  }

  // ----- helpers

  private client(account?: unknown) {
    return createClient({
      chain: this.chain as never,
      ...(account ? { account: account as never } : {}),
    });
  }

  private wrapAddress(hex: string): CalldataAddress {
    const body = hex.startsWith("0x") ? hex.slice(2) : hex;
    const bytes = new Uint8Array(
      (body.match(/../g) ?? []).map((byte) => parseInt(byte, 16)),
    );
    return new CalldataAddress(bytes);
  }

  private async readContract<T>(
    address: string,
    functionName: string,
    args: unknown[] = [],
  ): Promise<T> {
    const result = await this.client().readContract({
      address: address as Hex,
      functionName,
      args: args as never,
    });
    return result as T;
  }

  private async readJson<T>(
    address: string,
    functionName: string,
    args: unknown[] = [],
  ): Promise<T> {
    const raw = await this.readContract<string | unknown>(address, functionName, args);
    return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as T;
  }

  private async writeContract(
    account: unknown,
    address: string,
    functionName: string,
    args: unknown[] = [],
    value: bigint = 0n,
  ): Promise<string> {
    const c = this.client(account);
    const hash = await c.writeContract({
      address: address as Hex,
      functionName,
      args: args as never,
      value,
    });
    return hash as string;
  }
}

export default PriorArtCourt;
