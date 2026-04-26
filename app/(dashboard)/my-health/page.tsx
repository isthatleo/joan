"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";
import { Activity, Calendar, HeartPulse, Pill } from "lucide-react";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="My Health"
        subtitle="Your vitals, conditions, and health summary"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Heart Rate" value="72 bpm" subtitle="Resting average" icon={HeartPulse} tone="success" />
        <StatCard title="Blood Pressure" value="118/76" subtitle="Last reading" icon={Activity} tone="success" />
        <StatCard title="Active Meds" value="3" subtitle="Current prescriptions" icon={Pill} tone="primary" />
        <StatCard title="Next Visit" value="May 12" subtitle="Annual checkup" icon={Calendar} tone="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Active Conditions" description="Tracked diagnoses">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                <p className="text-sm font-medium text-foreground truncate">Hypertension</p>
              </div>
              <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-foreground shrink-0 ml-3">Controlled</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-info" />
                <p className="text-sm font-medium text-foreground truncate">Type 2 Diabetes</p>
              </div>
              <span className="rounded-md bg-info-soft px-2 py-0.5 text-xs font-medium text-info-soft-foreground shrink-0 ml-3">Stable, last A1C 6.8</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-medium text-foreground truncate">Seasonal Allergies</p>
              </div>
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground shrink-0 ml-3">Active</span>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Recent Vitals" description="Last 7 readings">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Mon</p>
                <p className="text-sm font-semibold text-foreground">72</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "97%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Tue</p>
                <p className="text-sm font-semibold text-foreground">74</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Wed</p>
                <p className="text-sm font-semibold text-foreground">71</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "96%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Thu</p>
                <p className="text-sm font-semibold text-foreground">73</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "99%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Fri</p>
                <p className="text-sm font-semibold text-foreground">70</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "95%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Sat</p>
                <p className="text-sm font-semibold text-foreground">72</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "97%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Sun</p>
                <p className="text-sm font-semibold text-foreground">71</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "96%" }} />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
