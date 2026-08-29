import { useState } from "react";
import { usePick } from "../lib/i18n";
import type { Policy } from "../lib/types";
import { toWei } from "../lib/types";

interface Props {
  policies: Policy[];
  disabled: boolean;
  onSubmit: (input: {
    category: string;
    originUrl: string;
    accusedUrl: string;
    claim: string;
    bond: bigint;
  }) => Promise<void>;
}

const CONTENT = {
  en: {
    title: "File a complaint",
    lede: "Two URLs and a bond. The court fetches both pages itself and decides whether one copied the other.",
    emptyTitle: "File a complaint",
    emptyLede: "No doctrine has been published yet, so the court has no jurisdiction over anything.",
    emptyFineprint: "The registry's admin registers a standard per kind of work with",
    emptyFineprint2: ". Until at least one is published, every complaint is refused at filing.",
    labelKind: "Kind of work",
    labelOriginal: "The original",
    labelAccused: "The work you say copied it",
    labelClaim: "What was taken",
    labelBond: "Bond (GEN)",
    placeholderClaim: "Say what was copied and why it is not fair reuse. The adjudicator reads this.",
    doctrinePrefix: "The standard this category is judged against (revision ",
    fineprint: "You get the bond back if the court agrees with you. If nobody contests and the court rejects the complaint, the bond is forfeited — that is what keeps the docket honest.",
    submit: "Stake the bond and file",
    errUrlRequired: "URL is required.",
    errUrlShort: "URL is too short to be reachable.",
    errUrlScheme: "The court fetches from the open web only. URL must start with http:// or https://.",
    errSameUrl: "The two URLs point at the same page. Nothing to adjudicate.",
    errClaimShort: "Claim needs at least 20 characters describing what was taken.",
    errOriginalPrefix: "Original: ",
    errAccusedPrefix: "Accused: ",
  },
  vi: {
    title: "Nop don kien",
    lede: "Hai URL va mot khoan bond. Toa tu tai ca hai trang va quyet dinh trang nao sao chep trang nao.",
    emptyTitle: "Nop don kien",
    emptyLede: "Chua co an le nao duoc cong bo, nen toa khong co tham quyen xet xu bat ky dieu gi.",
    emptyFineprint: "Admin cua registry dang ky tieu chuan cho tung loai tac pham bang",
    emptyFineprint2: ". Cho den khi co it nhat mot tieu chuan, moi don kien deu bi tu choi.",
    labelKind: "Loai tac pham",
    labelOriginal: "Ban goc",
    labelAccused: "Tac pham bi to sao chep",
    labelClaim: "Noi dung bi sao chep",
    labelBond: "Bond (GEN)",
    placeholderClaim: "Mo ta noi dung bi sao chep va tai sao khong phai tai su dung hop ly. Hoi dong xet xu doc noi dung nay.",
    doctrinePrefix: "Tieu chuan xet xu cho loai nay (phien ban ",
    fineprint: "Ban duoc nhan lai bond neu toa dong y voi ban. Neu khong ai phan to va toa bac don, bond bi tich thu — do la dieu giu cho so ghi an trung thuc.",
    submit: "Dat cuoc bond va nop don",
    errUrlRequired: "URL la bat buoc.",
    errUrlShort: "URL qua ngan de co the truy cap.",
    errUrlScheme: "Toa chi tai tu web cong khai. URL phai bat dau bang http:// hoac https://.",
    errSameUrl: "Hai URL tro den cung mot trang. Khong co gi de xet xu.",
    errClaimShort: "Mo ta can it nhat 20 ky tu.",
    errOriginalPrefix: "Ban goc: ",
    errAccusedPrefix: "Ban bi to: ",
  },
};

function validateHttpUrl(raw: string, t: typeof CONTENT.en): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return t.errUrlRequired;
  if (trimmed.length <= 12) return t.errUrlShort;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return t.errUrlScheme;
  }
  return null;
}

export function FileComplaint({ policies, disabled, onSubmit }: Props) {
  const t = usePick(CONTENT);
  const [category, setCategory] = useState("");
  const [originUrl, setOriginUrl] = useState("");
  const [accusedUrl, setAccusedUrl] = useState("");
  const [claim, setClaim] = useState("");
  const [bond, setBond] = useState("1");
  const [error, setError] = useState<string | null>(null);

  const selected = policies.find((policy) => policy.category === (category || policies[0]?.category));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const originIssue = validateHttpUrl(originUrl, t);
    if (originIssue) {
      setError(`${t.errOriginalPrefix}${originIssue}`);
      return;
    }
    const accusedIssue = validateHttpUrl(accusedUrl, t);
    if (accusedIssue) {
      setError(`${t.errAccusedPrefix}${accusedIssue}`);
      return;
    }
    if (originUrl.trim().toLowerCase() === accusedUrl.trim().toLowerCase()) {
      setError(t.errSameUrl);
      return;
    }
    if (claim.trim().length < 20) {
      setError(t.errClaimShort);
      return;
    }

    try {
      await onSubmit({
        category: category || policies[0]?.category || "",
        originUrl: originUrl.trim(),
        accusedUrl: accusedUrl.trim(),
        claim: claim.trim(),
        bond: toWei(bond),
      });
      setOriginUrl("");
      setAccusedUrl("");
      setClaim("");
    } catch (submitError) {
      setError((submitError as Error).message);
    }
  }

  if (policies.length === 0) {
    return (
      <div className="panel">
        <h2>{t.emptyTitle}</h2>
        <p className="lede">{t.emptyLede}</p>
        <p className="fineprint">
          {t.emptyFineprint}{" "}
          <code>register_policy(category, doctrine)</code>
          {t.emptyFineprint2}
        </p>
      </div>
    );
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h2>{t.title}</h2>
      <p className="lede">{t.lede}</p>

      <label>
        {t.labelKind}
        <select
          value={category || policies[0]?.category || ""}
          onChange={(event) => setCategory(event.target.value)}
          disabled={disabled || policies.length === 0}
        >
          {policies.map((policy) => (
            <option key={policy.category} value={policy.category}>
              {policy.category}
            </option>
          ))}
        </select>
      </label>

      {selected ? (
        <details className="doctrine">
          <summary>{t.doctrinePrefix}{selected.revision})</summary>
          <p>{selected.doctrine}</p>
        </details>
      ) : null}

      <label>
        {t.labelOriginal}
        <input
          type="url"
          placeholder="https://…"
          value={originUrl}
          onChange={(event) => setOriginUrl(event.target.value)}
          disabled={disabled}
          required
        />
      </label>

      <label>
        {t.labelAccused}
        <input
          type="url"
          placeholder="https://…"
          value={accusedUrl}
          onChange={(event) => setAccusedUrl(event.target.value)}
          disabled={disabled}
          required
        />
      </label>

      <label>
        {t.labelClaim}
        <textarea
          rows={4}
          placeholder={t.placeholderClaim}
          value={claim}
          onChange={(event) => setClaim(event.target.value)}
          disabled={disabled}
          required
        />
      </label>

      <label>
        {t.labelBond}
        <input
          type="text"
          inputMode="decimal"
          value={bond}
          onChange={(event) => setBond(event.target.value)}
          disabled={disabled}
          required
        />
      </label>

      <p className="fineprint">{t.fineprint}</p>

      {error ? <p className="error">{error}</p> : null}

      <button type="submit" disabled={disabled}>
        {t.submit}
      </button>
    </form>
  );
}
