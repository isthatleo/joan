"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import {
  applyUserPreferences,
  readStoredThemePreference,
  USER_ACTIVITY_STATUS_STORAGE_KEY,
  USER_CALENDAR_START_STORAGE_KEY,
  USER_COMPACT_TABLES_STORAGE_KEY,
  USER_DEFAULT_CHANNEL_STORAGE_KEY,
  USER_DEFAULT_LANDING_PAGE_STORAGE_KEY,
  USER_DENSITY_STORAGE_KEY,
  USER_EXPORT_FORMAT_STORAGE_KEY,
  USER_FONT_SCALE_STORAGE_KEY,
  USER_HIGH_CONTRAST_STORAGE_KEY,
  USER_LANGUAGE_STORAGE_KEY,
  USER_READ_RECEIPTS_STORAGE_KEY,
  USER_REDUCE_MOTION_STORAGE_KEY,
  USER_TIME_FORMAT_STORAGE_KEY,
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
        timeFormat: window.localStorage.getItem(USER_TIME_FORMAT_STORAGE_KEY) || "12h",
        density: window.localStorage.getItem(USER_DENSITY_STORAGE_KEY) || "comfortable",
        calendarStart: window.localStorage.getItem(USER_CALENDAR_START_STORAGE_KEY) || "monday",
        fontScale: window.localStorage.getItem(USER_FONT_SCALE_STORAGE_KEY) || "default",
        reduceMotion: window.localStorage.getItem(USER_REDUCE_MOTION_STORAGE_KEY) === "true",
        highContrast: window.localStorage.getItem(USER_HIGH_CONTRAST_STORAGE_KEY) === "true",
      },
      privacy: {
        readReceipts: window.localStorage.getItem(USER_READ_RECEIPTS_STORAGE_KEY) !== "false",
        activityStatus: window.localStorage.getItem(USER_ACTIVITY_STATUS_STORAGE_KEY) !== "false",
      },
      communication: {
        messageSettings: {
          defaultChannel: window.localStorage.getItem(USER_DEFAULT_CHANNEL_STORAGE_KEY) || "inbox",
        },
      },
      workflow: {
        defaultLandingPage: window.localStorage.getItem(USER_DEFAULT_LANDING_PAGE_STORAGE_KEY) || "dashboard",
        preferredExportFormat: window.localStorage.getItem(USER_EXPORT_FORMAT_STORAGE_KEY) || "pdf",
        compactTables: window.localStorage.getItem(USER_COMPACT_TABLES_STORAGE_KEY) === "true",
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
            staleTime: 2 * 60 * 1000,
            gcTime: 15 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: (failureCount, error) => {
              if (error instanceof Error && error.message.includes("4")) {
                return false;
              }
              return failureCount < 1;
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
