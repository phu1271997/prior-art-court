import { useEffect, useState } from "react";
import type { WriteProgress } from "../lib/chain";
import { explorerTx } from "../lib/chain";

/*
  A non-deterministic transaction is slow in a way users have no reference for:
  every validator independently fetches two web pages and runs an LLM over them
  before anyone votes. Left unexplained, a two-minute wait reads as a hung app.

  So the wait is narrated rather than spinner-ed. The stages below are what is
  actually happening on the network, and the elapsed counter makes it clear the
  page is alive.
*/

const STAGES = [
  {
    key: "submitting",
    title: "Signing in your wallet",
    detail: "Approve the transaction to put the case in front of the validators.",
  },
  {
    key: "submitted",
    title: "Waiting for a validator set",
    detail: "The network is selecting the validators who will hear this case.",
  },
  {
    key: "reasoning",
    title: "Validators are reading the evidence",
    detail:
      "Each validator fetches both works from the live web inside the contract and " +
      "reasons about them independently. Nobody is relaying an answer to anyone.",
  },
  {
    key: "agreeing",
    title: "Comparing verdicts",
    detail:
      "Independent runs are accepted only when they reached the same verdict. " +
      "Different wording is fine; a different decision is not.",
  },
];

interface Props {
  label: string;
  progress: WriteProgress | null;
  intelligent?: boolean;
}

export function ConsensusOverlay({ label, progress, intelligent = false }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const status = progress?.status ?? "submitting";
  let stageIndex = status === "submitting" ? 0 : 1;
  if (intelligent && elapsed > 12) stageIndex = 2;
  if (intelligent && elapsed > 45) stageIndex = 3;

  const stages = intelligent ? STAGES : STAGES.slice(0, 2);

  return (
    <div className="overlay" role="status" aria-live="polite">
      <div className="overlay-card">
        <header>
          <h3>{label}</h3>
          <span className="elapsed">{elapsed}s</span>
        </header>

        <ol className="stages">
          {stages.map((stage, index) => (
            <li
              key={stage.key}
              className={index < stageIndex ? "done" : index === stageIndex ? "active" : ""}
            >
              <strong>{stage.title}</strong>
              <span>{stage.detail}</span>
            </li>
          ))}
        </ol>

        {progress?.attempt && progress.attempt > 1 ? (
          <p className="retry">
            The previous round could not agree and committed nothing, so it was
            resubmitted to a fresh validator set. Attempt {progress.attempt}.
          </p>
        ) : null}

        {progress?.hash ? (
          <a className="tx-link" href={explorerTx(progress.hash)} target="_blank" rel="noreferrer">
            Follow the transaction on the explorer ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}
