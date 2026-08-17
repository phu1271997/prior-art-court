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

export function Standings({
  leaderboard,
  withdrawable,
  account,
  busy,
  onWithdraw,
  onSync,
}: Props) {
  const owed = BigInt(withdrawable || "0");

  return (
    <div className="panel standings">
      <h2>Standing</h2>

      {account ? (
        <div className="balance">
          <span className="balance-label">The court owes you</span>
          <span className="balance-value">{fromWei(owed)} GEN</span>
          <button disabled={busy || owed === 0n} onClick={onWithdraw}>
            Withdraw
          </button>
        </div>
      ) : null}

      <p className="lede">
        Derived from decided cases only. Nothing writes here — the record is pulled
        out of the court, so a settlement never waits on it.
      </p>

      {leaderboard.length === 0 ? (
        <p className="fineprint">No decided cases have been folded in yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Party</th>
              <th>W</th>
              <th>L</th>
              <th>Forfeit</th>
              <th>Standing</th>
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
          Fold in newly decided cases
        </button>
      ) : null}
    </div>
  );
}
