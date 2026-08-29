import { useCallback, useEffect, useState } from "react";
import {
  CHAIN_NAME,
  CONTRACTS_CONFIGURED,
  connectWallet,
  currentAccount,
} from "./lib/chain";
import type { WriteProgress } from "./lib/chain";
import * as court from "./lib/court";
import { usePick } from "./lib/i18n";
import type { Case, Policy, Standing } from "./lib/types";
import { CaseView } from "./components/CaseView";
import { ConsensusOverlay } from "./components/ConsensusOverlay";
import { Docket } from "./components/Docket";
import { DoctrineLibrary } from "./components/DoctrineLibrary";
import { FileComplaint } from "./components/FileComplaint";
import { Standings } from "./components/Standings";
import { Architecture } from "./sections/Architecture";
import { Compare } from "./sections/Compare";
import { Consensus } from "./sections/Consensus";
import { Faq } from "./sections/Faq";
import { Footer } from "./sections/Footer";
import { Hero } from "./sections/Hero";
import { Lifecycle } from "./sections/Lifecycle";
import { Problem } from "./sections/Problem";
import { Signals } from "./sections/Signals";
import { SiteNav } from "./sections/SiteNav";
import { UseCases } from "./sections/UseCases";
import { Verdicts } from "./sections/Verdicts";
import { Walkthrough } from "./sections/Walkthrough";

interface Busy {
  label: string;
  intelligent: boolean;
  progress: WriteProgress | null;
}

const COURT_CONTENT = {
  en: {
    eyebrow: "The court is open",
    heading: "File, contest, adjudicate. Everything from here lands on-chain.",
    lede: `Connect a wallet holding GEN on ${CHAIN_NAME} and use the court below. Reads work without a wallet.`,
    emptyTitle: "Pick a case from the docket.",
    emptyLede: "Every case shows the two works, the standard it was judged against, and the reasoning behind the verdict.",
  },
  vi: {
    eyebrow: "Toa dang mo",
    heading: "Nop don, phan to, xet xu. Moi thu tu day deu len chuoi.",
    lede: `Ket noi vi co GEN tren ${CHAIN_NAME} va su dung toa ben duoi. Doc du lieu khong can vi.`,
    emptyTitle: "Chon mot vu tu so ghi an.",
    emptyLede: "Moi vu kien hien thi hai tac pham, tieu chuan xet xu, va ly do dang sau phan quyet.",
  },
};

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [selected, setSelectedRaw] = useState<number | null>(() => {
    const m = window.location.hash.match(/^#case\/(\d+)$/);
    return m ? Number(m[1]) : null;
  });

  const setSelected = useCallback((id: number | null) => {
    setSelectedRaw(id);
    if (id !== null) {
      window.history.replaceState(null, "", `#case/${id}`);
    } else {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
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
    function onHash() {
      const m = window.location.hash.match(/^#case\/(\d+)$/);
      if (m) setSelectedRaw(Number(m[1]));
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (selected !== null && cases.length > 0) {
      const el = document.getElementById("court");
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }
  }, [selected !== null && cases.length > 0]);

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

  const ct = usePick(COURT_CONTENT);
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
    <>
      <SiteNav account={account} onConnect={handleConnect} />

      <div className="page-messages">
        {error ? <p className="banner error">{error}</p> : null}
        {notice ? <p className="banner notice">{notice}</p> : null}
      </div>

      <Hero cases={cases} policies={policies} />
      <Problem />
      <Lifecycle />
      <Signals />
      <Consensus />
      <Verdicts cases={cases} />
      <Architecture />
      <DoctrineLibrary policies={policies} />
      <UseCases />
      <Compare />
      <Walkthrough />
      <Faq />

      <section id="court" className="marketing-section court-app-section">
        <div className="section-inner">
          <header className="section-heading">
            <span className="section-eyebrow">{ct.eyebrow}</span>
            <h2>{ct.heading}</h2>
            <p className="lede">{ct.lede}</p>
          </header>

          <div className="court-app-grid">
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
                  <h3>{ct.emptyTitle}</h3>
                  <p className="lede">{ct.emptyLede}</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </section>

      <Footer />

      {busy ? (
        <ConsensusOverlay
          label={busy.label}
          progress={busy.progress}
          intelligent={busy.intelligent}
        />
      ) : null}
    </>
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
