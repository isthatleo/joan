"use client";

import Link from "next/link";
import { useTenantPath } from "@/hooks/useTenantPath";
import { UserSettingsWorkspace } from "@/components/settings/UserSettingsWorkspace";

export default function ReceptionSettingsPage() {
  const tenantPath = useTenantPath();

  return (
    <div className="space-y-6">
      <UserSettingsWorkspace
        heading="Reception User Settings"
        subtitle="Manage your personal workspace preferences and emergency-response guidance from one place."
        scopeLabel="Reception Account"
        landingPageOptions={[
          { value: "dashboard", label: "Dashboard" },
          { value: "appointments", label: "Appointments" },
          { value: "check-in", label: "Check-in" },
          { value: "queue", label: "Queue" },
          { value: "messages", label: "Messages" },
        ]}
      />

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Emergency Tutorial</p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">Reception emergency quick guide</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Reopen the emergency tutorial whenever you need to review alert creation, team dispatch, and incident closure.
        </p>
        <div className="mt-4">
          <Link href={tenantPath("/emergency?tutorial=1")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Open emergency tutorial
          </Link>
        </div>
      </section>
    </div>
  );
}
