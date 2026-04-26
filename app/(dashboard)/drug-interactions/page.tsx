"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";
import { AlertOctagon, AlertTriangle, Pill, ShieldCheck } from "lucide-react";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Drug Interactions"
        subtitle="Active interaction alerts and safety reviews"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Active Alerts" value="8" subtitle="Requires review" icon={AlertOctagon} tone="destructive" />
        <StatCard title="Cleared This Week" value="34" subtitle="Reviewed and resolved" icon={ShieldCheck} tone="success" />
        <StatCard title="High Severity" value="2" subtitle="Major interactions" icon={AlertTriangle} tone="destructive" />
        <StatCard title="Total Screenings" value="1,847" subtitle="This month" icon={Pill} tone="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Recent Interaction Alerts" description="Needs pharmacist review">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
                <p className="text-sm font-medium text-foreground truncate">Warfarin + Aspirin — Major</p>
              </div>
              <span className="rounded-md bg-destructive-soft px-2 py-0.5 text-xs font-medium text-destructive-soft-foreground shrink-0 ml-3">Patient: J. Doe</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
                <p className="text-sm font-medium text-foreground truncate">Simvastatin + Erythromycin — Severe</p>
              </div>
              <span className="rounded-md bg-destructive-soft px-2 py-0.5 text-xs font-medium text-destructive-soft-foreground shrink-0 ml-3">Patient: M. Chen</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-medium text-foreground truncate">Metformin + Contrast — Moderate</p>
              </div>
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground shrink-0 ml-3">Patient: S. Johnson</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-medium text-foreground truncate">SSRI + NSAID — Moderate</p>
              </div>
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground shrink-0 ml-3">Patient: E. Davis</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-info" />
                <p className="text-sm font-medium text-foreground truncate">ACE-I + K-sparing — Minor</p>
              </div>
              <span className="rounded-md bg-info-soft px-2 py-0.5 text-xs font-medium text-info-soft-foreground shrink-0 ml-3">Patient: J. Wilson</span>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Severity Breakdown" description="Last 30 days">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Major</p>
                <p className="text-sm font-semibold text-foreground">8</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "5%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Severe</p>
                <p className="text-sm font-semibold text-foreground">14</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "9%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Moderate</p>
                <p className="text-sm font-semibold text-foreground">42</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "28%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Minor</p>
                <p className="text-sm font-semibold text-foreground">87</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "57%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Info</p>
                <p className="text-sm font-semibold text-foreground">152</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "100%" }} />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
