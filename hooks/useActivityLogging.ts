"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export interface ActivityLogOptions {
  action: string;
  resource?: string;
  resourceId?: string;
  description?: string;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
}

export function useActivityLogging() {
  const { data: session } = useSession();
  const fingerprintIdRef = useRef<string>("");
  const sessionIdRef = useRef<string>("");

  // Initialize fingerprinting on mount
  useEffect(() => {
    if (!session?.user?.email) return;

    const initFingerprintAndSession = async () => {
      try {
        // Get device fingerprint
        const fpResponse = await fetch("/api/fingerprinting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.user.id,
            tenantId: session.user.tenantId,
            screenResolution: `${typeof window !== "undefined" ? window.innerWidth : 0}x${typeof window !== "undefined" ? window.innerHeight : 0}`,
            language: typeof navigator !== "undefined" ? navigator.language : "en",
            timezone: Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone,
          }),
        });

        if (fpResponse.ok) {
          const fpData = await fpResponse.json();
          fingerprintIdRef.current = fpData.fingerprintId;
        }

        // Create session
        const sessionResponse = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.user.id,
            tenantId: session.user.tenantId,
            deviceFingerprintId: fingerprintIdRef.current,
          }),
        });

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          sessionIdRef.current = sessionData.sessionToken;
        }
      } catch (error) {
        console.error("Failed to initialize fingerprinting/session:", error);
      }
    };

    initFingerprintAndSession();
  }, [session?.user?.email]);

  // Log activity function
  const logActivity = async (options: ActivityLogOptions) => {
    if (!session?.user) return;

    try {
      await fetch("/api/activity-logging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          tenantId: session.user.tenantId,
          deviceFingerprintId: fingerprintIdRef.current,
          userSessionId: sessionIdRef.current,
          ...options,
        }),
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  return {
    logActivity,
    fingerprintId: fingerprintIdRef.current,
    sessionId: sessionIdRef.current,
  };
}

// Hook to track page views
export function useActivityPageView(pageName: string, metadata?: Record<string, any>) {
  const { logActivity } = useActivityLogging();

  useEffect(() => {
    logActivity({
      action: "view",
      resource: "page",
      description: `Viewed ${pageName}`,
      metadata: {
        pageName,
        url: typeof window !== "undefined" ? window.location.pathname : "",
        ...metadata,
      },
    });
  }, [pageName]);
}

// Hook to track user actions
export function useActivityTrack(action: string, dependencies: any[] = []) {
  const { logActivity } = useActivityLogging();

  const track = (options: Omit<ActivityLogOptions, "action">) => {
    logActivity({
      action,
      ...options,
    });
  };

  return track;
}

