"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Payload = { vaccinations: Array<{ id: string; childId: string; childName: string; vaccineName: string; vaccineType: string; scheduledDate: string; administeredDate?: string | null; status: string; administeredBy?: string | null; location?: string | null; nextDueDate?: string | null; notes?: string | null }>; children: Array<{ id: string; firstName: string; lastName: string }>; schedule: Array<{ vaccineName: string; recommendedAges: string[]; description: string; required: boolean }>; summary: { total: number; completed: number; upcoming: number; overdue: number } };

export default function GuardianVaccinationsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<Payload | null>(null);
  const [childId, setChildId] = useState(searchParams.get("childId") || "all");
  const [status, setStatus] = useState("all");
  useEffect(() => { fetch(`/api/tenant/${slug}/guardian/vaccinations`, { cache: "no-store", credentials: "include" }).then((res) => res.json()).then(setData); }, [slug]);
  const vaccinations = useMemo(() => (data?.vaccinations || []).filter((item) => (childId === "all" || item.childId === childId) && (status === "all" || item.status === status)), [childId, data?.vaccinations, status]);
  if (!data) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading vaccination records...</div>;
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm"><p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Vaccinations</p><h1 className="mt-1 text-3xl font-semibold text-foreground">Immunization coverage and schedules</h1></div>
      <div className="grid gap-4 md:grid-cols-4"><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Total</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.summary.total}</p></div><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Completed</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.summary.completed}</p></div><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Upcoming</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.summary.upcoming}</p></div><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Overdue</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.summary.overdue}</p></div></div>
      <div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-border bg-card p-4 shadow-sm"><select value={childId} onChange={(e) => setChildId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="all">All children</option>{data.children.map((item) => <option key={item.id} value={item.id}>{[item.firstName, item.lastName].filter(Boolean).join(" ")}</option>)}</select></div><div className="rounded-2xl border border-border bg-card p-4 shadow-sm"><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="all">All statuses</option><option value="completed">Completed</option><option value="scheduled">Scheduled</option><option value="upcoming">Upcoming</option><option value="overdue">Overdue</option></select></div></div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"><div className="space-y-4">{vaccinations.map((item) => <div key={item.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="font-semibold text-foreground">{item.vaccineName}</p><p className="text-sm text-muted-foreground">{item.childName} • {item.vaccineType}</p><div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2"><p>Scheduled: {new Date(item.scheduledDate).toLocaleDateString()}</p><p>Status: {item.status}</p><p>Administered: {item.administeredDate ? new Date(item.administeredDate).toLocaleDateString() : "Pending"}</p><p>Next due: {item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString() : "-"}</p></div></div>)}</div><div className="rounded-2xl border border-border bg-card p-6 shadow-sm"><h2 className="text-lg font-semibold text-foreground">Routine schedule</h2><div className="mt-4 space-y-3">{data.schedule.map((item) => <div key={item.vaccineName} className="rounded-xl border border-border bg-background p-4"><p className="font-medium text-foreground">{item.vaccineName}</p><p className="text-sm text-muted-foreground">{item.recommendedAges.join(", ")}</p></div>)}</div></div></div>
    </div>
  );
}
