/*
  The only place this app talks to GenLayer.

  Two rules govern everything below.

  1. No key ever reaches this bundle. `createClient` accepts either a full account
     object (in which case the SDK signs) or just an address string (in which case
     the connected wallet signs). It is handed the address string. Anything
     prefixed VITE_ ships to the browser in plain text, so the only VITE_ values
     here are contract addresses and a chain name.

  2. The wallet must be on the same network as the contracts before it is asked to
     sign anything. MetaMask cannot build a transaction for a chain it is not on,
     and the error it produces when you try says nothing useful — so the chain is
     switched (or added) explicitly at connect time, with the id read from the SDK
     rather than hardcoded.
*/

import { createClient } from "genlayer-js";
import { localnet, studionet } from "genlayer-js/chains";
import { CalldataAddress } from "genlayer-js/types";

type Hex = `0x${string}`;

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const CHAINS = { studionet, localnet } as const;

const clean = (value: string | undefined) =>
  (value ?? "").trim().replace(/^["']|["']$/g, "").trim();

export const CHAIN_NAME = (clean(import.meta.env.VITE_GENLAYER_CHAIN) ||
  "studionet") as keyof typeof CHAINS;

export const chain = CHAINS[CHAIN_NAME] ?? studionet;

export const ADDRESSES = {
  court: clean(import.meta.env.VITE_COURT_ADDRESS),
  policyRegistry: clean(import.meta.env.VITE_POLICY_REGISTRY_ADDRESS),
  reputation: clean(import.meta.env.VITE_REPUTATION_ADDRESS),
} as const;

export const CONTRACTS_CONFIGURED = Boolean(ADDRESSES.court && ADDRESSES.policyRegistry);

export const EXPLORER = "https://explorer-studio.genlayer.com";

/** Transaction page. Verified route — /transactions/<hash> 308s to this one. */
export function explorerTx(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}

/** Contract page. Note it is /contracts/, not /address/ — the latter 404s. */
export function explorerContract(address: string): string {
  return `${EXPLORER}/contracts/${address}`;
}

/** Wrap a hex address so the GenVM receives an Address rather than a string. */
export function asAddress(hex: string): CalldataAddress {
  const body = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array((body.match(/../g) ?? []).map((byte) => parseInt(byte, 16)));
  return new CalldataAddress(bytes);
}

// ---------------------------------------------------------------------- wallet

const CHAIN_ID_HEX = "0x" + BigInt(chain.id).toString(16);

export async function connectWallet(): Promise<string> {
  const ethereum = window.ethereum;
  if (!ethereum) {
    throw new Error(
      "No wallet found. Install MetaMask, then add the GenLayer Studio network to it."
    );
  }

  const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) throw new Error("No account was authorised in the wallet.");

  await ensureNetwork();
  return accounts[0];
}

export async function ensureNetwork(): Promise<void> {
  const ethereum = window.ethereum;
  if (!ethereum) return;

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (error) {
    const code = (error as { code?: number })?.code;
    // 4902: unknown chain. -32603: some builds report the same thing this way.
    if (code === 4902 || code === -32603) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID_HEX,
            chainName: chain.name ?? "GenLayer Studio Network",
            nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
            rpcUrls: [chain.rpcUrls?.default?.http?.[0] ?? "https://studio.genlayer.com/api"],
            blockExplorerUrls: [EXPLORER],
          },
        ],
      });
      return;
    }
    throw error;
  }
}

export async function currentAccount(): Promise<string | null> {
  const ethereum = window.ethereum;
  if (!ethereum) return null;
  const accounts = (await ethereum.request({ method: "eth_accounts" })) as string[];
  return accounts?.[0] ?? null;
}

// ----------------------------------------------------------------------- calls

function client(account?: string) {
  return createClient({
    chain,
    ...(account ? { account: account as Hex } : {}),
  });
}

/*
  The hosted RPC occasionally answers a read with an HTML interstitial rather than
  JSON — a rate limiter or an edge cache, not the contract. Left unhandled that
  surfaces as "Unexpected token '<'" and an empty docket, which reads as a broken
  app. It is transient, so reads back off and try again; a genuine contract error
  has a different shape and is rethrown immediately.
*/
const isTransientRead = (error: unknown) =>
  /Unexpected token '<'|<!DOCTYPE|Failed to fetch|NetworkError|429|502|503|504/i.test(
    String((error as Error)?.message ?? error)
  );

export async function read<T = unknown>(
  address: string,
  functionName: string,
  args: unknown[] = [],
  attempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = await client().readContract({
        address: address as Hex,
        functionName,
        args: args as never,
      });
      return result as T;
    } catch (error) {
      lastError = error;
      if (!isTransientRead(error)) throw error;
      await sleep(600 * (attempt + 1));
    }
  }
  throw lastError;
}

export async function readJson<T>(
  address: string,
  functionName: string,
  args: unknown[] = []
): Promise<T> {
  const raw = await read<string>(address, functionName, args);
  return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as T;
}

/*
  A decided transaction is not the same thing as a successful one, and the two
  need opposite responses.

  UNDETERMINED and the timeouts mean the round committed nothing: no validator set
  formed, or the ones that did could not agree. That is a normal outcome for a
  non-deterministic method and resubmitting draws a fresh set. FINISHED_WITH_ERROR
  means the contract itself threw — resubmitting would throw again, so it is
  surfaced immediately with the reason.
*/
const DECIDED = new Set([
  "ACCEPTED",
  "FINALIZED",
  "UNDETERMINED",
  "CANCELED",
  "LEADER_TIMEOUT",
  "VALIDATORS_TIMEOUT",
]);
const RETRYABLE = new Set(["UNDETERMINED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT"]);

export interface WriteProgress {
  hash?: string;
  status: string;
  attempt: number;
}

interface Receipt {
  txId?: string;
  tx_id?: string;
  statusName?: string;
  txExecutionResultName?: string;
  consumedValidators?: unknown[];
  consumed_validators?: unknown[];
  numOfRounds?: number;
  num_of_rounds?: number;
  errorMessage?: string;
  error?: string;
}

export interface WriteResult {
  hash: string;
  validators: number;
  rounds: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransportBlip = (error: unknown) =>
  /fetch failed|Failed to fetch|ECONNRESET|ETIMEDOUT|socket hang up|NetworkError/i.test(
    String((error as Error)?.message ?? error)
  );

export async function write(
  account: string,
  address: string,
  functionName: string,
  args: unknown[] = [],
  options: { value?: bigint; onProgress?: (progress: WriteProgress) => void; budgetMs?: number } = {}
): Promise<WriteResult> {
  await ensureNetwork();

  const { value = 0n, onProgress, budgetMs = 300_000 } = options;
  const deadline = Date.now() + budgetMs;
  const connection = client(account);
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;
    onProgress?.({ status: "submitting", attempt });

    const hash = (await connection.writeContract({
      address: address as Hex,
      functionName,
      args: args as never,
      value,
    })) as string;

    onProgress?.({ hash, status: "submitted", attempt });

    let receipt: Receipt | undefined;
    while (Date.now() < deadline) {
      await sleep(4000);
      try {
        const tx = (await connection.getTransaction({ hash: hash as never })) as Receipt;
        const status = tx?.statusName ?? "";
        onProgress?.({ hash, status: status || "pending", attempt });
        if (DECIDED.has(status)) {
          receipt = tx;
          break;
        }
      } catch (error) {
        if (!isTransportBlip(error)) throw error;
      }
    }

    const status = receipt?.statusName;
    if (!receipt || !status || RETRYABLE.has(status)) {
      if (Date.now() >= deadline) break;
      await sleep(5000);
      continue;
    }

    const execution = receipt.txExecutionResultName ?? "";
    if (execution && execution !== "SUCCESS") {
      throw new Error(
        `The contract refused this transaction (${execution}). ` +
          (receipt.errorMessage ?? receipt.error ?? "Check the transaction on the explorer.")
      );
    }

    const validators = (receipt.consumedValidators ?? receipt.consumed_validators ?? []) as unknown[];
    return {
      hash,
      validators: validators.length,
      rounds: receipt.numOfRounds ?? receipt.num_of_rounds ?? 1,
    };
  }

  throw new Error(
    "The network did not reach a decision within the time budget. Nothing was " +
      "committed — the case is unchanged, and you can try again."
  );
}
