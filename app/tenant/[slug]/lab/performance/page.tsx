"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { withTenantPrefix } from "@/lib/tenant-routing";
import { Activity, ArrowLeft, CheckCircle2, Loader2, RefreshCw, TrendingUp } from "lucide-react";

export default function LabPerformancePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const path = (value: string) => withTenantPrefix(value, slug, hostname);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (soft = false) => {
    soft ? setRefreshing(true) : setLoading(true);
    try {
      const res = await fetch(`/api/lab/performance?slug=${slug}`, { cache: "no-store" });
      setData(res.ok ? await res.json() : null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [slug]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><Link href={path("/lab")} className="mb-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link><h1 className="text-3xl font-bold text-foreground">Performance</h1><p className="mt-1 text-sm text-muted-foreground">Operational health derived from throughput, completion, inventory, and QC signals.</p></div><button onClick={() => load(true)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button></div>
      {loading ? <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : <>
        <div className="grid gap-4 md:grid-cols-4">{[["Health", data?.systemHealth], ["Uptime", data?.uptime], ["Completion Rate", `${data?.completionRate || 0}%`], ["Avg Response", `${data?.apiResponseTime || 0}ms`]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold capitalize text-foreground">{value || "-"}</p></div>)}</div>
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-border bg-card p-5"><div className="mb-4 flex items-center gap-2 font-semibold text-foreground"><Activity className="h-5 w-5 text-primary" />Throughput</div><div className="space-y-3 text-sm"><div className="flex justify-between rounded-lg border border-border bg-background px-4 py-3"><span>Today</span><span>{data?.throughput?.today || 0}</span></div><div className="flex justify-between rounded-lg border border-border bg-background px-4 py-3"><span>Week</span><span>{data?.throughput?.week || 0}</span></div><div className="flex justify-between rounded-lg border border-border bg-background px-4 py-3"><span>Month</span><span>{data?.throughput?.month || 0}</span></div></div></section>
          <section className="rounded-2xl border border-border bg-card p-5"><div className="mb-4 flex items-center gap-2 font-semibold text-foreground"><TrendingUp className="h-5 w-5 text-primary" />Core Metrics</div><div className="space-y-3 text-sm"><div className="flex justify-between rounded-lg border border-border bg-background px-4 py-3"><span>Turnaround</span><span>{data?.averageTurnaroundHours || 0}h</span></div><div className="flex justify-between rounded-lg border border-border bg-background px-4 py-3"><span>Queue Pressure</span><span>{data?.queuePressure || 0}</span></div><div className="flex justify-between rounded-lg border border-border bg-background px-4 py-3"><span>Recent Results</span><span>{data?.recentResults || 0}</span></div></div></section>
          <section className="rounded-2xl border border-border bg-card p-5"><div className="mb-4 flex items-center gap-2 font-semibold text-foreground"><CheckCircle2 className="h-5 w-5 text-primary" />Quality Signals</div><div className="space-y-3 text-sm"><div className="flex justify-between rounded-lg border border-border bg-background px-4 py-3"><span>QC Pass Rate</span><span>{data?.qcPassRate || 0}%</span></div><div className="flex justify-between rounded-lg border border-border bg-background px-4 py-3"><span>Inventory Coverage</span><span>{data?.inventoryCoverage || 0}%</span></div><div className="flex justify-between rounded-lg border border-border bg-background px-4 py-3"><span>Active Users</span><span>{data?.activeUsers || 0}</span></div></div></section>
        </div>
      </>}
    </div>
  );
}
