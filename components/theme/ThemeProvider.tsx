"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { applyThemePreference, readStoredThemePreference, type ThemePreference } from "@/lib/user-preferences";

type Theme = ThemePreference;

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = readStoredThemePreference();
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const initial: Theme = saved;

    applyThemePreference(initial);
    setThemeState(initial);

    // Listen for system theme changes while the user preference is "system"
    const handler = (e: MediaQueryListEvent) => {
      if (readStoredThemePreference() === "system") {
        applyThemePreference("system");
        setThemeState("system");
      }
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const setTheme = (next: Theme) => {
    applyThemePreference(next);
    setThemeState(next);
  };

  const toggle = () => {
    const effectiveDark =
      typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    setTheme(effectiveDark ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so usage outside provider doesn't crash
    return { theme: "light" as Theme, setTheme: () => {}, toggle: () => {} };
  }
  return ctx;
}
