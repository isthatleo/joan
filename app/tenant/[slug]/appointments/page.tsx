"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, CheckCircle2, Clock3, Phone, RefreshCw, Search, UserCheck, XCircle } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { useTenantPath } from "@/hooks/useTenantPath";

type AppointmentRow = {
  id: string;
  patientId: string;
  patientName: string;
  medicalRecordNumber: string | null;
  patientPhone: string | null;
  doctorName: string;
  department: string;
  scheduledAt: string | null;
  time: string;
  status: string;
  type: string;
};

function statusTone(status: string) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "checked-in") return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
  if (status === "cancelled" || status === "no-show") return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

export default function TenantAppointmentsPage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const toTenantPath = useTenantPath();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAppointments = async () => {
    if (!slug) return;
    try {
      setRefreshing(true);
      const response = await fetch(`/api/tenant/${slug}/receptionist/appointments?today=true`, { cache: "no-store" });
      const payload = await response.json().catch(() => []);
      if (response.ok) {
        setAppointments(Array.isArray(payload) ? payload : []);
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [slug]);

  const filtered = useMemo(() => {
    return appointments.filter((appointment) => {
      const haystack = [
        appointment.patientName,
        appointment.medicalRecordNumber,
        appointment.patientPhone,
        appointment.doctorName,
        appointment.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !search || haystack.includes(search.toLowerCase());
      const matchesStatus = status === "all" || appointment.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [appointments, search, status]);

  const metrics = useMemo(
    () => ({
      total: appointments.length,
      scheduled: appointments.filter((item) => item.status === "scheduled").length,
      checkedIn: appointments.filter((item) => item.status === "checked-in").length,
      completed: appointments.filter((item) => item.status === "completed").length,
    }),
    [appointments],
  );

  const checkInAppointment = async (appointment: AppointmentRow) => {
    try {
      setBusyId(`checkin-${appointment.id}`);
      await fetch(`/api/tenant/${slug}/receptionist/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: appointment.patientId, appointmentId: appointment.id }),
      });
    } finally {
      setBusyId(null);
      fetchAppointments();
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      setBusyId(`cancel-${appointmentId}`);
      await fetch(`/api/tenant/${slug}/receptionist/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
    } finally {
      setBusyId(null);
      fetchAppointments();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Front Desk Scheduling</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Appointments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track same-day arrivals, manage handoff to queue, and clean up cancellations before they create delays.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={toTenantPath("/appointments/book")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Calendar className="h-4 w-4" />
            New Booking
          </Link>
          <Link href={toTenantPath("/check-in")} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            <UserCheck className="h-4 w-4" />
            Check-in Desk
          </Link>
          <button onClick={fetchAppointments} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Total Appointments" value={metrics.total} subtitle="Loaded for this tenant" tone="info" icon={Calendar} />
        <KPICard title="Scheduled" value={metrics.scheduled} subtitle="Awaiting arrival" tone="primary" icon={Clock3} />
        <KPICard title="Checked In" value={metrics.checkedIn} subtitle="Ready for queue handoff" tone="warning" icon={UserCheck} />
        <KPICard title="Completed" value={metrics.completed} subtitle="Closed visits" tone="success" icon={CheckCircle2} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patient, MRN, phone, doctor, or type"
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground"
            />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="checked-in">Checked In</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Appointment Worklist</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} appointment(s)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Patient</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Time</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Doctor</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="border-t border-border">
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">Loading appointments...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr className="border-t border-border">
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No appointments match the current filters.</td>
                </tr>
              ) : (
                filtered.map((appointment) => (
                  <tr key={appointment.id} className="border-t border-border">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-foreground">{appointment.patientName}</p>
                        <p className="text-xs text-muted-foreground">{appointment.medicalRecordNumber || appointment.patientPhone || "No contact details"}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-foreground">{appointment.time}</td>
                    <td className="px-5 py-4">
                      <p className="text-foreground">{appointment.doctorName}</p>
                      <p className="text-xs text-muted-foreground">{appointment.department}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={toTenantPath(`/patients/${appointment.patientId}`)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">
                          View
                        </Link>
                        {appointment.patientPhone ? (
                          <a href={`tel:${appointment.patientPhone}`} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">
                            <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Call</span>
                          </a>
                        ) : null}
                        {appointment.status === "scheduled" ? (
                          <button
                            onClick={() => checkInAppointment(appointment)}
                            disabled={busyId === `checkin-${appointment.id}`}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
                          >
                            Check In
                          </button>
                        ) : null}
                        <Link href={toTenantPath(`/appointments/book?patientId=${appointment.patientId}&appointmentId=${appointment.id}`)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">
                          Reschedule
                        </Link>
                        {appointment.status !== "completed" && appointment.status !== "cancelled" ? (
                          <button
                            onClick={() => cancelAppointment(appointment.id)}
                            disabled={busyId === `cancel-${appointment.id}`}
                            className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive disabled:opacity-60"
                          >
                            <span className="inline-flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Cancel</span>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">Arrival Protocol</h3>
          <p className="mt-2 text-sm text-muted-foreground">Confirm identity, verify contact details, and move checked-in patients into the queue without duplicate entries.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">Recovery Actions</h3>
          <p className="mt-2 text-sm text-muted-foreground">Use reschedule for patients who need a new slot, and cancel only when the visit is truly closed out.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">Queue Handoff</h3>
          <p className="mt-2 text-sm text-muted-foreground">Checked-in appointments flow into the queue and become visible from the waiting room and front-desk queue boards.</p>
        </div>
      </div>
    </div>
  );
}
