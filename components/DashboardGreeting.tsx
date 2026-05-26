"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { MoonStar, Sun, Sunrise, Sunset } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { formatTimeForUser } from "@/lib/time-format";

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getGreetingIcon(date: Date) {
  const minutes = date.getHours() * 60 + date.getMinutes();

  if (minutes < 12 * 60) {
    return { Icon: Sunrise, className: "text-amber-500" };
  }
  if (minutes < 17 * 60) {
    return { Icon: Sun, className: "text-orange-500" };
  }
  if (minutes < 19 * 60 + 45) {
    return { Icon: Sunset, className: "text-rose-500" };
  }
  return { Icon: MoonStar, className: "text-indigo-500" };
}

export function DashboardGreeting({ roleLabel }: { roleLabel: string }) {
  const [now, setNow] = useState(() => new Date());
  const { user } = useAuthStore();

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const greetingIcon = useMemo(() => getGreetingIcon(now), [now]);
  const displayName = user?.fullName?.trim() || roleLabel;
  const Icon = greetingIcon.Icon;

  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2">
          <Icon className={`h-5 w-5 ${greetingIcon.className}`} />
        </div>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          {getGreeting(now)}, {displayName}
        </p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Today is {format(now, "EEEE, MMMM do, yyyy")} - {formatTimeForUser(now)}
      </p>
    </div>
  );
}
