"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardGreeting } from "@/components/DashboardGreeting";
import { withTenantPrefix } from "@/lib/tenant-routing";
import { AlertCircle, ArrowRight, BarChart3, Boxes, CheckCircle2, ClipboardList, FlaskConical, Loader2, Microscope, RefreshCw, TestTube, TrendingUp, Upload } from "lucide-react";

export default function LabPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const path = (value: string) => withTenantPrefix(value, slug, hostname);
  const [data, setData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (soft = false) => {
    soft ? setRefreshing(true) : setLoading(true);
    try {
      const [dashboardRes, statsRes] = await Promise.all([
        fetch(`/api/lab/dashboard?slug=${slug}`, { cache: "no-store" }),
        fetch(`/api/lab/stats?slug=${slug}`, { cache: "no-store" }),
      ]);
      const dashboard = dashboardRes.ok ? await dashboardRes.json() : null;
      const liveStats = statsRes.ok ? await statsRes.json() : null;
      setData(dashboard);
      setStats(liveStats?.stats || null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [slug]);

  const metrics = data?.metrics || {};
  const orders = data?.recentOrders || [];
  const catalog = data?.testCatalog || [];
  const alerts = data?.notifications || [];

  const kpis = useMemo(() => [
    { label: "Total Orders", value: metrics.totalOrders || 0, icon: TestTube, tone: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
    { label: "Pending Work", value: (metrics.pendingOrders || 0) + (metrics.inProgressOrders || 0), icon: ClipboardList, tone: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
    { label: "Completed Today", value: metrics.completedToday || 0, icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Critical Results", value: metrics.criticalResults || 0, icon: AlertCircle, tone: "text-rose-600 bg-rose-50 dark:bg-rose-950/30" },
    { label: "Low Stock", value: metrics.lowStock || 0, icon: Boxes, tone: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" },
  ], [metrics]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <DashboardGreeting roleLabel="Lab" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Laboratory Operations</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Lab Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Orders, result publication, supply coverage, and performance checkpoints.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => load(true)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link href={path("/lab/lab-results/upload")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95">
            <Upload className="h-4 w-4" />
            Upload Result
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card p-4">
            <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${item.tone}`}><item.icon className="h-5 w-5" /></div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Lab Orders</h2>
              <p className="text-sm text-muted-foreground">Current worklist with direct routing into details and result entry.</p>
            </div>
            <Link href={path("/lab/lab-orders")} className="text-sm font-medium text-primary hover:underline">Open registry</Link>
          </div>
          <div className="space-y-3">
            {orders.length === 0 ? <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No lab orders yet.</p> : orders.map((order: any) => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
                <div>
                  <p className="font-medium text-foreground">{order.testType}</p>
                  <p className="text-sm text-muted-foreground">{order.patientName || "Unknown patient"} • {order.priority || "routine"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{String(order.status || "pending").replace(/-/g, " ")}</span>
                  <Link href={path(`/lab/lab-orders/${order.id}`)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                    View
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Test Catalog</h2>
              <p className="text-sm text-muted-foreground">Common tests seen in this tenant.</p>
            </div>
            <Link href={path("/lab/lab-orders")} className="text-sm font-medium text-primary hover:underline">Create order</Link>
          </div>
          <div className="space-y-3">
            {catalog.length === 0 ? <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No catalog data yet.</p> : catalog.map((test: any) => (
              <div key={test.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{test.name}</p>
                    <p className="text-sm text-muted-foreground">{test.code} • {test.category}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{test.turnaroundTime}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Used {test.usageCount || 0} times</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Analytics Snapshot</h2>
              <p className="text-sm text-muted-foreground">Operational metrics sourced from live orders, results, and payments.</p>
            </div>
            <Link href={path("/lab/lab-analytics")} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
              <BarChart3 className="h-4 w-4" />
              Open Analytics
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-background p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Completion Rate</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{data?.analytics?.completedRate || 0}%</p>
            </div>
            <div className="rounded-xl bg-background p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Avg Turnaround</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{metrics.averageTurnaroundHours || stats?.averageTurnaround || 0}h</p>
            </div>
            <div className="rounded-xl bg-background p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lab Revenue</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">${Number(stats?.revenue || 0).toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Link href={path("/lab/lab-results")} className="rounded-xl border border-border bg-background p-4 hover:bg-muted/50">
              <Microscope className="mb-2 h-5 w-5 text-primary" />
              <p className="font-medium text-foreground">Results workbench</p>
              <p className="text-sm text-muted-foreground">Review published findings and attachments.</p>
            </Link>
            <Link href={path("/lab/lab-inventory")} className="rounded-xl border border-border bg-background p-4 hover:bg-muted/50">
              <Boxes className="mb-2 h-5 w-5 text-primary" />
              <p className="font-medium text-foreground">Inventory board</p>
              <p className="text-sm text-muted-foreground">Low-stock and expiry coverage from live stock data.</p>
            </Link>
            <Link href={path("/lab/performance")} className="rounded-xl border border-border bg-background p-4 hover:bg-muted/50">
              <TrendingUp className="mb-2 h-5 w-5 text-primary" />
              <p className="font-medium text-foreground">Performance</p>
              <p className="text-sm text-muted-foreground">Throughput, QC pass rate, and queue pressure.</p>
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">Alerts</h2>
          <p className="mb-4 text-sm text-muted-foreground">Unread notifications for the active technician.</p>
          <div className="space-y-3">
            {alerts.length === 0 ? <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No unread alerts.</p> : alerts.map((alert: any) => (
              <div key={alert.id} className="rounded-xl border border-border bg-background p-4">
                <p className="font-medium text-foreground">{alert.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
