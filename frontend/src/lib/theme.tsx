import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "pac.theme";

interface ThemeState {
  mode: ThemeMode;
  resolved: "light" | "dark";
  cycle: () => void;
}

const ThemeContext = createContext<ThemeState>({
  mode: "system",
  resolved: "light",
  cycle: () => undefined,
});

function detectInitial(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

function resolve(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(detectInitial);
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolve(mode));

  useEffect(() => {
    const r = resolve(mode);
    setResolved(r);
    if (mode === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", mode);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolved(resolve("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  function cycle() {
    const next: ThemeMode =
      mode === "system" ? "dark" : mode === "dark" ? "light" : "system";
    setMode(next);
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  return (
    <ThemeContext.Provider value={{ mode, resolved, cycle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeState {
  return useContext(ThemeContext);
}
