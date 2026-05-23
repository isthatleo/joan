"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import {
  applyUserPreferences,
  readStoredThemePreference,
  USER_DENSITY_STORAGE_KEY,
  USER_FONT_SCALE_STORAGE_KEY,
  USER_LANGUAGE_STORAGE_KEY,
  USER_TIMEZONE_STORAGE_KEY,
} from "@/lib/user-preferences";

function PreferenceBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    applyUserPreferences({
      appearance: {
        theme: readStoredThemePreference(),
        language: window.localStorage.getItem(USER_LANGUAGE_STORAGE_KEY) || "en",
        timezone: window.localStorage.getItem(USER_TIMEZONE_STORAGE_KEY) || "UTC",
        density: window.localStorage.getItem(USER_DENSITY_STORAGE_KEY) || "comfortable",
        fontScale: window.localStorage.getItem(USER_FONT_SCALE_STORAGE_KEY) || "default",
      },
    });
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 10 * 60 * 1000, // 10 minutes
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors
              if (error instanceof Error && error.message.includes("4")) {
                return false;
              }
              return failureCount < 3;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PreferenceBootstrap />
      <Toaster />
      {children}
    </QueryClientProvider>
  );
}
