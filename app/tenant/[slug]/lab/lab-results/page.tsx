"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { withTenantPrefix } from "@/lib/tenant-routing";
import { ArrowLeft, Download, Loader2, Microscope, RefreshCw, Search, Upload } from "lucide-react";

export default function LabResultsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const path = (value: string) => withTenantPrefix(value, slug, hostname);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async (soft = false) => {
    soft ? setRefreshing(true) : setLoading(true);
    try {
      const res = await fetch(`/api/lab/results?slug=${slug}&limit=200`, { cache: "no-store" });
      const payload = res.ok ? await res.json() : { results: [] };
      setResults(Array.isArray(payload?.results) ? payload.results : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [slug]);

  const filtered = useMemo(() => results.filter((result) => {
    const q = search.toLowerCase();
    const matchesSearch = String(result.patientName || "").toLowerCase().includes(q) || String(result.testType || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || String(result.status || "") === statusFilter;
    return matchesSearch && matchesStatus;
  }), [results, search, statusFilter]);

  const stats = {
    total: results.length,
    pending: results.filter((result) => result.status === "pending").length,
    reviewed: results.filter((result) => result.status === "reviewed" || result.status === "pending_review").length,
    approved: results.filter((result) => result.status === "approved" || result.status === "accepted").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={path("/lab")} className="mb-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
          <h1 className="text-3xl font-bold text-foreground">Results</h1>
          <p className="mt-1 text-sm text-muted-foreground">Publish findings, inspect payloads, and route clinicians into completed work.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load(true)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
          <Link href={path("/lab/lab-results/upload")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Upload className="h-4 w-4" />Upload Result</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">{[["Total", stats.total], ["Pending", stats.pending], ["Reviewed", stats.reviewed], ["Approved", stats.approved]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold text-foreground">{value}</p></div>)}</div>

      <div className="rounded-2xl border border-border bg-card p-4"><div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient or test" className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm" /></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="all">All status</option><option value="pending">Pending</option><option value="pending_review">Pending review</option><option value="reviewed">Reviewed</option><option value="approved">Approved</option></select></div></div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground"><tr><th className="px-4 py-3">Test</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Uploaded</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></td></tr> : filtered.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No lab results found.</td></tr> : filtered.map((result) => <tr key={result.id} className="border-t border-border"><td className="px-4 py-3"><p className="font-medium text-foreground">{result.testType}</p></td><td className="px-4 py-3"><p className="font-medium text-foreground">{result.patientName}</p></td><td className="px-4 py-3"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{String(result.status || "pending").replace(/_/g, " ")}</span></td><td className="px-4 py-3 text-foreground">{new Date(result.createdAt).toLocaleString()}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><Link href={path(`/lab/lab-results/${result.id}`)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">View</Link>{result.fileUrl && <a href={result.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"><Download className="h-3.5 w-3.5" />File</a>}</div></td></tr>)}</tbody></table></div></div>
    </div>
  );
}
