import { useState } from "react";
import { usePick } from "../lib/i18n";
import type { Case } from "../lib/types";
import {
  STATUS_LABEL,
  VERDICT_LABEL,
  fromWei,
  isZero,
  sameAddress,
  shortAddress,
  toWei,
} from "../lib/types";

interface Props {
  entry: Case;
  history: Record<string, unknown>[];
  account: string | null;
  busy: boolean;
  onContest: (caseId: number, counterBond: bigint) => Promise<void>;
  onAdjudicate: (caseId: number) => Promise<void>;
  onAppeal: (caseId: number, corroborationUrl: string, fee: bigint) => Promise<void>;
  onWithdrawCase: (caseId: number) => Promise<void>;
}

const CONTENT = {
  en: {
    exhibitA: "Exhibit A — claimed original",
    exhibitB: "Exhibit B — alleged copy",
    filedBy: "filed by",
    contestedBy: "contested by",
    uncontested: "uncontested",
    complainantBond: "Complainant's bond",
    counterBond: "Counter-bond",
    atStake: "At stake",
    contestLabel: "Contest — match the bond",
    stakeContest: "Stake and contest",
    withdrawComplaint: "Withdraw the complaint and take the bond back",
    adjudicateFineprint: "Anyone may ask the court to hear a case. Every validator will fetch both pages and reason about them, so this takes a minute or two.",
    sendToCourt: "Send to the court",
    appealFineprint: "The first instance would not decide this on two sources. An appeal reads a third — an archive snapshot, a commit history, a dated citation — and settles which work came first. Its decision is final.",
    corroboratingSource: "Corroborating source",
    appealFeeLabel: "Appeal fee (GEN)",
    appealButton: "Appeal to the final instance",
    escalatedNotParty: "Escalated. Only the complainant or the respondent may appeal it.",
    provenance: "Provenance",
    firstInstance: "First instance",
    finalInstance: "Final instance",
    traceableOverlap: "Traceable overlap",
    adjudicatorConfidence: "Adjudicator confidence",
    publishedFirst: "Published first",
    refundSettlement: "Every stake was returned. A court that cannot read the evidence does not move money.",
    forfeitSettlement: "The bond was forfeited — an uncontested complaint the court rejected.",
  },
  vi: {
    exhibitA: "Chung cu A — ban goc",
    exhibitB: "Chung cu B — ban bi to sao chep",
    filedBy: "nop boi",
    contestedBy: "phan to boi",
    uncontested: "khong bi phan to",
    complainantBond: "Bond nguyen don",
    counterBond: "Counter-bond",
    atStake: "Tong tien cuoc",
    contestLabel: "Phan to — dat bond doi ung",
    stakeContest: "Dat cuoc va phan to",
    withdrawComplaint: "Rut don va lay lai bond",
    adjudicateFineprint: "Bat ky ai deu co the yeu cau toa xet xu. Moi validator se tai ca hai trang va suy luan, nen mat vai phut.",
    sendToCourt: "Gui len toa",
    appealFineprint: "Phien so tham khong quyet dinh duoc tu hai nguon. Phuc tham doc nguon thu ba — anh chup luu tru, lich su commit, trich dan co ngay — va chot tac pham nao cong bo truoc. Quyet dinh la chung tham.",
    corroboratingSource: "Nguon bo chung",
    appealFeeLabel: "Phi phuc tham (GEN)",
    appealButton: "Khang cao len phien chung tham",
    escalatedNotParty: "Da chuyen phuc tham. Chi nguyen don hoac bi don moi co the khang cao.",
    provenance: "Xuat xu",
    firstInstance: "Phien so tham",
    finalInstance: "Phien chung tham",
    traceableOverlap: "Trung lap co the truy vet",
    adjudicatorConfidence: "Do tin cay cua hoi dong",
    publishedFirst: "Cong bo truoc",
    refundSettlement: "Moi khoan cuoc da duoc tra lai. Toa khong doc duoc chung cu thi khong chuyen tien.",
    forfeitSettlement: "Bond bi tich thu — don kien khong bi phan to ma toa bac.",
  },
};

export function CaseView({
  entry,
  history,
  account,
  busy,
  onContest,
  onAdjudicate,
  onAppeal,
  onWithdrawCase,
}: Props) {
  const t = usePick(CONTENT);
  const [counterBond, setCounterBond] = useState(fromWei(entry.bond));
  const [corroborationUrl, setCorroborationUrl] = useState("");
  const [appealFee, setAppealFee] = useState("0.5");
  const [error, setError] = useState<string | null>(null);

  const isComplainant = sameAddress(account ?? undefined, entry.complainant);
  const isRespondent = sameAddress(account ?? undefined, entry.respondent);
  const isParty = isComplainant || isRespondent;
  const contested = !isZero(entry.respondent);

  const pot =
    BigInt(entry.bond || "0") + BigInt(entry.counter_bond || "0") + BigInt(entry.appeal_fee || "0");

  async function guard(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError((actionError as Error).message);
    }
  }

  return (
    <article className="panel case">
      <header className="case-header">
        <div>
          <span className="case-number">Case #{entry.case_id}</span>
          <h2>{entry.category}</h2>
        </div>
        <span className={`status status-${entry.status.toLowerCase()}`}>
          {STATUS_LABEL[entry.status]}
        </span>
      </header>

      <div className="exhibits">
        <div>
          <span className="exhibit-label">{t.exhibitA}</span>
          <a href={entry.origin_url} target="_blank" rel="noreferrer">
            {entry.origin_url}
          </a>
          <span className="party">{t.filedBy} {shortAddress(entry.complainant)}</span>
        </div>
        <div>
          <span className="exhibit-label">{t.exhibitB}</span>
          <a href={entry.accused_url} target="_blank" rel="noreferrer">
            {entry.accused_url}
          </a>
          <span className="party">
            {contested ? `${t.contestedBy} ${shortAddress(entry.respondent)}` : t.uncontested}
          </span>
        </div>
      </div>

      <blockquote className="claim">{entry.claim_text}</blockquote>

      <dl className="stakes">
        <div>
          <dt>{t.complainantBond}</dt>
          <dd>{fromWei(entry.bond)} GEN</dd>
        </div>
        <div>
          <dt>{t.counterBond}</dt>
          <dd>{contested ? `${fromWei(entry.counter_bond)} GEN` : "—"}</dd>
        </div>
        <div>
          <dt>{t.atStake}</dt>
          <dd>{fromWei(pot)} GEN</dd>
        </div>
      </dl>

      {entry.instance > 0 ? <Verdict entry={entry} t={t} /> : null}

      <section className="actions">
        {entry.status === "FILED" && account && !isComplainant ? (
          <div className="action">
            <label>
              {t.contestLabel}
              <input
                type="text"
                inputMode="decimal"
                value={counterBond}
                onChange={(event) => setCounterBond(event.target.value)}
                disabled={busy}
              />
            </label>
            <button
              disabled={busy}
              onClick={() => guard(() => onContest(entry.case_id, toWei(counterBond)))}
            >
              {t.stakeContest}
            </button>
          </div>
        ) : null}

        {entry.status === "FILED" && isComplainant ? (
          <button
            className="secondary"
            disabled={busy}
            onClick={() => guard(() => onWithdrawCase(entry.case_id))}
          >
            {t.withdrawComplaint}
          </button>
        ) : null}

        {(entry.status === "FILED" || entry.status === "CONTESTED") && account ? (
          <div className="action">
            <p className="fineprint">{t.adjudicateFineprint}</p>
            <button disabled={busy} onClick={() => guard(() => onAdjudicate(entry.case_id))}>
              {t.sendToCourt}
            </button>
          </div>
        ) : null}

        {entry.status === "ESCALATED" && isParty ? (
          <div className="action">
            <p className="fineprint">{t.appealFineprint}</p>
            <label>
              {t.corroboratingSource}
              <input
                type="url"
                placeholder="https://web.archive.org/…"
                value={corroborationUrl}
                onChange={(event) => setCorroborationUrl(event.target.value)}
                disabled={busy}
              />
            </label>
            <label>
              {t.appealFeeLabel}
              <input
                type="text"
                inputMode="decimal"
                value={appealFee}
                onChange={(event) => setAppealFee(event.target.value)}
                disabled={busy}
              />
            </label>
            <button
              disabled={busy || !corroborationUrl.trim()}
              onClick={() =>
                guard(() => onAppeal(entry.case_id, corroborationUrl.trim(), toWei(appealFee)))
              }
            >
              {t.appealButton}
            </button>
          </div>
        ) : null}

        {entry.status === "ESCALATED" && !isParty ? (
          <p className="fineprint">{t.escalatedNotParty}</p>
        ) : null}
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="provenance">
        <h3>{t.provenance}</h3>
        <ol>
          {history.map((record, index) => (
            <li key={index}>
              <span className="kind">{String(record.kind)}</span>
              <code>{JSON.stringify(record)}</code>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}

function Verdict({ entry, t }: { entry: Case; t: typeof CONTENT.en }) {
  const label = VERDICT_LABEL[entry.verdict] ?? entry.verdict;
  const unreadable = entry.verdict === "EVIDENCE_UNAVAILABLE";

  return (
    <section className={`verdict verdict-${entry.verdict.toLowerCase()}`}>
      <header>
        <h3>{label}</h3>
        <span>{entry.instance === 2 ? t.finalInstance : t.firstInstance}</span>
      </header>

      <p className="reason">{entry.reason}</p>

      {!unreadable ? (
        <dl className="findings">
          <div>
            <dt>{t.traceableOverlap}</dt>
            <dd>{entry.overlap_pct}%</dd>
          </div>
          <div>
            <dt>{t.adjudicatorConfidence}</dt>
            <dd>{entry.confidence}%</dd>
          </div>
          <div>
            <dt>{t.publishedFirst}</dt>
            <dd>{entry.first_publisher.toLowerCase()}</dd>
          </div>
        </dl>
      ) : null}

      {entry.status === "RESOLVED" ? (
        <p className="settlement">
          {isZero(entry.winner)
            ? entry.verdict === "EVIDENCE_UNAVAILABLE"
              ? t.refundSettlement
              : t.forfeitSettlement
            : `${fromWei(entry.payout)} GEN credited to ${shortAddress(entry.winner)}.`}
        </p>
      ) : null}
    </section>
  );
}
