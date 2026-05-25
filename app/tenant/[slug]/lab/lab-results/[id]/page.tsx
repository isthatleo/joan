"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { withTenantPrefix } from "@/lib/tenant-routing";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";

function parseResultData(raw: any, fileUrl?: string | null) {
  const payload = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const values = payload.values && typeof payload.values === "object" ? payload.values : payload;
  return {
    summary: String(payload.summary || "Lab Result"),
    status: String(payload.status || "pending_review"),
    flag: String(payload.flag || "normal"),
    notes: payload.notes ? String(payload.notes) : null,
    values,
    fileUrl: fileUrl || null,
  };
}

export default function LabResultDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const path = (value: string) => withTenantPrefix(value, slug, hostname);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/lab/results/${id}`, { cache: "no-store" });
      const payload = res.ok ? await res.json() : null;
      setResult(payload ? { ...payload, parsed: parseResultData(payload.resultData, payload.fileUrl) } : null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!result) return <div className="space-y-4"><Link href={path("/lab/lab-results")} className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to results</Link><p className="text-sm text-muted-foreground">Result not found.</p></div>;

  const entries = Array.isArray(result.parsed.values)
    ? result.parsed.values.map((value: any, index: number) => [value?.name || `Value ${index + 1}`, value?.value || "-"])
    : Object.entries(result.parsed.values || {});

  return (
    <div className="space-y-6">
      <Link href={path("/lab/lab-results")} className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to results</Link>
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Result detail</p>
            <h1 className="mt-1 text-3xl font-bold text-foreground">{result.parsed.summary || "Lab Result"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Created {new Date(result.createdAt).toLocaleString()}</p>
          </div>
          {result.fileUrl && <a href={result.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"><Download className="h-4 w-4" />Open attachment</a>}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</p><p className="mt-2 font-medium text-foreground">{result.parsed.status || "pending_review"}</p><p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">Flag</p><p className="mt-2 font-medium text-foreground">{result.parsed.flag || "normal"}</p></div>
          <div className="rounded-xl border border-border bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Notes</p><p className="mt-2 text-sm text-muted-foreground">{result.parsed.notes || "No notes captured."}</p></div>
        </div>
        <div className="mt-6 rounded-xl border border-border bg-background p-4"><div className="mb-3 flex items-center gap-2 font-medium text-foreground"><FileText className="h-4 w-4 text-primary" />Findings</div>{entries.length === 0 ? <p className="text-sm text-muted-foreground">No structured values saved.</p> : <div className="space-y-2">{entries.map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"><span className="font-medium text-foreground">{key}</span><span className="text-muted-foreground">{String(value)}</span></div>)}</div>}</div>
      </div>
    </div>
  );
}
