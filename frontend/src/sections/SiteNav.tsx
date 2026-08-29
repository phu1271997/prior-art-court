import { useCallback, useEffect, useState } from "react";
import { ADDRESSES, CHAIN_NAME, explorerContract } from "../lib/chain";
import { useLang, usePick } from "../lib/i18n";
import type { Lang } from "../lib/i18n";
import { shortAddress } from "../lib/types";

interface Props {
  account: string | null;
  onConnect: () => void;
}

const CONTENT = {
  en: {
    links: [
      { id: "problem", label: "Problem" },
      { id: "how-it-works", label: "How it works" },
      { id: "verdicts", label: "Verdicts" },
      { id: "architecture", label: "Architecture" },
      { id: "use-cases", label: "Use cases" },
      { id: "court", label: "The court" },
      { id: "faq", label: "FAQ" },
    ],
    menu: "Menu",
    close: "Close",
    connect: "Connect wallet",
    chainTitle: `Court contract on ${CHAIN_NAME}`,
  },
  vi: {
    links: [
      { id: "problem", label: "Vấn đề" },
      { id: "how-it-works", label: "Cách hoạt động" },
      { id: "verdicts", label: "Phán quyết" },
      { id: "architecture", label: "Kiến trúc" },
      { id: "use-cases", label: "Ứng dụng" },
      { id: "court", label: "Phiên tòa" },
      { id: "faq", label: "Hỏi đáp" },
    ],
    menu: "Menu",
    close: "Đóng",
    connect: "Kết nối ví",
    chainTitle: `Contract của tòa trên ${CHAIN_NAME}`,
  },
};

export function SiteNav({ account, onConnect }: Props) {
  const [active, setActive] = useState<string>("top");
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, setLang } = useLang();
  const t = usePick(CONTENT);

  useEffect(() => {
    const targets: HTMLElement[] = [];
    for (const id of ["top", ...CONTENT.en.links.map((l) => l.id)]) {
      const el = document.getElementById(id);
      if (el) targets.push(el);
    }
    if (targets.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const jump = useCallback((id: string) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: y, behavior: "smooth" });
  }, []);

  function switchLang(next: Lang) {
    if (next !== lang) setLang(next);
  }

  return (
    <nav
      className={`site-nav ${scrolled ? "site-nav-scrolled" : ""}`}
      aria-label="Primary"
    >
      <div className="site-nav-inner">
        <button
          type="button"
          className="site-nav-brand"
          onClick={() => jump("top")}
        >
          <span className="site-nav-mark" aria-hidden="true">
            §
          </span>
          <span>Prior Art Court</span>
        </button>

        <button
          type="button"
          className="site-nav-mobile-toggle"
          aria-expanded={mobileOpen}
          aria-controls="site-nav-links"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? t.close : t.menu}
        </button>

        <ul
          id="site-nav-links"
          className={`site-nav-links ${mobileOpen ? "site-nav-links-open" : ""}`}
        >
          {t.links.map((link) => {
            const isActive = active === link.id;
            return (
              <li key={link.id}>
                <button
                  type="button"
                  className={isActive ? "site-nav-link-active" : ""}
                  aria-current={isActive ? "location" : undefined}
                  onClick={() => jump(link.id)}
                >
                  {link.label}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="site-nav-meta">
          <div className="lang-toggle" role="group" aria-label="Language">
            <button
              type="button"
              className={lang === "en" ? "lang-active" : ""}
              aria-pressed={lang === "en"}
              onClick={() => switchLang("en")}
            >
              EN
            </button>
            <button
              type="button"
              className={lang === "vi" ? "lang-active" : ""}
              aria-pressed={lang === "vi"}
              onClick={() => switchLang("vi")}
            >
              VI
            </button>
          </div>
          <a
            className="site-nav-chain"
            href={explorerContract(ADDRESSES.court)}
            target="_blank"
            rel="noreferrer"
            title={t.chainTitle}
          >
            {CHAIN_NAME}
          </a>
          {account ? (
            <span className="site-nav-account">{shortAddress(account)}</span>
          ) : (
            <button
              type="button"
              className="site-nav-connect"
              onClick={onConnect}
            >
              {t.connect}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
