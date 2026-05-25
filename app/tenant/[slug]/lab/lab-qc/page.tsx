"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { withTenantPrefix } from "@/lib/tenant-routing";
import { ArrowLeft, Eye, Loader2, Plus, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react";

export default function LabQCPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const path = (value: string) => withTenantPrefix(value, slug, hostname);
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, pass: 0, fail: 0, review: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ testName: "", result: "", status: "pass", instrument: "", lotNumber: "", notes: "" });

  const load = async (soft = false) => {
    soft ? setRefreshing(true) : setLoading(true);
    try {
      const res = await fetch(`/api/lab/qc?slug=${slug}`, { cache: "no-store" });
      const payload = res.ok ? await res.json() : { records: [], stats: {} };
      setRecords(Array.isArray(payload?.records) ? payload.records : []);
      setStats(payload?.stats || {});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [slug]);

  const filtered = useMemo(() => records.filter((record) => {
    const q = search.toLowerCase();
    const matchesSearch = String(record.testName || "").toLowerCase().includes(q) || String(record.instrument || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || String(record.status || "") === statusFilter;
    return matchesSearch && matchesStatus;
  }), [records, search, statusFilter]);

  const saveRecord = async () => {
    const res = await fetch(`/api/lab/qc`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, slug }) });
    if (res.ok) { setOpen(false); setForm({ testName: "", result: "", status: "pass", instrument: "", lotNumber: "", notes: "" }); await load(true); }
  };
  const deleteRecord = async (id: string) => { const res = await fetch(`/api/lab/qc/${id}?slug=${slug}`, { method: "DELETE" }); if (res.ok) await load(true); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><Link href={path("/lab")} className="mb-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link><h1 className="text-3xl font-bold text-foreground">Quality Control</h1><p className="mt-1 text-sm text-muted-foreground">QC register, review visibility, and audit-ready record handling.</p></div><div className="flex gap-2"><button onClick={() => load(true)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button><button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" />New QC Test</button></div></div>
      <div className="grid gap-4 md:grid-cols-4">{[["Total", stats.total], ["Pass", stats.pass], ["Fail", stats.fail], ["Review", stats.review]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold text-foreground">{value || 0}</p></div>)}</div>
      <div className="rounded-2xl border border-border bg-card p-4"><div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search QC tests" className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm" /></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="all">All status</option><option value="pass">Pass</option><option value="fail">Fail</option><option value="review">Review</option></select></div></div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground"><tr><th className="px-4 py-3">Test</th><th className="px-4 py-3">Instrument</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Recorded by</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></td></tr> : filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No QC records found.</td></tr> : filtered.map((record) => <tr key={record.id} className="border-t border-border"><td className="px-4 py-3"><p className="font-medium text-foreground">{record.testName}</p><p className="text-xs text-muted-foreground">{new Date(record.date).toLocaleString()}</p></td><td className="px-4 py-3 text-foreground">{record.instrument || "General"}</td><td className="px-4 py-3 text-foreground">{record.result}</td><td className="px-4 py-3"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{record.status}</span></td><td className="px-4 py-3 text-foreground">{record.recordedBy}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><button onClick={() => setSelected(record)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"><Eye className="h-3.5 w-3.5" />View</button><button onClick={() => deleteRecord(record.id)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"><Trash2 className="h-3.5 w-3.5" />Delete</button></div></td></tr>)}</tbody></table></div></div>
      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6"><div className="mb-4 flex items-center gap-2 text-foreground"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold">QC Details</h2></div><div className="space-y-3 text-sm"><p><span className="font-medium text-foreground">Test:</span> {selected.testName}</p><p><span className="font-medium text-foreground">Result:</span> {selected.result}</p><p><span className="font-medium text-foreground">Instrument:</span> {selected.instrument || "General"}</p><p><span className="font-medium text-foreground">Lot:</span> {selected.lotNumber || "-"}</p><p><span className="font-medium text-foreground">Notes:</span> {selected.notes || "-"}</p></div><div className="mt-6 flex justify-end"><button onClick={() => setSelected(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Close</button></div></div></div>}
      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6"><h2 className="text-xl font-semibold text-foreground">Create QC record</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><input value={form.testName} onChange={(e) => setForm({ ...form, testName: e.target.value })} placeholder="Test name" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" /><input value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} placeholder="Result value" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" /><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="pass">Pass</option><option value="fail">Fail</option><option value="review">Review</option></select><input value={form.instrument} onChange={(e) => setForm({ ...form, instrument: e.target.value })} placeholder="Instrument" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" /><input value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} placeholder="Lot number" className="h-10 rounded-lg border border-border bg-background px-3 text-sm md:col-span-2" /><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="min-h-[100px] rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" /></div><div className="mt-6 flex justify-end gap-3"><button onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button><button onClick={saveRecord} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save</button></div></div></div>}
    </div>
  );
}
