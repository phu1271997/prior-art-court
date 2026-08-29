import { useEffect, useState } from "react";
import { usePick } from "../lib/i18n";
import type { WriteProgress } from "../lib/chain";
import { explorerTx } from "../lib/chain";

const CONTENT = {
  en: {
    stages: [
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
    ],
    retry: "The previous round could not agree and committed nothing, so it was resubmitted to a fresh validator set. Attempt",
    followTx: "Follow the transaction on the explorer",
  },
  vi: {
    stages: [
      {
        key: "submitting",
        title: "Dang ky trong vi",
        detail: "Phe duyet giao dich de dua vu kien truoc cac validator.",
      },
      {
        key: "submitted",
        title: "Cho chon tap validator",
        detail: "Mang dang chon cac validator se xet xu vu nay.",
      },
      {
        key: "reasoning",
        title: "Cac validator dang doc chung cu",
        detail:
          "Moi validator tu tai ca hai tac pham tu web truc tiep ben trong contract va " +
          "suy luan doc lap. Khong ai chuyen cau tra loi cho ai.",
      },
      {
        key: "agreeing",
        title: "So sanh phan quyet",
        detail:
          "Cac ket qua doc lap chi duoc chap nhan khi dat cung phan quyet. " +
          "Cach viet khac nhau thi duoc; quyet dinh khac nhau thi khong.",
      },
    ],
    retry: "Phien truoc khong dong thuan duoc va khong ghi gi, nen da gui lai cho tap validator moi. Lan thu",
    followTx: "Theo doi giao dich tren explorer",
  },
};

interface Props {
  label: string;
  progress: WriteProgress | null;
  intelligent?: boolean;
}

export function ConsensusOverlay({ label, progress, intelligent = false }: Props) {
  const t = usePick(CONTENT);
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

  const stages = intelligent ? t.stages : t.stages.slice(0, 2);

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
            {t.retry} {progress.attempt}.
          </p>
        ) : null}

        {progress?.hash ? (
          <a className="tx-link" href={explorerTx(progress.hash)} target="_blank" rel="noreferrer">
            {t.followTx} ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}
