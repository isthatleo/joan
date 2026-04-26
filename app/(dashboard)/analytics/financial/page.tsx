"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";
import { Activity, DollarSign, PieChart, TrendingUp } from "lucide-react";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Financial Analysis"
        subtitle="Revenue, expenses, margins, and projections"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Net Revenue" value="$2.4M" subtitle="YTD" icon={DollarSign} tone="success" />
        <StatCard title="Operating Margin" value="18.4%" subtitle="+2.1pp YoY" icon={TrendingUp} tone="success" />
        <StatCard title="AR Days" value="32" subtitle="Average collection" icon={Activity} tone="info" />
        <StatCard title="Cost Ratio" value="67%" subtitle="Of revenue" icon={PieChart} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Revenue by Service" description="MTD breakdown">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                <p className="text-sm font-medium text-foreground truncate">Inpatient Care</p>
              </div>
              <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-foreground shrink-0 ml-3">$184K (38%)</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                <p className="text-sm font-medium text-foreground truncate">Outpatient Visits</p>
              </div>
              <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-soft-foreground shrink-0 ml-3">$142K (29%)</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-medium text-foreground truncate">Emergency Services</p>
              </div>
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground shrink-0 ml-3">$98K (20%)</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-info" />
                <p className="text-sm font-medium text-foreground truncate">Lab & Imaging</p>
              </div>
              <span className="rounded-md bg-info-soft px-2 py-0.5 text-xs font-medium text-info-soft-foreground shrink-0 ml-3">$45K (9%)</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-info" />
                <p className="text-sm font-medium text-foreground truncate">Pharmacy</p>
              </div>
              <span className="rounded-md bg-info-soft px-2 py-0.5 text-xs font-medium text-info-soft-foreground shrink-0 ml-3">$18K (4%)</span>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Quarterly Trend" description="Net revenue ($K)">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Q1-25</p>
                <p className="text-sm font-semibold text-foreground">520</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "75%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Q2-25</p>
                <p className="text-sm font-semibold text-foreground">580</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "84%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Q3-25</p>
                <p className="text-sm font-semibold text-foreground">612</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "89%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Q4-25</p>
                <p className="text-sm font-semibold text-foreground">645</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: "94%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-foreground">Q1-26</p>
                <p className="text-sm font-semibold text-foreground">689</p>
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
