import { useEffect, useMemo, useState } from "react";
import { ADDRESSES, explorerContract } from "../lib/chain";
import type { WriteProgress } from "../lib/chain";
import {
  getBadgeCatalog,
  getBadgeHolders,
  getBadges,
  mintBadgesRecent,
  type Badge,
} from "../lib/court";
import { usePick } from "../lib/i18n";
import { shortAddress } from "../lib/types";

interface Props {
  account: string | null;
}

/**
 * Phase 7 badges gallery. Reads the Achievements contract for badge holders
 * and the current viewer's badges. Anyone can trigger `mint_recent` — the
 * button is not gated, and the contract's own guard makes duplicate mints a
 * no-op. Non-admin viewers see the leaderboard read-only.
 */

const CONTENT = {
  en: {
    eyebrow: "Track record",
    heading: "Every settled case leaves a public mark.",
    lede:
      "Badges are minted from the court's own history — non-transferable, one per (account, kind). Anyone can sync new cases; the contract deduplicates. Nothing gates on a badge; they are a public record of the shape of an account's record, not a permission.",
    mine: "Your badges",
    holders: "Recent holders",
    noneMine: "No badges yet — the court has not yet settled a case involving your address.",
    noneAll: "The Achievements contract has not yet folded a case in.",
    syncButton: "Sync recent cases",
    syncing: "Syncing…",
    caseLabel: "case",
  },
  vi: {
    eyebrow: "Lich su hoat dong",
    heading: "Moi vu an da giai quyet deu de lai dau vet cong khai.",
    lede:
      "Huy chuong duoc mint tu lich su cua toa — khong the chuyen nhuong, moi (tai khoan, loai) chi mot lan. Ai cung co the dong bo vu moi; hop dong tu loc trung. Khong co gi bi khoa dua tren huy chuong; day la ho so cong khai ve hinh dang lich su cua tai khoan, khong phai quyen.",
    mine: "Huy chuong cua ban",
    holders: "Nguoi so huu gan day",
    noneMine: "Chua co huy chuong — toa chua giai quyet vu nao lien quan den dia chi cua ban.",
    noneAll: "Hop dong Achievements chua fold vu nao.",
    syncButton: "Dong bo vu moi",
    syncing: "Dang dong bo…",
    caseLabel: "vu",
  },
};

const BADGE_META: Record<string, { label: string; glyph: string; blurb: string }> = {
  FIRST_FILING: { label: "First filing", glyph: "F", blurb: "This account brought its first case." },
  FIRST_CONTEST: { label: "First contest", glyph: "C", blurb: "This account stood as respondent for the first time." },
  FIRST_WIN: { label: "First win", glyph: "W", blurb: "First case where the court awarded them the pot." },
  FIVE_WINS: { label: "Five wins", glyph: "5", blurb: "Five settled wins on the reputation ledger." },
  TEN_WINS: { label: "Ten wins", glyph: "10", blurb: "Ten settled wins — a real track record." },
  JUST_DEFENDER: { label: "Just defender", glyph: "D", blurb: "Defeated an unfounded complaint as respondent." },
  APPELLATE_WINNER: { label: "Appellate winner", glyph: "A", blurb: "Won at the final instance." },
  PRECEDENT_INVERTER: { label: "Precedent inverter", glyph: "P", blurb: "Appeal established their work came first." },
};

export function BadgesGallery({ account }: Props) {
  const t = usePick(CONTENT);
  const [catalog, setCatalog] = useState<string[]>([]);
  const [mine, setMine] = useState<Badge[]>([]);
  const [holders, setHolders] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useMemo(
    () => async () => {
      try {
        setCatalog(await getBadgeCatalog());
        setHolders((await getBadgeHolders()).slice(-20).reverse());
        if (account) setMine(await getBadges(account));
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [account],
  );

  useEffect(() => {
    if (!ADDRESSES.achievements) return;
    void refresh();
  }, [refresh]);

  async function onSync() {
    if (!account) return;
    setError(null);
    setBusy(true);
    try {
      await mintBadgesRecent(account, 25, (p: WriteProgress) =>
        setProgress(p.status),
      );
      setProgress(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!ADDRESSES.achievements) return null;

  return (
    <section id="badges" className="panel badges-gallery" aria-label="Achievements">
      <header className="badges-header">
        <div>
          <span className="section-eyebrow">{t.eyebrow}</span>
          <h2>{t.heading}</h2>
          <p className="lede">
            {t.lede}{" "}
            <a
              href={explorerContract(ADDRESSES.achievements)}
              target="_blank"
              rel="noreferrer"
            >
              Achievements
            </a>
            .
          </p>
        </div>
        {account ? (
          <button className="secondary" onClick={onSync} disabled={busy}>
            {busy ? (progress ?? t.syncing) : t.syncButton}
          </button>
        ) : null}
      </header>

      <div className="badges-two-col">
        <div>
          <h3>{t.mine}</h3>
          {mine.length === 0 ? (
            <p className="fineprint">{t.noneMine}</p>
          ) : (
            <ul className="badges-mine">
              {mine.map((b) => {
                const meta = BADGE_META[b.kind] ?? {
                  label: b.kind,
                  glyph: "?",
                  blurb: "",
                };
                return (
                  <li key={`${b.kind}-${b.case_id}`}>
                    <span className={`badge-glyph badge-${b.kind.toLowerCase()}`}>
                      {meta.glyph}
                    </span>
                    <div>
                      <strong>{meta.label}</strong>
                      <span className="fineprint">
                        {t.caseLabel} #{b.case_id} — {meta.blurb}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <h3>{t.holders}</h3>
          {holders.length === 0 ? (
            <p className="fineprint">{t.noneAll}</p>
          ) : (
            <ul className="badges-holders">
              {holders.map((addr) => (
                <li key={addr}>{shortAddress(addr)}</li>
              ))}
            </ul>
          )}
          {catalog.length > 0 ? (
            <p className="fineprint badges-catalog-hint">
              Catalog: {catalog.length} distinct kinds — from FIRST_FILING to
              PRECEDENT_INVERTER.
            </p>
          ) : null}
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
