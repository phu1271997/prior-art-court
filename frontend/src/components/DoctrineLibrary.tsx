import { useState } from "react";
import { ADDRESSES, explorerContract } from "../lib/chain";
import { usePick } from "../lib/i18n";
import type { Policy } from "../lib/types";

interface Props {
  policies: Policy[];
}

const CONTENT = {
  en: {
    eyebrow: "The doctrine layer",
    emptyHeading: "No doctrine has been published yet.",
    emptyLede: "Until the registry publishes a standard, the court has no jurisdiction over anything, and every complaint is refused at filing.",
    heading: "Every standard the court applies is public before you file.",
    ledePrefix: "The adjudicator reads the paragraph below verbatim at hearing time. Doctrine registered on-chain as",
    ledeSuffix: ". Bringing a new medium under jurisdiction takes a paragraph, not code.",
    policyRegistryLabel: "PolicyRegistry",
    countSuffix: "categories · revision-locked",
    showLess: "Show less",
    readFull: "Read the full doctrine",
  },
  vi: {
    eyebrow: "Tang an le",
    emptyHeading: "Chua co an le nao duoc cong bo.",
    emptyLede: "Cho den khi registry cong bo mot tieu chuan, toa khong co tham quyen, va moi don kien deu bi tu choi.",
    heading: "Moi tieu chuan toa ap dung deu cong khai truoc khi ban nop don.",
    ledePrefix: "Hoi dong xet xu doc doan van ben duoi nguyen van tai phien xu. An le dang ky tren chuoi la",
    ledeSuffix: ". Dua loai hinh moi vao tham quyen chi can mot doan van, khong can code.",
    policyRegistryLabel: "PolicyRegistry",
    countSuffix: "loai · khoa phien ban",
    showLess: "Thu gon",
    readFull: "Doc toan bo an le",
  },
};

export function DoctrineLibrary({ policies }: Props) {
  const t = usePick(CONTENT);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (policies.length === 0) {
    return (
      <section id="doctrine" className="doctrine-library" aria-label={t.eyebrow}>
        <header>
          <span className="section-eyebrow">{t.eyebrow}</span>
          <h2>{t.emptyHeading}</h2>
          <p className="lede">{t.emptyLede}</p>
        </header>
      </section>
    );
  }

  return (
    <section id="doctrine" className="doctrine-library" aria-label={t.eyebrow}>
      <header className="doctrine-header">
        <div>
          <span className="section-eyebrow">{t.eyebrow}</span>
          <h2>{t.heading}</h2>
          <p className="lede">
            {t.ledePrefix}{" "}
            <a
              href={explorerContract(ADDRESSES.policyRegistry)}
              target="_blank"
              rel="noreferrer"
            >
              {t.policyRegistryLabel}
            </a>
            {t.ledeSuffix}
          </p>
        </div>
        <span className="doctrine-count">
          {policies.length} {t.countSuffix}
        </span>
      </header>

      <div className="doctrine-grid">
        {policies.map((policy) => {
          const isOpen = expanded === policy.category;
          const preview = policy.doctrine.slice(0, 220);
          const hasMore = policy.doctrine.length > 240;
          return (
            <article key={policy.category} className="doctrine-card">
              <header className="doctrine-card-header">
                <h3>{policy.category}</h3>
                <span className="doctrine-revision">rev {policy.revision}</span>
              </header>
              <p className="doctrine-text">
                {isOpen || !hasMore ? policy.doctrine : `${preview}…`}
              </p>
              {hasMore ? (
                <button
                  type="button"
                  className="secondary doctrine-more"
                  onClick={() => setExpanded(isOpen ? null : policy.category)}
                  aria-expanded={isOpen}
                >
                  {isOpen ? t.showLess : t.readFull}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
