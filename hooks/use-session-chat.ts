"use client";

import { useEffect, useState } from "react";

/**
 * Browser-tab session storage only. Nothing here is sent to a server
 * transcript table or written to local storage that survives the session.
 */
export function useSessionChatState<T>(
  key: string,
  initialValue: T,
  sanitize: (value: unknown) => T
) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(false);
    if (typeof window === "undefined") return;

    try {
      const raw = window.sessionStorage.getItem(key);
      setValue(raw === null ? initialValue : sanitize(JSON.parse(raw)));
    } catch {
      setValue(initialValue);
    }
    setHydrated(true);
  }, [key, sanitize]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Session storage may be unavailable or full; chat still works in memory.
    }
  }, [hydrated, key, value]);

  return [value, setValue] as const;
}
