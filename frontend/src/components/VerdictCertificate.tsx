import { useState } from "react";
import { ADDRESSES, CHAIN_NAME } from "../lib/chain";
import { buildCertificate, downloadCertificate } from "../lib/certificate";
import { usePick } from "../lib/i18n";
import type { Case } from "../lib/types";

const CONTENT = {
  en: {
    title: "Verifiable verdict certificate",
    lede: "A portable record of this decision. It names its source and carries a SHA-256 digest over the decision fields — re-read the case from the contract and the digest reproduces, or the record was altered.",
    download: "Download certificate (JSON)",
    building: "Sealing…",
    digest: "Digest",
    copy: "Copy digest",
    copied: "Copied!",
  },
  vi: {
    title: "Giay chung nhan phan quyet co the kiem chung",
    lede: "Ban ghi di dong cua phan quyet nay. No neu ro nguon va mang ma bam SHA-256 tren cac truong quyet dinh — doc lai vu tu hop dong thi ma bam tai lap, neu khong ban ghi da bi sua.",
    download: "Tai giay chung nhan (JSON)",
    building: "Dang niem phong…",
    digest: "Ma bam",
    copy: "Sao chep ma bam",
    copied: "Da sao chep!",
  },
};

export function VerdictCertificate({ entry }: { entry: Case }) {
  const t = usePick(CONTENT);
  const [digest, setDigest] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function issue() {
    setBusy(true);
    try {
      const cert = await buildCertificate(entry, CHAIN_NAME, ADDRESSES.court);
      setDigest(cert.digest.value);
      downloadCertificate(cert);
    } finally {
      setBusy(false);
    }
  }

  function copyDigest() {
    if (!digest) return;
    navigator.clipboard
      .writeText(digest)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  }

  return (
    <section className="certificate">
      <h4>{t.title}</h4>
      <p className="fineprint">{t.lede}</p>
      <div className="certificate-actions">
        <button disabled={busy} onClick={issue}>
          {busy ? t.building : t.download}
        </button>
        {digest ? (
          <button className="secondary" onClick={copyDigest}>
            {copied ? t.copied : t.copy}
          </button>
        ) : null}
      </div>
      {digest ? (
        <p className="certificate-digest">
          <span className="digest-label">{t.digest}</span>
          <code>{digest}</code>
        </p>
      ) : null}
    </section>
  );
}
