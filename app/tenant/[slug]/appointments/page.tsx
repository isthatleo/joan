"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, CheckCircle2, Clock3, Eye, Loader2, RefreshCw, Search, User, UserCheck } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { useTenantPath } from "@/hooks/useTenantPath";

type AppointmentRow = {
  id: string;
  patientId: string;
  patientName: string;
  medicalRecordNumber: string | null;
  patientPhone: string | null;
  patientEmail?: string | null;
  doctorName: string;
  department: string;
  scheduledAt: string | null;
  time: string;
  status: string;
  type: string;
  reason?: string | null;
  notes?: string | null;
  duration?: number;
};

type AppointmentStats = {
  total: number;
  scheduled: number;
  checkedIn: number;
  completed: number;
  cancelled: number;
};

const EMPTY_STATS: AppointmentStats = {
  total: 0,
  scheduled: 0,
  checkedIn: 0,
  completed: 0,
  cancelled: 0,
};

function normalize(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function statusTone(status: string) {
  const normalized = normalize(status);
  if (normalized === "completed") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (normalized === "checked-in") return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
  if (normalized === "cancelled" || normalized === "no-show" || normalized === "no_show") return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleString();
}

export default function TenantAppointmentsPage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const toTenantPath = useTenantPath();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [stats, setStats] = useState<AppointmentStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [range, setRange] = useState("30d");
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async (showRefresh = false) => {
    if (!slug) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      query.set("range", range);
      query.set("status", status);
      if (search.trim()) query.set("search", search.trim());

      const response = await fetch(`/api/tenant/${slug}/appointments?${query.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to fetch appointments");

      const rows = Array.isArray(payload) ? payload : payload?.appointments;
      setAppointments(Array.isArray(rows) ? rows : []);
      setStats(payload?.stats || EMPTY_STATS);
    } catch (fetchError: any) {
      console.error("Failed to fetch appointments:", fetchError);
      setError(fetchError?.message || "Failed to fetch appointments");
      setAppointments([]);
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchAppointments(false);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [slug, range, status, search]);

  const upcoming = useMemo(
    () => appointments.filter((appointment) => appointment.scheduledAt && new Date(appointment.scheduledAt) >= new Date()).length,
    [appointments],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Administrative Scheduling Oversight</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Appointments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only operational appointment worklist for hospital admins. Booking, check-in, reschedule, and cancellation remain receptionist privileges.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchAppointments(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing || loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KPICard title="Total" value={stats.total} subtitle="Matching current filters" tone="info" icon={Calendar} />
        <KPICard title="Upcoming" value={upcoming} subtitle="Scheduled from now onward" tone="primary" icon={Clock3} />
        <KPICard title="Scheduled" value={stats.scheduled} subtitle="Awaiting arrival" tone="primary" icon={Clock3} />
        <KPICard title="Checked In" value={stats.checkedIn} subtitle="Receptionist-managed" tone="warning" icon={UserCheck} />
        <KPICard title="Completed" value={stats.completed} subtitle="Closed visits" tone="success" icon={CheckCircle2} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patient, MRN, phone, email, doctor, type, reason, or notes"
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground"
            />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="checked-in">Checked In</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no-show">No-show</option>
          </select>
          <select value={range} onChange={(event) => setRange(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="today">Today</option>
            <option value="7d">Next 7 days</option>
            <option value="30d">Next 30 days</option>
            <option value="past">Past appointments</option>
            <option value="all">All dates</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Appointment Worklist</h2>
          <p className="text-sm text-muted-foreground">{appointments.length} appointment(s). Admin actions are read-only.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Patient</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Schedule</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Provider</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Type / Reason</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="border-t border-border">
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-orange-500" />
                    Loading appointments...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr className="border-t border-border">
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No appointments match the current filters.</td>
                </tr>
              ) : (
                appointments.map((appointment) => (
                  <tr key={appointment.id} className="border-t border-border">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-foreground">{appointment.patientName || "Unknown patient"}</p>
                        <p className="text-xs text-muted-foreground">
                          {appointment.medicalRecordNumber || appointment.patientPhone || appointment.patientEmail || "No contact details"}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-foreground">{appointment.time || "Not scheduled"}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(appointment.scheduledAt)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-foreground">{appointment.doctorName || "Unassigned doctor"}</p>
                      <p className="text-xs text-muted-foreground">{appointment.department || "General"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-foreground">{appointment.type || "Consultation"}</p>
                      <p className="max-w-[260px] truncate text-xs text-muted-foreground">{appointment.reason || appointment.notes || "No reason recorded"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone(appointment.status)}`}>
                        {appointment.status || "scheduled"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link href={toTenantPath(`/appointments/${appointment.id}`)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
                          <Eye className="h-3.5 w-3.5" />
                          Appointment
                        </Link>
                        {appointment.patientId ? (
                          <Link href={toTenantPath(`/patients/${appointment.patientId}`)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
                            <User className="h-3.5 w-3.5" />
                            Patient
                          </Link>
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
          <h3 className="text-base font-semibold text-foreground">Admin Scope</h3>
          <p className="mt-2 text-sm text-muted-foreground">Hospital admins can audit appointment flow, provider allocation, patient linkage, and timing without changing operational workflow state.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">Receptionist Privileges</h3>
          <p className="mt-2 text-sm text-muted-foreground">Booking, check-in, reschedule, and cancellation actions are intentionally handled from receptionist screens to keep accountability clear.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">Exception Monitoring</h3>
          <p className="mt-2 text-sm text-muted-foreground">Use status and date filters to find cancelled, missed, overdue, or unassigned appointments that need operational follow-up.</p>
        </div>
      </div>
    </div>
  );
}
