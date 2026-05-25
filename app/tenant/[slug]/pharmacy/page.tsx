"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, Bell, Boxes, ClipboardList, FileText, Loader2, Package2, Pill, RefreshCw, ShieldAlert, Truck } from "lucide-react";
import { DashboardGreeting } from "@/components/DashboardGreeting";
import { useTenantPath } from "@/hooks/useTenantPath";

type DashboardPayload = {
  metrics: {
    pendingPrescriptions: number;
    dispensingNow: number;
    filledToday: number;
    lowStockItems: number;
    outOfStockItems: number;
    inventoryValue: number;
    activeSuppliers: number;
    openAlerts: number;
    interactionRisks: number;
  };
  inventory: Array<{ id: string; name: string; category: string; stock: number; minStock: number; status: string; supplier: string }>;
  prescriptions: Array<{ id: string; patientName: string; doctorName: string; status: string; priority: string; medications: Array<{ name: string }> }>;
  alerts: Array<{ id: string; medicationName: string; severity: string; status: string; type: string }>;
  notifications: Array<{ id: string; title: string; message: string; createdAt: string; type: string }>;
  analytics: { totalPrescriptions: number; filledPrescriptions: number; inventoryValue: number; lowStockItems: number; openAlerts: number; activeInteractionRisks: number; activeSuppliers: number };
  topMedications: Array<{ name: string; quantity: number }>;
  trend: { labels: string[]; dispensed: number[]; revenue: number[] };
};

const toneMap: Record<string, string> = {
  critical: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  high: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  medium: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
};

export default function PharmacyDashboardPage() {
  const toTenantPath = useTenantPath();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch("/api/pharmacy/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load dashboard");
      setData(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const quickActions = useMemo(
    () => [
      { label: "Review Prescriptions", href: "/pharmacy/prescriptions", icon: Pill },
      { label: "Open Dispensing", href: "/pharmacy/dispensing", icon: ClipboardList },
      { label: "Manage Inventory", href: "/pharmacy/pharmacy-inventory", icon: Boxes },
      { label: "Track Alerts", href: "/pharmacy/pharmacy-inventory/alerts", icon: AlertTriangle },
      { label: "Supplier Directory", href: "/pharmacy/pharmacy/suppliers", icon: Truck },
      { label: "Reports", href: "/pharmacy/analytics/pharmacy", icon: FileText },
    ],
    []
  );

  if (loading && !data) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <DashboardGreeting roleLabel="Pharmacist" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Pharmacy Operations</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Pharmacist Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Live inventory exposure, dispensing throughput, medication safety, and supplier readiness in one workspace.
          </p>
        </div>
        <button
          onClick={() => fetchDashboard(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Pending Prescriptions", value: data?.metrics.pendingPrescriptions ?? 0, icon: Pill, helper: "Awaiting pharmacist action" },
          { label: "Dispensing Now", value: data?.metrics.dispensingNow ?? 0, icon: ClipboardList, helper: "Currently in fulfilment" },
          { label: "Filled Today", value: data?.metrics.filledToday ?? 0, icon: Package2, helper: "Completed today" },
          { label: "Open Alerts", value: data?.metrics.openAlerts ?? 0, icon: AlertTriangle, helper: "Low stock / expiry" },
          { label: "Inventory Value", value: `$${(data?.metrics.inventoryValue ?? 0).toFixed(2)}`, icon: Activity, helper: "Tracked stock value" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{card.label}</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{card.value}</p>
                <p className="mt-2 text-xs text-muted-foreground">{card.helper}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-3 text-primary">
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
                <p className="text-sm text-muted-foreground">Operational shortcuts for the core pharmacy flows.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {quickActions.map((action) => (
                <Link key={action.href} href={toTenantPath(action.href)} className="group rounded-xl border border-border bg-background p-4 transition hover:border-primary/40 hover:bg-muted/40">
                  <div className="flex items-center justify-between gap-3">
                    <div className="rounded-lg border border-border p-2 text-primary">
                      <action.icon className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-foreground">{action.label}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Prescription Queue</h2>
                <p className="text-sm text-muted-foreground">Most recent orders arriving into the pharmacy worklist.</p>
              </div>
              <Link href={toTenantPath("/pharmacy/prescriptions")} className="text-sm font-medium text-primary hover:underline">Open queue</Link>
            </div>
            <div className="mt-4 space-y-3">
              {data?.prescriptions.length ? data.prescriptions.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
                  <div>
                    <p className="font-medium text-foreground">{item.patientName}</p>
                    <p className="text-xs text-muted-foreground">{item.doctorName} - {item.medications.map((med) => med.name).slice(0, 2).join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">{item.status}</span>
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">{item.priority}</span>
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">No prescriptions in queue.</p>}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Inventory Watchlist</h2>
              <p className="text-sm text-muted-foreground">Fast view of the medications closest to service impact.</p>
              <div className="mt-4 space-y-3">
                {data?.inventory.length ? data.inventory.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category} - supplier: {item.supplier}</p>
                      </div>
                      <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">{item.status}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Stock {item.stock}</span>
                      <span>Min {item.minStock}</span>
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No inventory records available.</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Safety and Throughput</h2>
              <p className="text-sm text-muted-foreground">Signals that need pharmacist review before delays propagate.</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Interaction risks</span>
                    <span className="text-lg font-semibold text-foreground">{data?.metrics.interactionRisks ?? 0}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Configured interaction rules currently matching active medication queues.</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Active suppliers</span>
                    <span className="text-lg font-semibold text-foreground">{data?.metrics.activeSuppliers ?? 0}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Suppliers currently available for replenishment and procurement follow-up.</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Out of stock</span>
                    <span className="text-lg font-semibold text-foreground">{data?.metrics.outOfStockItems ?? 0}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Immediate service-impacting shortages across current inventory.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Alert Feed</h2>
            </div>
            <div className="mt-4 space-y-3">
              {data?.alerts.length ? data.alerts.map((alert) => (
                <div key={alert.id} className={`rounded-xl border p-4 ${toneMap[alert.severity] || "border-border bg-background text-foreground"}`}>
                  <p className="text-sm font-medium">{alert.medicationName}</p>
                  <p className="mt-1 text-xs opacity-80">{alert.type} - {alert.status}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">No active inventory alerts.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Top Medications</h2>
            </div>
            <div className="mt-4 space-y-3">
              {data?.topMedications.length ? data.topMedications.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.quantity} units ordered</span>
                </div>
              )) : <p className="text-sm text-muted-foreground">No medication volume data yet.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
            </div>
            <div className="mt-4 space-y-3">
              {data?.notifications.length ? data.notifications.map((note) => (
                <div key={note.id} className="rounded-xl border border-border bg-background p-4">
                  <p className="text-sm font-medium text-foreground">{note.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{note.message}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">No unread notifications.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
