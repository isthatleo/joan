"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Payload = { results: Array<{ id: string; childId: string; childName: string; testName: string; category: string; status: string; orderedAt?: string | null; completedAt?: string | null; patientPortalEligible: boolean }>; children: Array<{ id: string; fullName: string }>; categories: Array<{ id: string; name: string; count: number }>; summary: { total: number; ready: number; payable: number } };

export default function GuardianLabResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<Payload | null>(null);
  const [childId, setChildId] = useState(searchParams.get("childId") || "all");
  useEffect(() => { fetch(`/api/tenant/${slug}/guardian/lab-results`, { cache: "no-store", credentials: "include" }).then((res) => res.json()).then(setData); }, [slug]);
  const results = useMemo(() => (data?.results || []).filter((item) => childId === "all" || item.childId === childId), [childId, data?.results]);
  if (!data) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading lab results...</div>;
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm"><p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Lab Results</p><h1 className="mt-1 text-3xl font-semibold text-foreground">Child lab results and payment release</h1></div>
      <div className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">All results</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.summary.total}</p></div><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Ready</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.summary.ready}</p></div><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Awaiting payment</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.summary.payable}</p></div></div>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm"><select value={childId} onChange={(e) => setChildId(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="all">All children</option>{data.children.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></div>
      <div className="space-y-4">{results.map((item) => <div key={item.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-foreground">{item.testName}</p><p className="text-sm text-muted-foreground">{item.childName} • {item.category}</p><p className="mt-2 text-sm text-muted-foreground">Ordered: {item.orderedAt ? new Date(item.orderedAt).toLocaleString() : "-"}</p></div><div className="flex gap-2"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium capitalize text-primary">{item.status}</span><Link href={`/tenant/${slug}/guardian/lab-results/${item.id}`} className="rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:bg-muted">Details</Link></div></div>{!item.patientPortalEligible ? <p className="mt-3 text-sm text-amber-600 dark:text-amber-300">Payment clearance required before downloading this result.</p> : null}</div>)}</div>
    </div>
  );
}
