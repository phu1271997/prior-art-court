import { usePick } from "../lib/i18n";
import type { Standing } from "../lib/types";
import { fromWei, sameAddress, shortAddress } from "../lib/types";

interface Props {
  leaderboard: Standing[];
  withdrawable: string;
  account: string | null;
  busy: boolean;
  onWithdraw: () => Promise<void>;
  onSync: () => Promise<void>;
}

const CONTENT = {
  en: {
    title: "Standing",
    balanceLabel: "The court owes you",
    withdraw: "Withdraw",
    lede: "Derived from decided cases only. Nothing writes here — the record is pulled out of the court, so a settlement never waits on it.",
    empty: "No decided cases have been folded in yet.",
    colParty: "Party",
    colW: "W",
    colL: "L",
    colForfeit: "Forfeit",
    colStanding: "Standing",
    sync: "Fold in newly decided cases",
  },
  vi: {
    title: "Uy tin",
    balanceLabel: "Toa no ban",
    withdraw: "Rut tien",
    lede: "Suy ra tu cac vu da phan quyet. Khong gi ghi vao day — ban ghi duoc keo tu toa, nen phien chot khong bao gio phai cho.",
    empty: "Chua co vu nao duoc cap nhat.",
    colParty: "Ben",
    colW: "T",
    colL: "B",
    colForfeit: "Mat cuoc",
    colStanding: "Uy tin",
    sync: "Cap nhat cac vu moi chot",
  },
};

export function Standings({
  leaderboard,
  withdrawable,
  account,
  busy,
  onWithdraw,
  onSync,
}: Props) {
  const t = usePick(CONTENT);
  const owed = BigInt(withdrawable || "0");

  return (
    <div className="panel standings">
      <h2>{t.title}</h2>

      {account ? (
        <div className="balance">
          <span className="balance-label">{t.balanceLabel}</span>
          <span className="balance-value">{fromWei(owed)} GEN</span>
          <button disabled={busy || owed === 0n} onClick={onWithdraw}>
            {t.withdraw}
          </button>
        </div>
      ) : null}

      <p className="lede">{t.lede}</p>

      {leaderboard.length === 0 ? (
        <p className="fineprint">{t.empty}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t.colParty}</th>
              <th>{t.colW}</th>
              <th>{t.colL}</th>
              <th>{t.colForfeit}</th>
              <th>{t.colStanding}</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row) => (
              <tr key={row.address} className={sameAddress(row.address, account ?? "") ? "you" : ""}>
                <td>{shortAddress(row.address)}</td>
                <td>{row.won}</td>
                <td>{row.lost}</td>
                <td>{row.forfeited}</td>
                <td className="standing-value">{row.standing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {account ? (
        <button className="secondary" disabled={busy} onClick={onSync}>
          {t.sync}
        </button>
      ) : null}
    </div>
  );
}
