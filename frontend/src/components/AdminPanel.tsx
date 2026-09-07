import { useEffect, useState } from "react";
import {
  getFilingStandingFloor,
  registerPolicy,
  setFilingStandingFloor,
  sweepForfeited,
} from "../lib/court";
import type { WriteProgress } from "../lib/chain";
import { ADDRESSES } from "../lib/chain";

interface Props {
  account: string | null;
  isAdmin: boolean;
  onDone: (label: string) => void;
}

/**
 * Phase 7 admin panel. Everything here is a call that either the court or the
 * policy registry ADMIT to admin-only; the panel is invisible for the wrong
 * caller, but nothing about it is trusted client-side — the contracts refuse
 * a non-admin transaction on their own. The panel exists so the admin does not
 * need Studio open in another tab to keep the doctrine and the treasury moving.
 */
export function AdminPanel({ account, isAdmin, onDone }: Props) {
  const [category, setCategory] = useState("");
  const [doctrine, setDoctrine] = useState("");
  const [floor, setFloor] = useState<string>("100");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin || !ADDRESSES.court) return;
    getFilingStandingFloor()
      .then((n) => setFloor(String(n)))
      .catch(() => undefined);
  }, [isAdmin]);

  if (!isAdmin) return null;

  const onProgress = (p: WriteProgress) => {
    setStatus(`${p.status}${p.hash ? ` — ${p.hash.slice(0, 10)}…` : ""}`);
  };

  async function guard(label: string, fn: () => Promise<unknown>) {
    if (!account) return;
    setError(null);
    setBusy(true);
    setStatus(`${label}: submitting`);
    try {
      await fn();
      setStatus(`${label}: accepted`);
      onDone(label);
    } catch (e) {
      setError((e as Error).message);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="admin" className="panel admin-panel" aria-label="Court admin panel">
      <header className="admin-panel-header">
        <h2>Admin panel</h2>
        <p className="fineprint">
          Visible because the connected account matches the deploying admin on
          <code> PolicyRegistry </code>and<code> PriorArtCourt</code>. Every
          action here is a signed transaction the contract itself will refuse
          for anyone else.
        </p>
      </header>

      <div className="admin-panel-grid">
        <div className="admin-card">
          <h3>Register or amend a doctrine</h3>
          <p className="fineprint">
            Category is a slug (e.g. <code>patent-claim</code>). Doctrine text
            must be at least 120 characters or the registry refuses it.
          </p>
          <label>
            Category
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={busy}
              placeholder="patent-claim"
            />
          </label>
          <label>
            Doctrine
            <textarea
              value={doctrine}
              onChange={(e) => setDoctrine(e.target.value)}
              disabled={busy}
              rows={6}
              placeholder="This category covers..."
            />
          </label>
          <button
            disabled={busy || !category.trim() || doctrine.trim().length < 120}
            onClick={() =>
              guard("register_policy", () =>
                registerPolicy(account!, category.trim(), doctrine.trim(), onProgress),
              )
            }
          >
            Register / amend
          </button>
        </div>

        <div className="admin-card">
          <h3>Sweep the forfeited pool</h3>
          <p className="fineprint">
            Moves forfeited bonds to the admin's withdrawable balance. The
            transfer itself still happens through <code>withdraw()</code>.
          </p>
          <button
            disabled={busy}
            onClick={() =>
              guard("sweep_forfeited", () => sweepForfeited(account!, onProgress))
            }
          >
            Sweep
          </button>
        </div>

        <div className="admin-card">
          <h3>Filing standing floor</h3>
          <p className="fineprint">
            Filers whose reputation dips below this value must post at least
            1 GEN on any new complaint. Set to 0 to disable the gate.
          </p>
          <label>
            Floor (0 – 1000)
            <input
              type="number"
              min={0}
              max={1000}
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              disabled={busy}
            />
          </label>
          <button
            disabled={busy || !floor}
            onClick={() =>
              guard("set_filing_standing_floor", () =>
                setFilingStandingFloor(account!, Number(floor), onProgress),
              )
            }
          >
            Update floor
          </button>
        </div>
      </div>

      {status ? <p className="admin-status">{status}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
