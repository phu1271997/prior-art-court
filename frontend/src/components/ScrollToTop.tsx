import { useEffect, useState } from "react";
import { usePick } from "../lib/i18n";

const CONTENT = {
  en: { label: "Back to top" },
  vi: { label: "Ve dau trang" },
};

export function ScrollToTop() {
  const t = usePick(CONTENT);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="scroll-to-top"
      aria-label={t.label}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      &uarr;
    </button>
  );
}
