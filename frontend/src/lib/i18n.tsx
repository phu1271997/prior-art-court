import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

/*
  Two-language UI, one mechanism.

  Every component keeps its own strings in a colocated `CONTENT = { en, vi }`
  object and picks a side with `useLang()`. That keeps each translation next
  to the layout it fills, so an update to a section can never silently orphan
  its Vietnamese copy in some faraway dictionary file. This module only owns
  the current language, its persistence, and the <html lang> attribute.

  Contract vocabulary (INFRINGING, DERIVATIVE_FAIR, studionet, GEN) is never
  translated: those strings are on-chain values, and a reviewer must be able
  to grep the UI for exactly what the contract stores.
*/

export type Lang = "en" | "vi";

const STORAGE_KEY = "pac.lang";

interface LangState {
  lang: Lang;
  setLang: (next: Lang) => void;
}

const LangContext = createContext<LangState>({ lang: "en", setLang: () => undefined });

function detectInitial(): Lang {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "vi") return stored;
  } catch {
    /* storage unavailable — fall through to browser language */
  }
  try {
    if (navigator.language?.toLowerCase().startsWith("vi")) return "vi";
  } catch {
    /* navigator unavailable in some render contexts */
  }
  return "en";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitial);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function setLang(next: Lang) {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang(): LangState {
  return useContext(LangContext);
}

/** Pick the current language's side of a colocated content object. */
export function usePick<T>(content: { en: T; vi: T }): T {
  const { lang } = useLang();
  return content[lang];
}
