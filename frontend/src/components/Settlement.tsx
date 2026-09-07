import { useState } from "react";
import { usePick } from "../lib/i18n";
import { fromWei, isZero, sameAddress, shortAddress } from "../lib/types";
import type { Case } from "../lib/types";

interface Props {
  entry: Case;
  account: string | null;
  busy: boolean;
  onPropose: (caseId: number, complainantShare: number) => Promise<void>;
  onAccept: (caseId: number) => Promise<void>;
  onReject: (caseId: number) => Promise<void>;
  onMediate: (caseId: number) => Promise<void>;
}

const CONTENT = {
  en: {
    title: "Settle before trial",
    lede: "Both sides have staked. You can split the pot by agreement now — a certain outcome, and no hearing to pay for — or let the court decide.",
    pot: "Pot",
    mediateTitle: "Ask the court's AI mediator",
    mediateLede: "The mediator reads both works and proposes a fair split. Its number is advisory — nothing moves until you both agree.",
    mediateButton: "Request AI mediation",
    mediateBusy: "The mediator is reading both works…",
    recommendation: "Mediator's recommendation",
    recommends: "recommends the complainant receive",
    useThis: "Propose this split",
    proposeTitle: "Propose a split",
    shareLabel: "Complainant receives (%)",
    respondentGets: "Respondent receives",
    proposeButton: "Propose settlement",
    standing: "Offer on the table",
    proposedBy: "proposed by",
    complainantGets: "complainant",
    respondentGetsShort: "respondent",
    accept: "Accept and settle",
    reject: "Reject offer",
    waiting: "Waiting for the other party to accept.",
    youProposed: "You proposed this. You can withdraw it, or wait for the other party.",
  },
  vi: {
    title: "Hoa giai truoc khi xet xu",
    lede: "Ca hai ben da dat cuoc. Cac ben co the tu chia tien cuoc theo thoa thuan — ket qua chac chan, khong ton phien xu — hoac de toa quyet.",
    pot: "Tong cuoc",
    mediateTitle: "Nho hoi dong AI hoa giai",
    mediateLede: "Hoa giai vien doc ca hai tac pham va de xuat ty le chia. Con so chi mang tinh tham khao — khong gi chuyen cho den khi ca hai dong y.",
    mediateButton: "Yeu cau AI hoa giai",
    mediateBusy: "Hoa giai vien dang doc ca hai tac pham…",
    recommendation: "De xuat cua hoa giai vien",
    recommends: "de xuat nguyen don nhan",
    useThis: "De xuat ty le nay",
    proposeTitle: "De xuat ty le chia",
    shareLabel: "Nguyen don nhan (%)",
    respondentGets: "Bi don nhan",
    proposeButton: "De xuat hoa giai",
    standing: "De xuat dang cho",
    proposedBy: "de xuat boi",
    complainantGets: "nguyen don",
    respondentGetsShort: "bi don",
    accept: "Chap nhan va chot",
    reject: "Tu choi de xuat",
    waiting: "Dang cho ben kia chap nhan.",
    youProposed: "Ban da de xuat. Ban co the rut lai, hoac cho ben kia.",
  },
};

export function Settlement({ entry, account, busy, onPropose, onAccept, onReject, onMediate }: Props) {
  const t = usePick(CONTENT);
  const isParty = sameAddress(account ?? undefined, entry.complainant) ||
    sameAddress(account ?? undefined, entry.respondent);
  const [share, setShare] = useState(50);
  const [error, setError] = useState<string | null>(null);

  // Only a contested case that has not yet been heard is in the settlement window.
  if (entry.status !== "CONTESTED" || entry.instance > 0) return null;

  const pot = BigInt(entry.bond || "0") + BigInt(entry.counter_bond || "0");
  const hasProposal = !isZero(entry.settlement_proposer);
  const isProposer = sameAddress(account ?? undefined, entry.settlement_proposer);
  const mediated = entry.mediation_share !== 255 && entry.mediation_share <= 100;

  async function guard(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const cut = (pct: number) => fromWei((pot * BigInt(pct)) / 100n);

  return (
    <section className="settlement-panel">
      <header>
        <h3>{t.title}</h3>
        <span className="settlement-pot">
          {t.pot}: {fromWei(pot)} GEN
        </span>
      </header>
      <p className="fineprint">{t.lede}</p>

      {mediated ? (
        <div className="mediation-card">
          <h4>{t.recommendation}</h4>
          <p className="mediation-headline">
            {t.recommends} <strong>{entry.mediation_share}%</strong> ({cut(entry.mediation_share)} GEN)
          </p>
          {entry.mediation_reason ? <p className="mediation-reason">{entry.mediation_reason}</p> : null}
          {isParty ? (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => guard(() => onPropose(entry.case_id, entry.mediation_share))}
            >
              {t.useThis}
            </button>
          ) : null}
        </div>
      ) : isParty ? (
        <div className="action">
          <p className="fineprint">
            <strong>{t.mediateTitle}.</strong> {t.mediateLede}
          </p>
          <button disabled={busy} onClick={() => guard(() => onMediate(entry.case_id))}>
            {t.mediateButton}
          </button>
        </div>
      ) : null}

      {hasProposal ? (
        <div className="settlement-offer">
          <h4>{t.standing}</h4>
          <p className="offer-split">
            {t.complainantGets} <strong>{entry.settlement_share}%</strong> ({cut(entry.settlement_share)} GEN)
            {" · "}
            {t.respondentGetsShort} <strong>{100 - entry.settlement_share}%</strong> (
            {cut(100 - entry.settlement_share)} GEN)
          </p>
          <p className="fineprint">
            {t.proposedBy} {shortAddress(entry.settlement_proposer)}
          </p>
          {isParty && !isProposer ? (
            <div className="offer-actions">
              <button disabled={busy} onClick={() => guard(() => onAccept(entry.case_id))}>
                {t.accept}
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => guard(() => onReject(entry.case_id))}
              >
                {t.reject}
              </button>
            </div>
          ) : isProposer ? (
            <div className="offer-actions">
              <p className="fineprint">{t.youProposed}</p>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => guard(() => onReject(entry.case_id))}
              >
                {t.reject}
              </button>
            </div>
          ) : (
            <p className="fineprint">{t.waiting}</p>
          )}
        </div>
      ) : null}

      {isParty ? (
        <div className="action propose-form">
          <h4>{t.proposeTitle}</h4>
          <label>
            {t.shareLabel}
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={share}
              onChange={(e) => setShare(Number(e.target.value))}
              disabled={busy}
            />
          </label>
          <p className="propose-preview">
            {t.complainantGets} <strong>{share}%</strong> ({cut(share)} GEN) · {t.respondentGets}{" "}
            <strong>{100 - share}%</strong> ({cut(100 - share)} GEN)
          </p>
          <button disabled={busy} onClick={() => guard(() => onPropose(entry.case_id, share))}>
            {t.proposeButton}
          </button>
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
