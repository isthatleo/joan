"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type RecordItem = { id: string; childId: string; childName: string; type: string; title: string; description: string; date?: string | null; details: Record<string, unknown> };
type Payload = { records: RecordItem[]; children: Array<{ id: string; fullName: string }> };

export default function GuardianRecordsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<Payload | null>(null);
  const [childId, setChildId] = useState(searchParams.get("childId") || "all");
  const [type, setType] = useState("all");

  useEffect(() => { fetch(`/api/tenant/${slug}/guardian/records`, { cache: "no-store", credentials: "include" }).then((res) => res.json()).then(setData); }, [slug]);
  const records = useMemo(() => (data?.records || []).filter((item) => (childId === "all" || item.childId === childId) && (type === "all" || item.type === type)), [childId, data?.records, type]);
  if (!data) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading records...</div>;
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm"><p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Health Records</p><h1 className="mt-1 text-3xl font-semibold text-foreground">Cross-child medical timeline</h1></div>
      <div className="grid gap-4 md:grid-cols-2"><select value={childId} onChange={(e) => setChildId(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"><option value="all">All children</option>{data.children.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select><select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"><option value="all">All types</option><option value="visit">Visits</option><option value="prescription">Prescriptions</option><option value="lab">Lab</option></select></div>
      <div className="space-y-4">{records.map((item) => <div key={item.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-foreground">{item.title}</p><p className="text-sm text-muted-foreground">{item.childName} • {item.type}</p><p className="mt-2 text-sm text-foreground">{item.description}</p></div><p className="text-sm text-muted-foreground">{item.date ? new Date(item.date).toLocaleString() : "-"}</p></div><pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-background p-4 text-xs text-muted-foreground">{JSON.stringify(item.details, null, 2)}</pre></div>)}</div>
    </div>
  );
}
