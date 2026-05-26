"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Appointment = { id: string; childId: string; childName: string; doctorName: string; date: string; time: string; type: string; status: string; reason: string; canReschedule: boolean; canCancel: boolean };
type Payload = { appointments: Appointment[]; stats: { total: number; upcoming: number; completed: number; cancelled: number } };

export default function GuardianAppointmentsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<Payload | null>(null);
  const [status, setStatus] = useState("all");

  async function load() {
    const response = await fetch(`/api/tenant/${slug}/guardian/appointments`, { cache: "no-store", credentials: "include" });
    if (response.ok) setData(await response.json());
  }
  useEffect(() => { load(); }, [slug]);

  async function patchAppointment(id: string, body: Record<string, unknown>) {
    await fetch(`/api/tenant/${slug}/guardian/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
    await load();
  }

  const appointments = useMemo(() => (data?.appointments || []).filter((item) => status === "all" || item.status === status), [data?.appointments, status]);
  if (!data) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading appointments...</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Appointments</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">Guardian appointment management</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Total</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.stats.total}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Upcoming</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.stats.upcoming}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Completed</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.stats.completed}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Cancelled</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.stats.cancelled}</p></div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm"><select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="all">All statuses</option><option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
      <div className="space-y-4">{appointments.map((item) => <div key={item.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-foreground">{item.childName}</p><p className="text-sm text-muted-foreground">{item.type} with {item.doctorName}</p><p className="mt-2 text-sm text-muted-foreground">{new Date(`${item.date}T${item.time || "00:00"}`).toLocaleString()}</p><p className="mt-1 text-sm text-foreground">{item.reason}</p></div><div className="flex gap-2"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium capitalize text-primary">{item.status}</span>{item.canReschedule ? <button onClick={() => patchAppointment(item.id, { date: item.date, timeSlot: item.time, status: "scheduled" })} className="rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:bg-muted">Reschedule</button> : null}{item.canCancel ? <button onClick={() => patchAppointment(item.id, { status: "cancelled" })} className="rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:bg-muted">Cancel</button> : null}</div></div></div>)}</div>
    </div>
  );
}
