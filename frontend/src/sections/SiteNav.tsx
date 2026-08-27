import { useCallback, useEffect, useState } from "react";
import { ADDRESSES, CHAIN_NAME, explorerContract } from "../lib/chain";
import { shortAddress } from "../lib/types";

interface Props {
  account: string | null;
  onConnect: () => void;
}

const LINKS: Array<{ id: string; label: string }> = [
  { id: "problem", label: "Problem" },
  { id: "how-it-works", label: "How it works" },
  { id: "verdicts", label: "Verdicts" },
  { id: "architecture", label: "Architecture" },
  { id: "use-cases", label: "Use cases" },
  { id: "court", label: "The court" },
  { id: "faq", label: "FAQ" },
];

export function SiteNav({ account, onConnect }: Props) {
  const [active, setActive] = useState<string>("top");
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const targets: HTMLElement[] = [];
    for (const link of [{ id: "top", label: "" }, ...LINKS]) {
      const el = document.getElementById(link.id);
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
          {mobileOpen ? "Close" : "Menu"}
        </button>

        <ul
          id="site-nav-links"
          className={`site-nav-links ${mobileOpen ? "site-nav-links-open" : ""}`}
        >
          {LINKS.map((link) => (
            <li key={link.id}>
              <button
                type="button"
                className={active === link.id ? "site-nav-link-active" : ""}
                onClick={() => jump(link.id)}
              >
                {link.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="site-nav-meta">
          <a
            className="site-nav-chain"
            href={explorerContract(ADDRESSES.court)}
            target="_blank"
            rel="noreferrer"
            title={`Court contract on ${CHAIN_NAME}`}
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
              Connect wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
