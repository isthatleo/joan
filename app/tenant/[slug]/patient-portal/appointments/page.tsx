"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTenantPath } from "@/hooks/useTenantPath";
import { Calendar, Eye, RefreshCw, Search, XCircle } from "lucide-react";

type AppointmentData = {
  appointments: Array<{ id: string; scheduledAt?: string | null; status: string; doctorId?: string | null; doctorName: string; appointmentType: string; reason: string; notes: string }>;
  summary: { upcoming: number; completed: number; cancelled: number };
};

export default function PatientAppointmentsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const tenantPath = useTenantPath();
  const [data, setData] = useState<AppointmentData | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData(showSpinner = true) {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/patient/appointments`, { cache: "no-store", credentials: "include" });
      if (!response.ok) throw new Error("Failed to load appointments");
      setData(await response.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, [slug]);

  async function cancelAppointment(id: string) {
    await fetch(`/api/tenant/${slug}/patient/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "cancelled" }),
    });
    await loadData(false);
  }

  const appointments = useMemo(() => (data?.appointments || []).filter((item) => {
    const term = search.toLowerCase();
    return !term || [item.doctorName, item.appointmentType, item.reason].join(" ").toLowerCase().includes(term);
  }), [data?.appointments, search]);

  if (loading || !data) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading appointments...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Appointments</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Manage scheduled visits</h1>
          <p className="mt-2 text-sm text-muted-foreground">Book, review, reschedule, or cancel visits without losing visit context.</p>
        </div>
        <div className="flex gap-2">
          <Link href={tenantPath("/patient-portal/appointments/book")} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Book appointment</Link>
          <button onClick={() => loadData()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"><RefreshCw className={`mr-2 inline h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Upcoming</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.summary.upcoming}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Completed</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.summary.completed}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Cancelled</p><p className="mt-2 text-3xl font-semibold text-foreground">{data.summary.cancelled}</p></div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search appointments" className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground" />
        </div>
      </div>

      <div className="space-y-4">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-lg font-semibold text-foreground">{appointment.appointmentType}</p>
                <p className="text-sm text-muted-foreground">With {appointment.doctorName}</p>
                <p className="text-sm text-muted-foreground">{appointment.scheduledAt ? new Date(appointment.scheduledAt).toLocaleString() : "Not scheduled"}</p>
                <p className="text-sm text-foreground">{appointment.reason || "No reason provided"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium capitalize text-primary">{appointment.status}</span>
                <Link href={`${tenantPath("/patient-portal/appointments/book")}?appointmentId=${appointment.id}`} className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"><Eye className="mr-2 inline h-4 w-4" />Reschedule</Link>
                {appointment.status !== "cancelled" && appointment.status !== "completed" ? <button onClick={() => cancelAppointment(appointment.id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/40"><XCircle className="mr-2 inline h-4 w-4" />Cancel</button> : null}
              </div>
            </div>
          </div>
        ))}
        {appointments.length === 0 ? <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No appointments found.</div> : null}
      </div>
    </div>
  );
}
