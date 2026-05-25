"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2, Printer, RefreshCw } from "lucide-react";

type ReportsPayload = { templates: Array<{ id: string; name: string; description: string }>; recentRuns: Array<{ id: string; title: string; format: string; generatedAt: string; generatedBy: string }>; preview: { prescriptions: Array<{ id: string; patientName: string; status: string }>; inventory: Array<{ id: string; name: string; status: string; stock: number }>; analytics: any } };

export default function PharmacyReportsPage() {
  const [data, setData] = useState<ReportsPayload | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("dispensing-summary");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchReports = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch("/api/pharmacy/reports", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load reports");
      setData(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const template = useMemo(() => data?.templates.find((item) => item.id === selectedTemplate) || data?.templates[0] || null, [data, selectedTemplate]);

  const generate = async (format: string) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/pharmacy/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template: selectedTemplate, format }) });
      const payload = await res.json();
      const printable = `<!doctype html><html><head><title>${payload.template.name}</title><style>body{font-family:Arial,sans-serif;padding:24px}h1{margin-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:8px;border:1px solid #ddd;text-align:left}</style></head><body><h1>${payload.template.name}</h1><p>${payload.template.description}</p><table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${Object.entries(payload.analytics.summary).map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</tbody></table></body></html>`;
      if (format === "print" || format === "pdf") {
        const win = window.open("", "_blank", "width=1100,height=800");
        if (win) { win.document.write(printable); win.document.close(); win.focus(); win.print(); }
      } else {
        const blob = new Blob([printable], { type: "text/html" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${payload.template.id}.html`;
        link.click();
        URL.revokeObjectURL(link.href);
      }
      await fetchReports(true);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Reporting</p><h1 className="mt-1 text-3xl font-semibold text-foreground">Pharmacy Reports</h1><p className="mt-2 text-sm text-muted-foreground">Generate printable operational reports without sidebar or dashboard chrome.</p></div>
        <button onClick={() => fetchReports(true)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm"><p className="text-sm font-semibold text-foreground">Report Templates</p><div className="mt-3 space-y-2">{data?.templates.map((item) => <button key={item.id} onClick={() => setSelectedTemplate(item.id)} className={`w-full rounded-xl border px-4 py-3 text-left transition ${selectedTemplate === item.id ? "border-primary/40 bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}><p className="text-sm font-medium">{item.name}</p><p className="mt-1 text-xs">{item.description}</p></button>)}</div></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          {loading ? <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></div> : template ? <><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold text-foreground">{template.name}</h2></div><p className="mt-1 text-sm text-muted-foreground">{template.description}</p></div><div className="flex flex-wrap gap-2"><button disabled={generating} onClick={() => generate("print")} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground"><Printer className="h-4 w-4" />Print</button><button disabled={generating} onClick={() => generate("pdf")} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground"><Download className="h-4 w-4" />PDF</button><button disabled={generating} onClick={() => generate("html")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{generating ? "Generating..." : "Export"}</button></div></div><div className="mt-5 grid gap-6 lg:grid-cols-2"><div className="rounded-xl border border-border bg-background p-4"><p className="text-sm font-medium text-foreground">Recent prescriptions</p><div className="mt-3 space-y-2">{data?.preview.prescriptions.map((item) => <div key={item.id} className="flex items-center justify-between text-xs text-muted-foreground"><span>{item.patientName}</span><span>{item.status}</span></div>)}</div></div><div className="rounded-xl border border-border bg-background p-4"><p className="text-sm font-medium text-foreground">Inventory snapshot</p><div className="mt-3 space-y-2">{data?.preview.inventory.map((item) => <div key={item.id} className="flex items-center justify-between text-xs text-muted-foreground"><span>{item.name}</span><span>{item.stock} / {item.status}</span></div>)}</div></div></div></> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 className="text-lg font-semibold text-foreground">Recent report runs</h2><div className="mt-4 space-y-3">{data?.recentRuns.length ? data.recentRuns.map((run) => <div key={run.id} className="rounded-xl border border-border bg-background p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-medium text-foreground">{run.title}</p><p className="text-xs text-muted-foreground">{new Date(run.generatedAt).toLocaleString()} - {run.generatedBy}</p></div><span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">{run.format}</span></div></div>) : <p className="text-sm text-muted-foreground">No report runs recorded yet.</p>}</div></div>
    </div>
  );
}
