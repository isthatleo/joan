"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Loader2, RefreshCw } from "lucide-react";

type AnalyticsPayload = { summary: { totalPrescriptions: number; filledPrescriptions: number; inventoryValue: number; lowStockItems: number; openAlerts: number; activeInteractionRisks: number; activeSuppliers: number }; trends: { labels: string[]; dispensed: number[]; revenue: number[] }; topMedications: Array<{ name: string; quantity: number }>; categoryMix: Record<string, number> };

export default function PharmacyAnalyticsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchAnalytics = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch(`/api/tenant/${slug}/pharmacy/analytics`, { cache: "no-store" });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Failed to load analytics");
      setData(payload);
    } catch (analyticsError: any) {
      setError(analyticsError?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { if (slug) fetchAnalytics(); }, [slug]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [["Metric", "Value"], ...Object.entries(data.summary).map(([key, value]) => [key, String(value)])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "pharmacy-analytics.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const categoryEntries = useMemo(() => Object.entries(data?.categoryMix || {}), [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Analytics</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Pharmacy Analytics</h1>
          <p className="mt-2 text-sm text-muted-foreground">Operational and clinical performance signals across dispensing, stock, and medication demand.</p>
        </div>
        <div className="flex gap-2"><button onClick={() => fetchAnalytics(true)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"><Download className="h-4 w-4" />Export CSV</button></div>
      </div>
      {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
        {Object.entries(data?.summary || {}).map(([label, value]) => <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label.replace(/([A-Z])/g, " $1")}</p><p className="mt-3 text-2xl font-semibold text-foreground">{typeof value === "number" && label.toLowerCase().includes("value") ? `$${value.toFixed(2)}` : value}</p></div>)}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 className="text-lg font-semibold text-foreground">Dispensing Trend</h2><div className="mt-4 space-y-3">{loading ? <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></div> : data?.trends.labels.map((label, index) => <div key={label} className="rounded-xl border border-border bg-background p-4"><div className="flex items-center justify-between"><span className="text-sm font-medium text-foreground">{label}</span><span className="text-xs text-muted-foreground">{data.trends.dispensed[index]} dispensed / ${data.trends.revenue[index].toFixed(2)}</span></div></div>)}</div></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 className="text-lg font-semibold text-foreground">Medication Demand</h2><div className="mt-4 space-y-3">{loading ? <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></div> : data?.topMedications.map((item) => <div key={item.name} className="rounded-xl border border-border bg-background p-4"><div className="flex items-center justify-between"><span className="text-sm font-medium text-foreground">{item.name}</span><span className="text-xs text-muted-foreground">{item.quantity} units</span></div></div>)}</div></div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 className="text-lg font-semibold text-foreground">Inventory Category Mix</h2><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{categoryEntries.map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-background p-4"><p className="text-sm font-medium text-foreground">{label}</p><p className="mt-2 text-xs text-muted-foreground">{value} stocked items</p></div>)}</div></div>
    </div>
  );
}
