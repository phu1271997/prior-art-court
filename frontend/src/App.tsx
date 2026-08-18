import { useCallback, useEffect, useState } from "react";
import {
  ADDRESSES,
  CHAIN_NAME,
  CONTRACTS_CONFIGURED,
  connectWallet,
  currentAccount,
  explorerContract,
} from "./lib/chain";
import type { WriteProgress } from "./lib/chain";
import * as court from "./lib/court";
import type { Case, Policy, Standing } from "./lib/types";
import { shortAddress } from "./lib/types";
import { CaseView } from "./components/CaseView";
import { ConsensusOverlay } from "./components/ConsensusOverlay";
import { Docket } from "./components/Docket";
import { FileComplaint } from "./components/FileComplaint";
import { Standings } from "./components/Standings";

interface Busy {
  label: string;
  intelligent: boolean;
  progress: WriteProgress | null;
}

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [leaderboard, setLeaderboard] = useState<Standing[]>([]);
  const [withdrawable, setWithdrawable] = useState("0");
  const [busy, setBusy] = useState<Busy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!CONTRACTS_CONFIGURED) return;
    try {
      const [nextPolicies, nextCases, board] = await Promise.all([
        court.listPolicies(),
        court.listCases(0),
        court.getLeaderboard(10),
      ]);
      setPolicies(nextPolicies);
      setCases(nextCases);
      setLeaderboard(board);
      if (account) setWithdrawable(await court.getWithdrawable(account));
    } catch (refreshError) {
      setError(describe(refreshError));
    }
  }, [account]);

  useEffect(() => {
    currentAccount().then(setAccount).catch(() => undefined);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (selected === null) {
      setHistory([]);
      return;
    }
    court
      .getHistory(selected)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [selected, cases]);

  const selectedCase = cases.find((entry) => entry.case_id === selected) ?? null;

  async function run(
    label: string,
    intelligent: boolean,
    action: (onProgress: (progress: WriteProgress) => void) => Promise<{ hash: string; validators: number }>
  ) {
    if (!account) throw new Error("Connect a wallet first.");
    setError(null);
    setNotice(null);
    setBusy({ label, intelligent, progress: null });
    try {
      const result = await action((progress) =>
        setBusy((current) => (current ? { ...current, progress } : current))
      );
      setNotice(
        `${label} settled on ${CHAIN_NAME}` +
          (result.validators ? ` — ${result.validators} validators took part.` : ".")
      );
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleConnect() {
    setError(null);
    try {
      setAccount(await connectWallet());
    } catch (connectError) {
      setError(describe(connectError));
    }
  }

  if (!CONTRACTS_CONFIGURED) {
    return (
      <div className="setup">
        <h1>Prior Art Court</h1>
        <p>
          No contract addresses are configured. Run <code>python scripts/deploy.py</code> and it
          will write <code>frontend/.env.local</code> for you.
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand">
          <h1>Prior Art Court</h1>
          <p>Who copied whom, decided on-chain — by validators who read both works themselves.</p>
        </div>

        <div className="chain-info">
          <span className="network">{CHAIN_NAME}</span>
          <a href={explorerContract(ADDRESSES.court)} target="_blank" rel="noreferrer">
            court {shortAddress(ADDRESSES.court)} ↗
          </a>
          {account ? (
            <span className="account">{shortAddress(account)}</span>
          ) : (
            <button onClick={handleConnect}>Connect wallet</button>
          )}
        </div>
      </header>

      {error ? <p className="banner error">{error}</p> : null}
      {notice ? <p className="banner notice">{notice}</p> : null}

      <main>
        <aside>
          <FileComplaint
            policies={policies}
            disabled={!account || Boolean(busy)}
            onSubmit={(input) =>
              run("Filing the complaint", false, (onProgress) =>
                court.fileCase(account!, input, onProgress)
              )
            }
          />
          <Standings
            leaderboard={leaderboard}
            withdrawable={withdrawable}
            account={account}
            busy={Boolean(busy)}
            onWithdraw={() =>
              run("Withdrawing your balance", false, (onProgress) =>
                court.withdrawBalance(account!, onProgress)
              )
            }
            onSync={() =>
              run("Folding decided cases into standing", false, (onProgress) =>
                court.syncStandings(account!, 20, onProgress)
              )
            }
          />
        </aside>

        <section className="stream">
          <Docket cases={cases} selected={selected} onSelect={setSelected} />
          {selectedCase ? (
            <CaseView
              entry={selectedCase}
              history={history}
              account={account}
              busy={Boolean(busy)}
              onContest={(caseId, counterBond) =>
                run("Contesting the complaint", false, (onProgress) =>
                  court.contestCase(account!, caseId, counterBond, onProgress)
                )
              }
              onAdjudicate={(caseId) =>
                run("The court is hearing the case", true, (onProgress) =>
                  court.adjudicate(account!, caseId, onProgress)
                )
              }
              onAppeal={(caseId, url, fee) =>
                run("The final instance is hearing the appeal", true, (onProgress) =>
                  court.appeal(account!, caseId, url, fee, onProgress)
                )
              }
              onWithdrawCase={(caseId) =>
                run("Withdrawing the complaint", false, (onProgress) =>
                  court.withdrawCase(account!, caseId, onProgress)
                )
              }
            />
          ) : (
            <div className="panel empty">
              <h2>Pick a case</h2>
              <p className="lede">
                Every case shows the two works, the standard it was judged against,
                and the reasoning behind the verdict.
              </p>
            </div>
          )}
        </section>
      </main>

      <footer>
        <span>Deployed on GenLayer {CHAIN_NAME} ·</span>{" "}
        <a href={explorerContract(ADDRESSES.policyRegistry)} target="_blank" rel="noreferrer">
          registry {shortAddress(ADDRESSES.policyRegistry)}
        </a>{" · "}
        <a href={explorerContract(ADDRESSES.reputation)} target="_blank" rel="noreferrer">
          reputation {shortAddress(ADDRESSES.reputation)}
        </a>
      </footer>

      {busy ? (
        <ConsensusOverlay
          label={busy.label}
          progress={busy.progress}
          intelligent={busy.intelligent}
        />
      ) : null}
    </div>
  );
}

function describe(error: unknown): string {
  const message = String((error as Error)?.message ?? error);
  if (/insufficient funds/i.test(message)) {
    return (
      "That account has no GEN on this network. Fund it from the Studio Accounts " +
      "panel before staking a bond."
    );
  }
  if (/'from'/.test(message)) {
    return (
      "The wallet is on a different network than this app. Approve the network " +
      "switch prompt, or add the GenLayer Studio network manually."
    );
  }
  return message;
}
