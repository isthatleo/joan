"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";
import { Baby, Download, FileText, Stethoscope } from "lucide-react";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Health Records"
        subtitle="Your dependents' medical history and documents"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Records" value="34" subtitle="Across both children" icon={FileText} tone="info" />
        <StatCard title="Documents" value="18" subtitle="Available to download" icon={Download} tone="warning" />
        <StatCard title="Care Providers" value="5" subtitle="Across both children" icon={Stethoscope} tone="primary" />
        <StatCard title="Children" value="2" subtitle="On account" icon={Baby} tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Emma's Recent Records" description="Last 3">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                <p className="text-sm font-medium text-foreground truncate">Annual Physical — Dr. Lee</p>
              </div>
              <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-foreground shrink-0 ml-3">Mar 14, 2026</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-info" />
                <p className="text-sm font-medium text-foreground truncate">Allergy Panel Results</p>
              </div>
              <span className="rounded-md bg-info-soft px-2 py-0.5 text-xs font-medium text-info-soft-foreground shrink-0 ml-3">Feb 28, 2026</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                <p className="text-sm font-medium text-foreground truncate">School Physical Form</p>
              </div>
              <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-soft-foreground shrink-0 ml-3">Mar 14, 2026</span>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Liam's Recent Records" description="Last 3">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                <p className="text-sm font-medium text-foreground truncate">Flu Vaccine — Dr. Lee</p>
              </div>
              <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-foreground shrink-0 ml-3">Apr 02, 2026</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-info" />
                <p className="text-sm font-medium text-foreground truncate">Well-Child Visit</p>
              </div>
              <span className="rounded-md bg-info-soft px-2 py-0.5 text-xs font-medium text-info-soft-foreground shrink-0 ml-3">Apr 02, 2026</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-info" />
                <p className="text-sm font-medium text-foreground truncate">Growth Chart Update</p>
              </div>
              <span className="rounded-md bg-info-soft px-2 py-0.5 text-xs font-medium text-info-soft-foreground shrink-0 ml-3">Apr 02, 2026</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
