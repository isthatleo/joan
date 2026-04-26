"use client";

import { PageHeader, StatCard, SectionCard } from "@/components/ui";
import { AlertTriangle, Bell, Clock, Package } from "lucide-react";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Stock Alerts"
        subtitle="Low stock, expiring items, and reorder triggers"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Low Stock" value="12" subtitle="Below reorder point" icon={Package} tone="warning" />
        <StatCard title="Out of Stock" value="3" subtitle="Zero on hand" icon={AlertTriangle} tone="destructive" />
        <StatCard title="Expiring Soon" value="18" subtitle="Within 30 days" icon={Clock} tone="warning" />
        <StatCard title="Active Alerts" value="33" subtitle="Total triggered" icon={Bell} tone="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Critical Stock Alerts" description="Action required">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
                <p className="text-sm font-medium text-foreground truncate">Insulin Glargine — 3 units left</p>
              </div>
              <span className="rounded-md bg-destructive-soft px-2 py-0.5 text-xs font-medium text-destructive-soft-foreground shrink-0 ml-3">Reorder now</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-medium text-foreground truncate">Amoxicillin 500mg — 12 units</p>
              </div>
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground shrink-0 ml-3">Below threshold</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
                <p className="text-sm font-medium text-foreground truncate">EpiPen — 0 units</p>
              </div>
              <span className="rounded-md bg-destructive-soft px-2 py-0.5 text-xs font-medium text-destructive-soft-foreground shrink-0 ml-3">OUT OF STOCK</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-medium text-foreground truncate">Albuterol Inhaler — 8 units</p>
              </div>
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground shrink-0 ml-3">Below threshold</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-medium text-foreground truncate">Lisinopril 10mg — 25 units</p>
              </div>
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground shrink-0 ml-3">Reorder soon</span>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Expiring Soon" description="Within 30 days">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-medium text-foreground truncate">Cephalexin 500mg — 14 days</p>
              </div>
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground shrink-0 ml-3">120 units</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-medium text-foreground truncate">Prednisone 20mg — 21 days</p>
              </div>
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground shrink-0 ml-3">84 units</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-info" />
                <p className="text-sm font-medium text-foreground truncate">Ondansetron — 28 days</p>
              </div>
              <span className="rounded-md bg-info-soft px-2 py-0.5 text-xs font-medium text-info-soft-foreground shrink-0 ml-3">45 units</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-medium text-foreground truncate">Hydrocodone — 18 days</p>
              </div>
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground shrink-0 ml-3">32 units</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
