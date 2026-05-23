"use client";

import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const isDark =
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : theme === "dark";

  async function persistTheme(nextTheme: "light" | "dark") {
    setTheme(nextTheme);
    setSaving(true);
    try {
      const currentResponse = await fetch("/api/users/settings");
      if (!currentResponse.ok) return;
      const currentSettings = await currentResponse.json().catch(() => null);
      if (!currentSettings) return;

      await fetch("/api/users/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentSettings,
          appearance: {
            ...(currentSettings.appearance || {}),
            theme: nextTheme,
          },
        }),
      });
    } catch {
      // local theme persistence is already applied via ThemeProvider/localStorage
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void persistTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      disabled={saving}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
