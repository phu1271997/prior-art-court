import { useState } from "react";
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
          <span className="exhibit-label">Exhibit A — claimed original</span>
          <a href={entry.origin_url} target="_blank" rel="noreferrer">
            {entry.origin_url}
          </a>
          <span className="party">filed by {shortAddress(entry.complainant)}</span>
        </div>
        <div>
          <span className="exhibit-label">Exhibit B — alleged copy</span>
          <a href={entry.accused_url} target="_blank" rel="noreferrer">
            {entry.accused_url}
          </a>
          <span className="party">
            {contested ? `contested by ${shortAddress(entry.respondent)}` : "uncontested"}
          </span>
        </div>
      </div>

      <blockquote className="claim">{entry.claim_text}</blockquote>

      <dl className="stakes">
        <div>
          <dt>Complainant's bond</dt>
          <dd>{fromWei(entry.bond)} GEN</dd>
        </div>
        <div>
          <dt>Counter-bond</dt>
          <dd>{contested ? `${fromWei(entry.counter_bond)} GEN` : "—"}</dd>
        </div>
        <div>
          <dt>At stake</dt>
          <dd>{fromWei(pot)} GEN</dd>
        </div>
      </dl>

      {entry.instance > 0 ? <Verdict entry={entry} /> : null}

      <section className="actions">
        {entry.status === "FILED" && account && !isComplainant ? (
          <div className="action">
            <label>
              Contest — match the bond
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
              Stake and contest
            </button>
          </div>
        ) : null}

        {entry.status === "FILED" && isComplainant ? (
          <button
            className="secondary"
            disabled={busy}
            onClick={() => guard(() => onWithdrawCase(entry.case_id))}
          >
            Withdraw the complaint and take the bond back
          </button>
        ) : null}

        {(entry.status === "FILED" || entry.status === "CONTESTED") && account ? (
          <div className="action">
            <p className="fineprint">
              Anyone may ask the court to hear a case. Every validator will fetch
              both pages and reason about them, so this takes a minute or two.
            </p>
            <button disabled={busy} onClick={() => guard(() => onAdjudicate(entry.case_id))}>
              Send to the court
            </button>
          </div>
        ) : null}

        {entry.status === "ESCALATED" && isParty ? (
          <div className="action">
            <p className="fineprint">
              The first instance would not decide this on two sources. An appeal
              reads a third — an archive snapshot, a commit history, a dated
              citation — and settles which work came first. Its decision is final.
            </p>
            <label>
              Corroborating source
              <input
                type="url"
                placeholder="https://web.archive.org/…"
                value={corroborationUrl}
                onChange={(event) => setCorroborationUrl(event.target.value)}
                disabled={busy}
              />
            </label>
            <label>
              Appeal fee (GEN)
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
              Appeal to the final instance
            </button>
          </div>
        ) : null}

        {entry.status === "ESCALATED" && !isParty ? (
          <p className="fineprint">
            Escalated. Only the complainant or the respondent may appeal it.
          </p>
        ) : null}
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="provenance">
        <h3>Provenance</h3>
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

function Verdict({ entry }: { entry: Case }) {
  const label = VERDICT_LABEL[entry.verdict] ?? entry.verdict;
  const unreadable = entry.verdict === "EVIDENCE_UNAVAILABLE";

  return (
    <section className={`verdict verdict-${entry.verdict.toLowerCase()}`}>
      <header>
        <h3>{label}</h3>
        <span>{entry.instance === 2 ? "Final instance" : "First instance"}</span>
      </header>

      {/*
        The reasoning is the product here, not a footnote. A verdict with no stated
        reason is exactly the black-box moderation decision this court exists to
        replace, so it is given the most room on the card.
      */}
      <p className="reason">{entry.reason}</p>

      {!unreadable ? (
        <dl className="findings">
          <div>
            <dt>Traceable overlap</dt>
            <dd>{entry.overlap_pct}%</dd>
          </div>
          <div>
            <dt>Adjudicator confidence</dt>
            <dd>{entry.confidence}%</dd>
          </div>
          <div>
            <dt>Published first</dt>
            <dd>{entry.first_publisher.toLowerCase()}</dd>
          </div>
        </dl>
      ) : null}

      {entry.status === "RESOLVED" ? (
        <p className="settlement">
          {isZero(entry.winner)
            ? entry.verdict === "EVIDENCE_UNAVAILABLE"
              ? "Every stake was returned. A court that cannot read the evidence does not move money."
              : "The bond was forfeited — an uncontested complaint the court rejected."
            : `${fromWei(entry.payout)} GEN credited to ${shortAddress(entry.winner)}.`}
        </p>
      ) : null}
    </section>
  );
}
