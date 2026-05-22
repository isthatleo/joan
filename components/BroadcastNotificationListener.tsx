"use client";

import { useBroadcastNotifications } from "@/hooks/useBroadcastNotifications.tsx";

export function BroadcastNotificationListener() {
  // This component just runs the hook to show notifications
  useBroadcastNotifications();
  return null;
}