"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Result = { id: string; childName: string; testName: string; testCode?: string | null; category: string; status: string; orderedAt?: string | null; completedAt?: string | null; provider: string; notes?: string | null; resultData: unknown; patientPortalEligible: boolean };

export default function GuardianLabResultDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => { fetch(`/api/tenant/${slug}/guardian/lab-results/${id}`, { cache: "no-store", credentials: "include" }).then((res) => res.json()).then(setResult); }, [id, slug]);
  const findings = useMemo(() => Array.isArray(result?.resultData) ? result?.resultData : [], [result?.resultData]);
  if (!result) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading result details...</div>;
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm"><Link href={`/tenant/${slug}/guardian/lab-results`} className="text-sm font-medium text-muted-foreground hover:text-foreground">Back to lab results</Link><h1 className="mt-2 text-3xl font-semibold text-foreground">{result.testName}</h1><p className="mt-2 text-sm text-muted-foreground">{result.childName} • {result.provider}</p></div>
      <div className="grid gap-4 md:grid-cols-4"><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Status</p><p className="mt-2 text-lg font-semibold capitalize text-foreground">{result.status}</p></div><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Category</p><p className="mt-2 text-lg font-semibold text-foreground">{result.category}</p></div><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Ordered</p><p className="mt-2 text-lg font-semibold text-foreground">{result.orderedAt ? new Date(result.orderedAt).toLocaleString() : "-"}</p></div><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Completed</p><p className="mt-2 text-lg font-semibold text-foreground">{result.completedAt ? new Date(result.completedAt).toLocaleString() : "Pending"}</p></div></div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"><div className="rounded-2xl border border-border bg-card p-6 shadow-sm"><h2 className="text-lg font-semibold text-foreground">Findings</h2><pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">{JSON.stringify(findings.length ? findings : result.resultData || {}, null, 2)}</pre></div><div className="rounded-2xl border border-border bg-card p-6 shadow-sm"><h2 className="text-lg font-semibold text-foreground">Actions</h2><div className="mt-4 space-y-3"><button onClick={() => window.open(`/api/tenant/${slug}/guardian/lab-results/${id}/download`, "_blank", "noopener,noreferrer")} disabled={!result.patientPortalEligible} className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">Download e-stamped result</button><Link href={`/tenant/${slug}/guardian/alerts`} className="block w-full rounded-xl border border-border px-4 py-3 text-center text-sm font-medium text-foreground hover:bg-muted">Open alerts</Link></div></div></div>
    </div>
  );
}
