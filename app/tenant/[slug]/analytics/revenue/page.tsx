"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { BarChart3, CalendarClock, CheckCircle, Download, FileText, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { exportElementAsJpeg, exportElementAsPdf, exportElementAsPng } from "@/lib/export/page-export";

type RevenuePayload = {
  templates: Array<{ key: string; name: string; category: string; description: string; defaultFormat: string; isCustom?: boolean }>;
  totalRevenue: number;
  netRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  averageTransaction: number;
  transactions: number;
  outstandingInvoices: number;
  collectionRate: number;
  totalExpenses: number;
  claims: { total: number; approved: number; claimed: number; approvedAmount: number; approvalRate: number };
  monthlyTrends: Array<{ month: string; revenue: number; transactions: number; growth: number }>;
  paymentMethods: Array<{ method: string; amount: number; count: number; percentage: number }>;
  topServices: Array<{ name: string; revenue: number; patients: number; percentage: number; avgRevenuePerPatient: number }>;
  departmentRevenue: Array<{ department: string; revenue: number; patients: number; avgRevenuePerPatient: number }>;
  aging: { current: number; days1To30: number; over30: number; overdueAmount: number };
};

const EMPTY: RevenuePayload = { templates: [], totalRevenue: 0, netRevenue: 0, monthlyRevenue: 0, revenueGrowth: 0, averageTransaction: 0, transactions: 0, outstandingInvoices: 0, collectionRate: 0, totalExpenses: 0, claims: { total: 0, approved: 0, claimed: 0, approvedAmount: 0, approvalRate: 0 }, monthlyTrends: [], paymentMethods: [], topServices: [], departmentRevenue: [], aging: { current: 0, days1To30: 0, over30: 0, overdueAmount: 0 } };

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return text.includes(",") || text.includes('"') || text.includes("\n") ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function RevenueReportsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<RevenuePayload>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("12m");
  const [activeTab, setActiveTab] = useState<"overview" | "templates" | "services" | "payments" | "schedule">("overview");
  const [selectedTemplate, setSelectedTemplate] = useState("executive-revenue-summary");
  const [format, setFormat] = useState<"pdf" | "png" | "jpg">("pdf");
  const [frequency, setFrequency] = useState("monthly");
  const [customTemplate, setCustomTemplate] = useState({ name: "", category: "Custom", description: "", frequency: "monthly", defaultFormat: "pdf" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch(`/api/tenant/${slug}/analytics/revenue?timeRange=${timeRange}`, { cache: "no-store" });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Failed to load revenue reports");
      setData({ ...EMPTY, ...payload });
      if (!selectedTemplate && payload?.templates?.[0]?.key) setSelectedTemplate(payload.templates[0].key);
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load revenue reports");
      setData(EMPTY);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (slug) load();
  }, [slug, timeRange]);

  const exportCsv = () => {
    const rows = [["Month", "Revenue", "Transactions", "Growth"], ...data.monthlyTrends.map((row) => [row.month, row.revenue, row.transactions, row.growth])];
    const blob = new Blob([rows.map((row) => row.map(csvEscape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `revenue-report-${slug}-${timeRange}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportVisual = async (requestedFormat = format) => {
    if (!reportRef.current) return;
    setBusy(requestedFormat);
    try {
      const filename = `revenue-report-${slug}-${selectedTemplate}.${requestedFormat}`;
      if (requestedFormat === "pdf") await exportElementAsPdf(reportRef.current, filename);
      if (requestedFormat === "png") await exportElementAsPng(reportRef.current, filename);
      if (requestedFormat === "jpg") await exportElementAsJpeg(reportRef.current, filename);
    } finally {
      setBusy("");
    }
  };

  const generateReport = async (templateKey = selectedTemplate) => {
    setBusy(templateKey);
    setNotice("");
    setError("");
    try {
      const res = await fetch(`/api/tenant/${slug}/analytics/revenue`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generate", templateKey, range: timeRange, format }) });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Failed to generate report");
      setSelectedTemplate(templateKey);
      setNotice("Report generated from live data. Use PDF/PNG/JPG to download the formatted report.");
    } catch (generateError: any) {
      setError(generateError?.message || "Failed to generate report");
    } finally {
      setBusy("");
    }
  };

  const scheduleReport = async () => {
    setBusy("schedule");
    setNotice("");
    setError("");
    try {
      const nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(`/api/tenant/${slug}/analytics/revenue`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "schedule", templateKey: selectedTemplate, range: timeRange, format, frequency, nextRun }) });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Failed to schedule report");
      setNotice("Report scheduled. The schedule stores the template and range, so it will use fresh data when generated.");
    } catch (scheduleError: any) {
      setError(scheduleError?.message || "Failed to schedule report");
    } finally {
      setBusy("");
    }
  };

  const saveCustomTemplate = async () => {
    setBusy("custom-template");
    setNotice("");
    setError("");
    try {
      const res = await fetch(`/api/tenant/${slug}/analytics/revenue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_template",
          ...customTemplate,
          sections: ["executive-summary", "monthly-trends", "payment-methods", "claims", "collections-aging"],
          metrics: ["totalRevenue", "netRevenue", "collectionRate", "claims", "outstandingInvoices"],
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Failed to save custom template");
      setNotice("Custom report template saved.");
      setCustomTemplate({ name: "", category: "Custom", description: "", frequency: "monthly", defaultFormat: "pdf" });
      await load(true);
      if (payload?.template?.key) setSelectedTemplate(payload.template.key);
    } catch (saveError: any) {
      setError(saveError?.message || "Failed to save custom template");
    } finally {
      setBusy("");
    }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Reports</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Revenue Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Generate, export, and schedule formatted revenue reports from current tenant data.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={timeRange} onChange={(event) => setTimeRange(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="3m">Last 3 months</option><option value="6m">Last 6 months</option><option value="12m">Last 12 months</option><option value="1y">Last year</option></select>
          <select value={format} onChange={(event) => setFormat(event.target.value as any)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="pdf">PDF</option><option value="png">PNG</option><option value="jpg">JPG</option></select>
          <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"><RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"><Download className="size-4" />CSV</button>
          <button onClick={() => exportVisual()} disabled={!!busy} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><Download className="size-4" />Download {format.toUpperCase()}</button>
        </div>
      </div>

      {(error || notice) && <div className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>{error || notice}</div>}

      <div className="flex flex-wrap gap-2">
        {["overview", "templates", "services", "payments", "schedule"].map((tab) => <button key={tab} onClick={() => setActiveTab(tab as any)} className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${activeTab === tab ? "bg-orange-500 text-white" : "border border-border hover:bg-muted"}`}>{tab}</button>)}
      </div>

      <div ref={reportRef} className="space-y-6 rounded-2xl bg-background p-1">
        <div className="grid gap-4 md:grid-cols-4">
          {[{ label: "Total Revenue", value: money(data.totalRevenue), icon: TrendingUp }, { label: "Net Revenue", value: money(data.netRevenue), icon: BarChart3 }, { label: "Collection Rate", value: `${data.collectionRate}%`, icon: CheckCircle }, { label: "Outstanding", value: money(data.outstandingInvoices), icon: FileText }].map((card) => <div key={card.label} className="rounded-xl border border-border bg-card p-5"><card.icon className="mb-3 size-6 text-orange-500" /><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{card.label}</p><p className="mt-2 text-2xl font-bold">{card.value}</p></div>)}
        </div>

        {activeTab === "overview" && <div className="grid gap-6 xl:grid-cols-2"><Panel title="Monthly Revenue">{data.monthlyTrends.map((row) => <Row key={row.month} left={`${row.month} - ${row.transactions} txns`} right={`${money(row.revenue)} (${row.growth}%)`} />)}</Panel><Panel title="Claims and Collections"><Row left="Claim approval rate" right={`${data.claims.approvalRate}%`} /><Row left="Claimed amount" right={money(data.claims.claimed)} /><Row left="Approved claim amount" right={money(data.claims.approvedAmount)} /><Row left="Overdue amount" right={money(data.aging.overdueAmount)} /></Panel></div>}
        {activeTab === "services" && <Panel title="Revenue by Service">{data.topServices.map((item) => <Row key={item.name} left={`${item.name} - ${item.patients} patients`} right={`${money(item.revenue)} (${item.percentage}%)`} />)}</Panel>}
        {activeTab === "payments" && <Panel title="Payment Method Breakdown">{data.paymentMethods.map((item) => <Row key={item.method} left={`${item.method} - ${item.count} payments`} right={`${money(item.amount)} (${item.percentage}%)`} />)}</Panel>}
        {activeTab === "templates" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-orange-300 bg-orange-50/40 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-orange-700">Custom template</p>
              <h3 className="mt-2 font-semibold">Create a custom report template</h3>
              <div className="mt-4 space-y-3">
                <input value={customTemplate.name} onChange={(event) => setCustomTemplate((current) => ({ ...current, name: event.target.value }))} placeholder="Template name" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange-300" />
                <input value={customTemplate.category} onChange={(event) => setCustomTemplate((current) => ({ ...current, category: event.target.value }))} placeholder="Category" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange-300" />
                <textarea value={customTemplate.description} onChange={(event) => setCustomTemplate((current) => ({ ...current, description: event.target.value }))} placeholder="What should this report include?" className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange-300" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={customTemplate.frequency} onChange={(event) => setCustomTemplate((current) => ({ ...current, frequency: event.target.value }))} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select>
                  <select value={customTemplate.defaultFormat} onChange={(event) => setCustomTemplate((current) => ({ ...current, defaultFormat: event.target.value }))} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="pdf">PDF</option><option value="png">PNG</option><option value="jpg">JPG</option></select>
                </div>
                <button onClick={saveCustomTemplate} disabled={busy === "custom-template" || !customTemplate.name.trim()} className="w-full rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Save custom template</button>
              </div>
            </div>
            {data.templates.map((template) => <div key={template.key} className={`rounded-xl border p-5 ${selectedTemplate === template.key ? "border-orange-300 bg-orange-50/40" : "border-border bg-card"}`}><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{template.category}{template.isCustom ? " - Custom" : ""}</p><h3 className="mt-2 font-semibold">{template.name}</h3><p className="mt-2 text-sm text-muted-foreground">{template.description}</p><button onClick={() => generateReport(template.key)} disabled={!!busy} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"><FileText className="size-4" />Generate</button></div>)}
          </div>
        )}
        {activeTab === "schedule" && <div className="rounded-xl border border-border bg-card p-5"><h2 className="flex items-center gap-2 font-semibold"><CalendarClock className="size-5 text-orange-500" />Schedule Report</h2><div className="mt-4 grid gap-3 md:grid-cols-3"><select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">{data.templates.map((template) => <option key={template.key} value={template.key}>{template.name}</option>)}</select><select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select><button onClick={scheduleReport} disabled={!!busy} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Schedule live-data report</button></div><p className="mt-3 text-sm text-muted-foreground">Scheduled reports store template, range, and format only. When the scheduler generates the report, it queries fresh data for the selected period.</p></div>}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">{title}</h2><div className="mt-4 space-y-3">{children}</div></div>;
}

function Row({ left, right }: { left: string; right: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-3 py-2 text-sm"><span>{left}</span><span className="font-semibold">{right}</span></div>;
}
