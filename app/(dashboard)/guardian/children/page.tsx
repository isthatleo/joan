"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";
import { Baby, Calendar, FileText, ShieldCheck } from "lucide-react";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Child Profiles"
        subtitle="Manage your dependents' health profiles"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Children" value="2" subtitle="On your account" icon={Baby} tone="primary" />
        <StatCard title="Upcoming Visits" value="3" subtitle="Next 30 days" icon={Calendar} tone="info" />
        <StatCard title="Vaccinations Up-to-date" value="2/2" subtitle="All current" icon={ShieldCheck} tone="success" />
        <StatCard title="Records on File" value="34" subtitle="Combined documents" icon={FileText} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Your Children" description="Profile summary">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                <p className="text-sm font-medium text-foreground truncate">Emma Doe — Age 7</p>
              </div>
              <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-foreground shrink-0 ml-3">Last visit: Mar 14, 2026</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                <p className="text-sm font-medium text-foreground truncate">Liam Doe — Age 4</p>
              </div>
              <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-foreground shrink-0 ml-3">Last visit: Apr 02, 2026</span>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Recent Activity" description="Last 5 events">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                <p className="text-sm font-medium text-foreground truncate">Emma — Annual checkup completed</p>
              </div>
              <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-foreground shrink-0 ml-3">Mar 14, 2026</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-info" />
                <p className="text-sm font-medium text-foreground truncate">Liam — Flu vaccine administered</p>
              </div>
              <span className="rounded-md bg-info-soft px-2 py-0.5 text-xs font-medium text-info-soft-foreground shrink-0 ml-3">Apr 02, 2026</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                <p className="text-sm font-medium text-foreground truncate">Emma — School physical form</p>
              </div>
              <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-soft-foreground shrink-0 ml-3">Mar 14, 2026</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-info" />
                <p className="text-sm font-medium text-foreground truncate">Liam — Growth measurement updated</p>
              </div>
              <span className="rounded-md bg-info-soft px-2 py-0.5 text-xs font-medium text-info-soft-foreground shrink-0 ml-3">Apr 02, 2026</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-medium text-foreground truncate">Emma — Allergy panel ordered</p>
              </div>
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground shrink-0 ml-3">Feb 28, 2026</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
