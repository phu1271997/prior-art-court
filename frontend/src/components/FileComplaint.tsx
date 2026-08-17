import { useState } from "react";
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

export function FileComplaint({ policies, disabled, onSubmit }: Props) {
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

  return (
    <form className="panel" onSubmit={submit}>
      <h2>File a complaint</h2>
      <p className="lede">
        Two URLs and a bond. The court fetches both pages itself and decides whether
        one copied the other.
      </p>

      <label>
        Kind of work
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
          <summary>The standard this category is judged against (revision {selected.revision})</summary>
          <p>{selected.doctrine}</p>
        </details>
      ) : null}

      <label>
        The original
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
        The work you say copied it
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
        What was taken
        <textarea
          rows={4}
          placeholder="Say what was copied and why it is not fair reuse. The adjudicator reads this."
          value={claim}
          onChange={(event) => setClaim(event.target.value)}
          disabled={disabled}
          required
        />
      </label>

      <label>
        Bond (GEN)
        <input
          type="text"
          inputMode="decimal"
          value={bond}
          onChange={(event) => setBond(event.target.value)}
          disabled={disabled}
          required
        />
      </label>

      <p className="fineprint">
        You get the bond back if the court agrees with you. If nobody contests and
        the court rejects the complaint, the bond is forfeited — that is what keeps
        the docket honest.
      </p>

      {error ? <p className="error">{error}</p> : null}

      <button type="submit" disabled={disabled}>
        Stake the bond and file
      </button>
    </form>
  );
}
