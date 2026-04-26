"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";
import { CreditCard, DollarSign, RotateCw, TrendingUp } from "lucide-react";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Payment processing and reconciliation"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Today's Payments" value="$28,450" subtitle="Processed today" icon={DollarSign} tone="success" />
        <StatCard title="Transaction Count" value="94" subtitle="Today's volume" icon={CreditCard} tone="info" />
        <StatCard title="MTD Total" value="$487,200" subtitle="Month-to-date" icon={TrendingUp} tone="primary" />
        <StatCard title="Refunds" value="$2,340" subtitle="This month" icon={RotateCw} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Recent Transactions" description="Latest 5">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                <p className="text-sm font-medium text-foreground truncate">CC-7821 — J. Doe</p>
              </div>
              <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-foreground shrink-0 ml-3">$2,450</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                <p className="text-sm font-medium text-foreground truncate">ACH-3402 — M. Chen</p>
              </div>
              <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-foreground shrink-0 ml-3">$1,890</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                <p className="text-sm font-medium text-foreground truncate">CC-7822 — S. Johnson</p>
              </div>
              <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-foreground shrink-0 ml-3">$890</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                <p className="text-sm font-medium text-foreground truncate">Cash-001 — E. Davis</p>
              </div>
              <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-foreground shrink-0 ml-3">$320</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-medium text-foreground truncate">CC-7823 — Refund J. Wilson</p>
              </div>
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground shrink-0 ml-3">-$140</span>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Payment Methods" description="This month">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Credit Card</p>
                <p className="text-sm font-semibold text-foreground">248</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Insurance</p>
                <p className="text-sm font-semibold text-foreground">142</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "57%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">ACH</p>
                <p className="text-sm font-semibold text-foreground">87</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "35%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Cash</p>
                <p className="text-sm font-semibold text-foreground">34</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "14%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Check</p>
                <p className="text-sm font-semibold text-foreground">18</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "7%" }} />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
