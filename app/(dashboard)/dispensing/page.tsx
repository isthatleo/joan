"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";
import { CheckCircle2, Clock, Package, Pill } from "lucide-react";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Dispensing"
        subtitle="Prescription dispensing queue and fulfillment"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Queue" value="42" subtitle="Prescriptions waiting" icon={Pill} tone="warning" />
        <StatCard title="Dispensed Today" value="187" subtitle="Completed orders" icon={CheckCircle2} tone="success" />
        <StatCard title="Avg Fill Time" value="8m" subtitle="Per prescription" icon={Clock} tone="info" />
        <StatCard title="Refills Pending" value="23" subtitle="Awaiting authorization" icon={Package} tone="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Dispensing Queue" description="Next to fill">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-medium text-foreground truncate">Rx #4521 — Amoxicillin 500mg</p>
              </div>
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground shrink-0 ml-3">Patient: J. Doe</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                <p className="text-sm font-medium text-foreground truncate">Rx #4522 — Lisinopril 10mg</p>
              </div>
              <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-soft-foreground shrink-0 ml-3">Patient: M. Chen</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                <p className="text-sm font-medium text-foreground truncate">Rx #4523 — Metformin 1000mg</p>
              </div>
              <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-soft-foreground shrink-0 ml-3">Patient: S. Johnson</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-info" />
                <p className="text-sm font-medium text-foreground truncate">Rx #4524 — Atorvastatin 20mg</p>
              </div>
              <span className="rounded-md bg-info-soft px-2 py-0.5 text-xs font-medium text-info-soft-foreground shrink-0 ml-3">Patient: E. Davis</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-medium text-foreground truncate">Rx #4525 — Albuterol Inhaler</p>
              </div>
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground shrink-0 ml-3">Patient: J. Wilson</span>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Hourly Volume" description="Today">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">8AM</p>
                <p className="text-sm font-semibold text-foreground">12</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "39%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">10AM</p>
                <p className="text-sm font-semibold text-foreground">24</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "77%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">12PM</p>
                <p className="text-sm font-semibold text-foreground">31</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">2PM</p>
                <p className="text-sm font-semibold text-foreground">28</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "90%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">4PM</p>
                <p className="text-sm font-semibold text-foreground">22</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "71%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">6PM</p>
                <p className="text-sm font-semibold text-foreground">14</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "45%" }} />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
