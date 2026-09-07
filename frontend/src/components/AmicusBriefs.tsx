import { useCallback, useEffect, useMemo, useState } from "react";
import type { WriteProgress } from "../lib/chain";
import {
  type AmicusBrief,
  getAmicusBriefs,
  submitAmicus,
} from "../lib/court";
import { usePick } from "../lib/i18n";
import { fromWei, sameAddress, shortAddress, toWei } from "../lib/types";

interface Props {
  caseId: number;
  status: string;
  complainant: string;
  respondent: string;
  account: string | null;
  disabled: boolean;
}

const CONTENT = {
  en: {
    eyebrow: "Amicus briefs",
    lede:
      "Any non-party may stake evidence into an open case. Winning-side briefs recover their stake plus a share of the losing side's forfeits at settlement; NEUTRAL briefs are always refunded.",
    emptyLede:
      "No amicus briefs have been staked on this case yet.",
    urlLabel: "URL of the third-party evidence",
    noteLabel: "Note (optional, ≤400 chars) — brief context for the adjudicator",
    stanceLabel: "Stance",
    stakeLabel: "Stake (GEN, min 0.1)",
    submitButton: "Stake this brief",
    submitFineprint:
      "You cannot submit a brief on a case you are a party to. Stake must be at least 0.1 GEN.",
    stanceSC: "Supporting complainant",
    stanceSR: "Supporting respondent",
    stanceN: "Neutral (evidence only)",
    tableSubmitter: "Submitter",
    tableStance: "Stance",
    tableStake: "Stake",
    tableRefunded: "Refunded",
    tableSource: "Source",
    yes: "yes",
    no: "no",
    briefsClosed:
      "The evidence bundle is now closed. New amicus briefs are refused once the case has been adjudicated.",
  },
  vi: {
    eyebrow: "Am kien am cu",
    lede:
      "Bat ky ai khong phai ben trong vu kien deu co the dat cuoc bang chung vao vu dang mo. Am kien ung ho ben thang duoc hoan cuoc va chia them tu phan cuoc bi tich thu; am kien trung lap luon duoc hoan cuoc.",
    emptyLede: "Chua co am kien nao duoc dat cuoc.",
    urlLabel: "URL bang chung tu ben thu ba",
    noteLabel: "Ghi chu (khong bat buoc, ≤400 ky tu) — ngu canh ngan gon cho hoi dong",
    stanceLabel: "Lap truong",
    stakeLabel: "Cuoc (GEN, toi thieu 0.1)",
    submitButton: "Dat cuoc am kien",
    submitFineprint:
      "Ban khong the dat am kien tren vu ma ban la mot ben. Cuoc toi thieu 0.1 GEN.",
    stanceSC: "Ung ho nguyen don",
    stanceSR: "Ung ho bi don",
    stanceN: "Trung lap (chi bang chung)",
    tableSubmitter: "Nguoi dat",
    tableStance: "Lap truong",
    tableStake: "Cuoc",
    tableRefunded: "Da hoan",
    tableSource: "Nguon",
    yes: "co",
    no: "khong",
    briefsClosed: "Bang chung da khoa. Am kien moi bi tu choi sau khi vu duoc xet xu.",
  },
};

const STANCE_CLASS: Record<AmicusBrief["stance"], string> = {
  SUPPORTING_COMPLAINANT: "stance-complainant",
  SUPPORTING_RESPONDENT: "stance-respondent",
  NEUTRAL: "stance-neutral",
};

export function AmicusBriefs({
  caseId,
  status,
  complainant,
  respondent,
  account,
  disabled,
}: Props) {
  const t = usePick(CONTENT);
  const [briefs, setBriefs] = useState<AmicusBrief[]>([]);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [stance, setStance] =
    useState<AmicusBrief["stance"]>("SUPPORTING_COMPLAINANT");
  const [stake, setStake] = useState("0.1");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setBriefs(await getAmicusBriefs(caseId));
    } catch {
      /* leave whatever we last had */
    }
  }, [caseId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isParty = useMemo(
    () =>
      sameAddress(account ?? undefined, complainant) ||
      sameAddress(account ?? undefined, respondent),
    [account, complainant, respondent],
  );

  const stanceLabels: Record<AmicusBrief["stance"], string> = {
    SUPPORTING_COMPLAINANT: t.stanceSC,
    SUPPORTING_RESPONDENT: t.stanceSR,
    NEUTRAL: t.stanceN,
  };

  const isOpen = status === "FILED" || status === "CONTESTED";

  async function submit() {
    if (!account) return;
    setError(null);
    setBusy(true);
    setProgress(null);
    try {
      await submitAmicus(
        account,
        caseId,
        url.trim(),
        note.trim(),
        stance,
        toWei(stake),
        (p: WriteProgress) => setProgress(p.status),
      );
      setUrl("");
      setNote("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <section className="amicus" aria-label={t.eyebrow}>
      <header className="amicus-header">
        <h4>{t.eyebrow}</h4>
        <p className="fineprint">{t.lede}</p>
      </header>

      {briefs.length === 0 ? (
        <p className="fineprint">{t.emptyLede}</p>
      ) : (
        <table className="amicus-table">
          <thead>
            <tr>
              <th>{t.tableSubmitter}</th>
              <th>{t.tableStance}</th>
              <th>{t.tableStake}</th>
              <th>{t.tableSource}</th>
              <th>{t.tableRefunded}</th>
            </tr>
          </thead>
          <tbody>
            {briefs.map((brief) => (
              <tr key={brief.index}>
                <td className="mono">{shortAddress(brief.submitter)}</td>
                <td>
                  <span className={`amicus-stance ${STANCE_CLASS[brief.stance]}`}>
                    {stanceLabels[brief.stance]}
                  </span>
                </td>
                <td className="mono">{fromWei(brief.stake)} GEN</td>
                <td>
                  <a href={brief.url} target="_blank" rel="noreferrer">
                    {brief.url.length > 40
                      ? `${brief.url.slice(0, 40)}…`
                      : brief.url}
                  </a>
                </td>
                <td>{brief.refunded ? t.yes : t.no}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isOpen && account && !isParty ? (
        <div className="amicus-form">
          <label>
            {t.urlLabel}
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy || disabled}
              placeholder="https://web.archive.org/…"
            />
          </label>
          <label>
            {t.noteLabel}
            <textarea
              value={note}
              maxLength={400}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy || disabled}
              rows={2}
            />
          </label>
          <div className="amicus-form-row">
            <label>
              {t.stanceLabel}
              <select
                value={stance}
                onChange={(e) =>
                  setStance(e.target.value as AmicusBrief["stance"])
                }
                disabled={busy || disabled}
              >
                <option value="SUPPORTING_COMPLAINANT">{t.stanceSC}</option>
                <option value="SUPPORTING_RESPONDENT">{t.stanceSR}</option>
                <option value="NEUTRAL">{t.stanceN}</option>
              </select>
            </label>
            <label>
              {t.stakeLabel}
              <input
                type="text"
                inputMode="decimal"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                disabled={busy || disabled}
              />
            </label>
          </div>
          <button
            disabled={busy || disabled || !url.trim()}
            onClick={() => void submit()}
          >
            {busy ? (progress ?? "…") : t.submitButton}
          </button>
          <p className="fineprint">{t.submitFineprint}</p>
        </div>
      ) : null}

      {!isOpen && briefs.length > 0 ? (
        <p className="fineprint amicus-closed">{t.briefsClosed}</p>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
