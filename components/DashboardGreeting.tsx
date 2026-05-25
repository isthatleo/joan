"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/stores/auth";

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardGreeting({ roleLabel }: { roleLabel: string }) {
  const [now, setNow] = useState(() => new Date());
  const { user } = useAuthStore();

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const icon = useMemo(() => (now.getHours() < 17 ? "*" : "."), [now]);
  const displayName = user?.fullName?.trim() || roleLabel;

  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      <p className="text-xl font-semibold tracking-tight text-foreground">
        {getGreeting(now)}, {displayName} {icon}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Today is {format(now, "EEEE, MMMM do, yyyy")} - {format(now, "h:mm a")}
      </p>
    </div>
  );
}
