import { useCallback, useEffect, useState } from "react";
import * as court from "../lib/court";
import { usePick } from "../lib/i18n";
import { shortAddress } from "../lib/types";
import type { Policy, Registration } from "../lib/types";

interface Props {
  policies: Policy[];
  account: string | null;
  busy: boolean;
  onRegister: (input: { category: string; url: string; contentHash: string; title: string }) => Promise<void>;
  reloadKey: number;
}

const CONTENT = {
  en: {
    eyebrow: "Establish prior art",
    heading: "Prior-art registry",
    lede: "Register a work to place a dated, on-chain marker that it existed by now. When a later dispute turns on which work came first, the court reads this registry and treats an earlier record as strong evidence of precedence. Each URL can be claimed once, and the consensus clock sets the time, so a record cannot be back-dated.",
    category: "Kind of work",
    url: "URL of the work",
    title: "Title",
    fingerprint: "Optional: paste the work's text to fingerprint it (SHA-256)",
    hashed: "Fingerprint",
    register: "Register this work",
    connectFirst: "Connect a wallet to register a work.",
    empty: "No works registered yet. Be the first to stake a dated claim.",
    registeredAt: "registered",
    by: "by",
    colWork: "Work",
    colWhen: "Registered",
    colBy: "Author",
  },
  vi: {
    eyebrow: "Xac lap prior art",
    heading: "So dang ky prior art",
    lede: "Dang ky mot tac pham de dat moc co ngay thang, on-chain, chung minh no ton tai tu bay gio. Khi tranh chap sau nay can biet tac pham nao co truoc, toa doc so nay va coi ban ghi som hon la bang chung manh ve thu tu cong bo. Moi URL chi dang ky duoc mot lan, va dong ho dong thuan dat thoi gian, nen ban ghi khong the bi lui ngay.",
    category: "Loai tac pham",
    url: "URL tac pham",
    title: "Tieu de",
    fingerprint: "Tuy chon: dan noi dung tac pham de lay dau van tay (SHA-256)",
    hashed: "Dau van tay",
    register: "Dang ky tac pham",
    connectFirst: "Ket noi vi de dang ky.",
    empty: "Chua co tac pham nao. Hay la nguoi dau tien dat moc co ngay.",
    registeredAt: "dang ky",
    by: "boi",
    colWork: "Tac pham",
    colWhen: "Ngay dang ky",
    colBy: "Tac gia",
  },
};

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function Registry({ policies, account, busy, onRegister, reloadKey }: Props) {
  const t = usePick(CONTENT);
  const [rows, setRows] = useState<Registration[]>([]);
  const [category, setCategory] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [work, setWork] = useState("");
  const [hash, setHash] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    court
      .getRegistrations(0)
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  useEffect(() => {
    if (!category && policies.length > 0) setCategory(policies[0].category);
  }, [policies, category]);

  // Fingerprint the pasted work locally; never sent anywhere but the registry.
  useEffect(() => {
    let cancelled = false;
    if (!work.trim()) {
      setHash("");
      return;
    }
    sha256Hex(work).then((h) => {
      if (!cancelled) setHash(h);
    });
    return () => {
      cancelled = true;
    };
  }, [work]);

  async function submit() {
    setError(null);
    try {
      await onRegister({ category, url: url.trim(), contentHash: hash, title: title.trim() });
      setUrl("");
      setTitle("");
      setWork("");
      setHash("");
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section id="registry" className="marketing-section registry-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">{t.eyebrow}</span>
          <h2>{t.heading}</h2>
          <p className="lede">{t.lede}</p>
        </header>

        <div className="registry-grid">
          <div className="panel registry-form">
            {account ? (
              <>
                <label>
                  {t.category}
                  <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={busy}>
                    {policies.map((p) => (
                      <option key={p.category} value={p.category}>
                        {p.category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t.url}
                  <input
                    type="url"
                    placeholder="https://…"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={busy}
                  />
                </label>
                <label>
                  {t.title}
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
                </label>
                <label>
                  {t.fingerprint}
                  <textarea rows={3} value={work} onChange={(e) => setWork(e.target.value)} disabled={busy} />
                </label>
                {hash ? (
                  <p className="registry-hash">
                    <span className="digest-label">{t.hashed}</span>
                    <code>{hash.slice(0, 32)}…</code>
                  </p>
                ) : null}
                <button disabled={busy || !url.trim() || !title.trim()} onClick={submit}>
                  {t.register}
                </button>
                {error ? <p className="error">{error}</p> : null}
              </>
            ) : (
              <p className="lede">{t.connectFirst}</p>
            )}
          </div>

          <div className="registry-list">
            {rows.length === 0 ? (
              <p className="lede">{t.empty}</p>
            ) : (
              <ol>
                {rows.map((r) => (
                  <li key={r.registration_id} className="registry-card">
                    <div className="registry-card-head">
                      <span className="case-number">#{r.registration_id}</span>
                      <span className="registry-title">{r.title || r.url}</span>
                      <span className="verdict-chip">{r.category}</span>
                    </div>
                    <a href={r.url} target="_blank" rel="noreferrer" className="registry-url">
                      {r.url}
                    </a>
                    <div className="registry-meta">
                      <span>
                        {t.registeredAt} {formatWhen(r.registered_at)}
                      </span>
                      <span>
                        {t.by} {shortAddress(r.author)}
                      </span>
                      {r.content_hash ? <span className="registry-fp">sha256:{r.content_hash.slice(0, 12)}…</span> : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}
