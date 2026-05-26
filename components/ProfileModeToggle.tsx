"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";

type ProfileMode = "patient" | "guardian";

export function ProfileModeToggle({
  currentMode,
  hasPatientRole: hasPatientRoleOverride,
  hasGuardianRole: hasGuardianRoleOverride,
}: {
  currentMode: ProfileMode;
  hasPatientRole?: boolean;
  hasGuardianRole?: boolean;
}) {
  const params = useParams();
  const slug = params?.slug as string;
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/users/profile", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.roles) return;
        setRoles((data.roles as Array<{ name: string }>).map((item) => String(item.name || "").toLowerCase()));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const hasGuardian = useMemo(
    () => hasGuardianRoleOverride ?? roles.includes("guardian"),
    [hasGuardianRoleOverride, roles],
  );
  const hasPatient = useMemo(
    () => hasPatientRoleOverride ?? roles.includes("patient"),
    [hasPatientRoleOverride, roles],
  );

  if (!(hasGuardian && hasPatient)) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Profile Mode</p>
          <p className="text-sm text-muted-foreground">Switch between your guardian workspace and your personal patient workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/tenant/${slug}/patient`}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${currentMode === "patient" ? "bg-primary text-primary-foreground" : "border border-border text-foreground hover:bg-muted"}`}
          >
            Patient Dashboard
          </Link>
          <Link
            href={`/tenant/${slug}/guardian`}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${currentMode === "guardian" ? "bg-primary text-primary-foreground" : "border border-border text-foreground hover:bg-muted"}`}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Guardian Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
