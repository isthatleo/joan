"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "joan-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem(STORAGE_KEY) as Theme | null)) || null;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const prefersDark = mediaQuery.matches;
    const initial: Theme = saved ?? (prefersDark ? "dark" : "light");
    
    applyTheme(initial);
    setThemeState(initial);

    // Listen for system theme changes if no saved preference exists
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const next = e.matches ? "dark" : "light";
        applyTheme(next);
        setThemeState(next);
      }
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  function applyTheme(next: Theme) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
  }

  const setTheme = (next: Theme) => {
    applyTheme(next);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

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
