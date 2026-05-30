"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Activity, AlertTriangle, BarChart3, CheckCircle, Download, DollarSign, FileText, Loader2, RefreshCw, Search, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { exportElementAsJpeg, exportElementAsPdf, exportElementAsPng } from "@/lib/export/page-export";

type AnalyticsPayload = {
  range: string;
  generatedAt: string;
  metrics: Record<string, number>;
  trends: Array<{ label: string; patients: number; appointments: number; revenue: number }>;
  appointmentStatus: Array<{ status: string; count: number }>;
  roleMix: Array<{ role: string; count: number }>;
  financial: Record<string, number>;
  insights: Array<{ title: string; value: string; detail: string }>;
};

const EMPTY: AnalyticsPayload = { range: "30d", generatedAt: "", metrics: {}, trends: [], appointmentStatus: [], roleMix: [], financial: {}, insights: [] };

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return text.includes(",") || text.includes('"') || text.includes("\n") ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function AnalyticsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<AnalyticsPayload>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("30d");
  const [activeTab, setActiveTab] = useState<"overview" | "patients" | "financial" | "operations" | "risk">("overview");
  const [query, setQuery] = useState("");
  const [trendPage, setTrendPage] = useState(0);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch(`/api/tenant/${slug}/analytics?timeRange=${encodeURIComponent(timeRange)}`, { cache: "no-store" });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Failed to load analytics");
      setData({ ...EMPTY, ...payload });
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load analytics");
      setData(EMPTY);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (slug) load();
  }, [slug, timeRange]);

  useEffect(() => {
    setTrendPage(0);
  }, [timeRange, data.trends.length]);

  const filteredInsights = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.insights;
    return data.insights.filter((item) => [item.title, item.value, item.detail].join(" ").toLowerCase().includes(q));
  }, [data.insights, query]);

  const trendPageSize = 7;
  const trendPageCount = Math.max(1, Math.ceil(data.trends.length / trendPageSize));
  const pagedTrends = data.trends.slice(trendPage * trendPageSize, trendPage * trendPageSize + trendPageSize);

  const exportCsv = () => {
    const rows = [
      ["Metric", "Value"],
      ...Object.entries(data.metrics).map(([key, value]) => [key, value]),
      [],
      ["Trend", "Patients", "Appointments", "Revenue"],
      ...data.trends.map((row) => [row.label, row.patients, row.appointments, row.revenue]),
    ];
    const blob = new Blob([rows.map((row) => row.map(csvEscape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hospital-analytics-${slug}-${timeRange}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportVisual = async (format: "pdf" | "png" | "jpg") => {
    if (!exportRef.current) return;
    setExporting(format);
    try {
      const filename = `hospital-analytics-${slug}-${timeRange}.${format}`;
      if (format === "pdf") await exportElementAsPdf(exportRef.current, filename);
      if (format === "png") await exportElementAsPng(exportRef.current, filename);
      if (format === "jpg") await exportElementAsJpeg(exportRef.current, filename);
    } finally {
      setExporting("");
    }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-orange-500" /></div>;

  const cards = [
    { label: "Patients", value: data.metrics.totalPatients || 0, detail: `${data.metrics.newPatients || 0} new`, icon: Users, tone: "bg-blue-50 text-blue-700", tab: "patients" },
    { label: "Revenue", value: money(data.metrics.totalRevenue || 0), detail: `${money(data.metrics.netRevenue || 0)} net`, icon: DollarSign, tone: "bg-green-50 text-green-700", tab: "financial" },
    { label: "Appointments", value: data.metrics.totalAppointments || 0, detail: `${data.metrics.completionRate || 0}% completion`, icon: Activity, tone: "bg-orange-50 text-orange-700", tab: "operations" },
    { label: "Claims", value: `${data.metrics.claimApprovalRate || 0}%`, detail: `${data.metrics.claimDenialRate || 0}% denial`, icon: FileText, tone: "bg-purple-50 text-purple-700", tab: "financial" },
    { label: "Risk Events", value: data.metrics.riskEvents || 0, detail: `${data.metrics.auditEvents || 0} audit events`, icon: ShieldCheck, tone: "bg-red-50 text-red-700", tab: "risk" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Analytics & Insights</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Hospital Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Real-time tenant analytics across clinical operations, finance, staffing, claims, and audit risk.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={timeRange} onChange={(event) => setTimeRange(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"><RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"><Download className="size-4" />CSV</button>
          <button onClick={() => exportVisual("pdf")} disabled={!!exporting} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">PDF</button>
          <button onClick={() => exportVisual("png")} disabled={!!exporting} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">PNG</button>
          <button onClick={() => exportVisual("jpg")} disabled={!!exporting} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">JPG</button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div ref={exportRef} className="space-y-6 rounded-2xl bg-background p-1">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <button key={card.label} onClick={() => setActiveTab(card.tab as any)} className="rounded-xl border border-border bg-card p-5 text-left hover:bg-muted/30">
              <div className={`mb-3 flex size-11 items-center justify-center rounded-xl ${card.tone}`}><card.icon className="size-5" /></div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
          {["overview", "patients", "financial", "operations", "risk"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${activeTab === tab ? "bg-orange-500 text-white" : "border border-border hover:bg-muted"}`}>{tab}</button>
          ))}
          <div className="relative ml-auto min-w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search insights..." className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none focus:border-orange-300" />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold"><BarChart3 className="size-5 text-orange-500" />Activity Trend</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <button onClick={() => setTrendPage((page) => Math.max(0, page - 1))} disabled={trendPage === 0} className="rounded-lg border border-border px-3 py-1 font-semibold hover:bg-muted disabled:opacity-50">Previous</button>
                <span>Page {trendPage + 1} of {trendPageCount}</span>
                <button onClick={() => setTrendPage((page) => Math.min(trendPageCount - 1, page + 1))} disabled={trendPage >= trendPageCount - 1} className="rounded-lg border border-border px-3 py-1 font-semibold hover:bg-muted disabled:opacity-50">Next</button>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {pagedTrends.map((row, index) => (
                <div key={`${row.label}-${trendPage}-${index}`} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between text-sm"><span className="font-semibold">{row.label}</span><span className="text-muted-foreground">{money(row.revenue)}</span></div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <span>{row.patients} patients</span><span>{row.appointments} appts</span><span>{money(row.revenue)} revenue</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold">Insights</h2>
              <div className="mt-4 space-y-3">
                {filteredInsights.length === 0 ? <p className="text-sm text-muted-foreground">No matching insights.</p> : filteredInsights.map((item) => (
                  <div key={item.title} className="rounded-lg border border-border bg-background p-3"><p className="font-semibold">{item.title}: {item.value}</p><p className="mt-1 text-sm text-muted-foreground">{item.detail}</p></div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold">User Role Mix</h2>
              <div className="mt-4 space-y-2">
                {data.roleMix.map((item) => <div key={item.role} className="flex justify-between rounded-lg bg-background px-3 py-2 text-sm"><span className="capitalize">{item.role.replace(/_/g, " ")}</span><span className="font-semibold">{item.count}</span></div>)}
              </div>
            </div>
          </div>
        </div>

        {activeTab === "financial" && <div className="grid gap-4 md:grid-cols-4">{Object.entries(data.financial).map(([key, value]) => <div key={key} className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</p><p className="mt-2 text-xl font-bold">{money(value)}</p></div>)}</div>}
        {activeTab === "operations" && <div className="grid gap-4 md:grid-cols-3">{data.appointmentStatus.map((item) => <div key={item.status} className="rounded-xl border border-border bg-card p-5"><p className="capitalize">{item.status || "Unknown"}</p><p className="mt-2 text-3xl font-bold">{item.count}</p></div>)}</div>}
        {activeTab === "risk" && <div className="rounded-xl border border-border bg-card p-5"><h2 className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-5 text-red-500" />Risk Summary</h2><p className="mt-3 text-sm text-muted-foreground">{data.metrics.riskEvents || 0} failed/error audit events were detected in this period. Use the audit logs page for full drill-down.</p></div>}
        {activeTab === "patients" && <div className="grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-border bg-card p-5"><p>Active Patients</p><p className="mt-2 text-3xl font-bold">{data.metrics.activePatients || 0}</p></div><div className="rounded-xl border border-border bg-card p-5"><p>New Patients</p><p className="mt-2 text-3xl font-bold">{data.metrics.newPatients || 0}</p></div><div className="rounded-xl border border-border bg-card p-5"><p>Recent Visits</p><p className="mt-2 text-3xl font-bold">{data.metrics.recentVisits || 0}</p></div></div>}
      </div>
    </div>
  );
}
