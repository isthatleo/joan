"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { withTenantPrefix } from "@/lib/tenant-routing";
import { ArrowLeft, BarChart3, Download, Loader2, RefreshCw, TrendingUp } from "lucide-react";

export default function LabAnalyticsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const path = (value: string) => withTenantPrefix(value, slug, hostname);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (soft = false) => {
    soft ? setRefreshing(true) : setLoading(true);
    try {
      const res = await fetch(`/api/lab/analytics?slug=${slug}`, { cache: "no-store" });
      setAnalytics(res.ok ? await res.json() : null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [slug]);

  const exportCsv = () => {
    if (!analytics) return;
    const rows = [["metric", "value"], ["totalOrders", analytics.totalOrders], ["completedOrders", analytics.completedOrders], ["pendingOrders", analytics.pendingOrders], ["inProgressOrders", analytics.inProgressOrders], ["criticalResults", analytics.criticalResults], ["averageTurnaroundTime", analytics.averageTurnaroundTime], ["qcPassRate", analytics.qcPassRate], ["lowStock", analytics.lowStock]];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "lab-analytics.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const categoryRows = useMemo(() => Object.entries(analytics?.testsByCategory || {}), [analytics]);
  const priorityRows = useMemo(() => Object.entries(analytics?.ordersByPriority || {}), [analytics]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><Link href={path("/lab")} className="mb-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link><h1 className="text-3xl font-bold text-foreground">Analytics</h1><p className="mt-1 text-sm text-muted-foreground">Live order mix, turnaround, QC pass rate, and stock pressure.</p></div><div className="flex gap-2"><button onClick={() => load(true)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Download className="h-4 w-4" />Export CSV</button></div></div>
      {loading ? <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : <>
        <div className="grid gap-4 md:grid-cols-5">{[["Total Orders", analytics?.totalOrders], ["Completed", analytics?.completedOrders], ["Pending", analytics?.pendingOrders], ["Turnaround", `${analytics?.averageTurnaroundTime || 0}h`], ["QC Pass Rate", `${analytics?.qcPassRate || 0}%`]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold text-foreground">{value || 0}</p></div>)}</div>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5"><div className="mb-4 flex items-center gap-2 font-semibold text-foreground"><BarChart3 className="h-5 w-5 text-primary" />Tests by Category</div><div className="space-y-3">{categoryRows.length === 0 ? <p className="text-sm text-muted-foreground">No category data yet.</p> : categoryRows.map(([name, count]) => <div key={name} className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"><span className="font-medium text-foreground">{name}</span><span className="text-muted-foreground">{String(count)}</span></div>)}</div></section>
          <section className="rounded-2xl border border-border bg-card p-5"><div className="mb-4 flex items-center gap-2 font-semibold text-foreground"><TrendingUp className="h-5 w-5 text-primary" />Orders by Priority</div><div className="space-y-3">{priorityRows.length === 0 ? <p className="text-sm text-muted-foreground">No priority data yet.</p> : priorityRows.map(([name, count]) => <div key={name} className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"><span className="font-medium text-foreground">{name}</span><span className="text-muted-foreground">{String(count)}</span></div>)}</div></section>
        </div>
        <section className="rounded-2xl border border-border bg-card p-5"><h2 className="text-lg font-semibold text-foreground">Daily Volume</h2><p className="mb-4 text-sm text-muted-foreground">Recent order traffic from the live tenant dataset.</p><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{(analytics?.dailyVolume || []).slice(-8).map((item: any) => <div key={item.date} className="rounded-xl border border-border bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{new Date(item.date).toLocaleDateString()}</p><p className="mt-2 text-2xl font-semibold text-foreground">{item.count}</p><p className="mt-1 text-sm text-muted-foreground">orders</p></div>)}</div></section>
      </>}
    </div>
  );
}
