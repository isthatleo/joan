"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";
import { CheckCircle2, Clock, DollarSign, Receipt } from "lucide-react";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="All patient invoices and statements"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Invoices" value="1,847" subtitle="All time" icon={Receipt} tone="info" />
        <StatCard title="Outstanding" value="$145,230" subtitle="Unpaid balance" icon={DollarSign} tone="warning" />
        <StatCard title="Overdue" value="47" subtitle="Past due date" icon={Clock} tone="destructive" />
        <StatCard title="Paid This Month" value="412" subtitle="Cleared invoices" icon={CheckCircle2} tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Recent Invoices" description="Latest 5">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                <p className="text-sm font-medium text-foreground truncate">INV-2026-0421 — J. Doe</p>
              </div>
              <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-foreground shrink-0 ml-3">$2,450 — Paid</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-medium text-foreground truncate">INV-2026-0422 — M. Chen</p>
              </div>
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground shrink-0 ml-3">$1,890 — Pending</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
                <p className="text-sm font-medium text-foreground truncate">INV-2026-0423 — S. Johnson</p>
              </div>
              <span className="rounded-md bg-destructive-soft px-2 py-0.5 text-xs font-medium text-destructive-soft-foreground shrink-0 ml-3">$3,200 — Overdue</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-medium text-foreground truncate">INV-2026-0424 — E. Davis</p>
              </div>
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground shrink-0 ml-3">$1,560 — Pending</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                <p className="text-sm font-medium text-foreground truncate">INV-2026-0425 — J. Wilson</p>
              </div>
              <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-foreground shrink-0 ml-3">$890 — Paid</span>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Status Distribution" description="Current invoices">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Paid</p>
                <p className="text-sm font-semibold text-foreground">412</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Pending</p>
                <p className="text-sm font-semibold text-foreground">89</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "22%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Overdue</p>
                <p className="text-sm font-semibold text-foreground">47</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "11%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Disputed</p>
                <p className="text-sm font-semibold text-foreground">8</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "2%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Refunded</p>
                <p className="text-sm font-semibold text-foreground">12</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "3%" }} />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
