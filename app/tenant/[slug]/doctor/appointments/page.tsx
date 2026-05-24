"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle, Clock, Plus, Search, TimerReset, XCircle } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const tenantPath = useTenantPath();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [range, setRange] = useState("upcoming");
  const [activeMutationId, setActiveMutationId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["doctor-appointments", search, status, range],
    queryFn: async () => {
      const params = new URLSearchParams({ status, range });
      if (search) params.set("search", search);
      const response = await fetch(`/api/doctor/appointments?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load appointments");
      return payload;
    },
  });

  const appointments = data ?? [];

  const metrics = useMemo(() => ({
    total: appointments.length,
    scheduled: appointments.filter((item: any) => item.status === "scheduled").length,
    completed: appointments.filter((item: any) => item.status === "completed").length,
    cancelled: appointments.filter((item: any) => item.status === "cancelled").length,
  }), [appointments]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: string }) => {
      setActiveMutationId(id);
      const response = await fetch("/api/doctor/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to update appointment");
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
      toast.success("Appointment updated");
      setActiveMutationId(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update appointment");
      setActiveMutationId(null);
    },
  });

  const upcomingCount = useMemo(
    () => appointments.filter((item: any) => item.status === "scheduled" || item.status === "waiting").length,
    [appointments]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Appointments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and schedule your real appointment calendar.
          </p>
        </div>
        <Link
          href={tenantPath("/doctor/appointments/new")}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          New Appointment
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Loaded Appointments" value={metrics.total} tone="info" icon={CalendarDays} />
        <KPICard title="Scheduled" value={metrics.scheduled} tone="primary" icon={Clock} />
        <KPICard title="Completed" value={metrics.completed} tone="success" icon={CheckCircle} />
        <KPICard title="Cancelled" value={metrics.cancelled} tone="destructive" icon={XCircle} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Schedule Summary</p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">Today&apos;s appointment operating picture</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review appointment completion, pending consults, and cancellation volume before taking action.
              </p>
            </div>
            <TimerReset className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Upcoming</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{upcomingCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Completion Rate</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {metrics.total ? `${Math.round((metrics.completed / metrics.total) * 100)}%` : "0%"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cancellation Rate</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {metrics.total ? `${Math.round((metrics.cancelled / metrics.total) * 100)}%` : "0%"}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Action Rules</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p className="rounded-lg border border-border bg-background/70 px-4 py-3">Complete an appointment only after the consult is closed.</p>
            <p className="rounded-lg border border-border bg-background/70 px-4 py-3">Cancelled appointments remain searchable for audit and follow-up.</p>
            <p className="rounded-lg border border-border bg-background/70 px-4 py-3">Use patient links to open the clinical record before changing status.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by patient name or email"
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground"
            />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={range} onChange={(event) => setRange(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="upcoming">Upcoming</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="all">All dates</option>
          </select>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load appointments.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Appointment List</h2>
          <p className="text-sm text-muted-foreground">{appointments.length} appointment(s)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Patient</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Scheduled</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="border-t border-border">
                    <td colSpan={4} className="px-5 py-4 text-muted-foreground">Loading appointments...</td>
                  </tr>
                ))
              ) : appointments.length === 0 ? (
                <tr className="border-t border-border">
                  <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                    No appointments match the current filters.
                  </td>
                </tr>
              ) : (
                appointments.map((appointment: any) => (
                  <tr key={appointment.id} className="border-t border-border">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-foreground">{appointment.patientName || "Unknown patient"}</p>
                        <p className="text-xs text-muted-foreground">{appointment.patientEmail || appointment.patientPhone || "No contact details"}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-foreground">{formatDateTime(appointment.scheduledAt)}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize text-foreground">
                        {appointment.status || "scheduled"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={tenantPath(`/doctor/patients/${appointment.patientId}`)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40">
                          View Patient
                        </Link>
                        {appointment.status !== "completed" && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: appointment.id, nextStatus: "completed" })}
                            disabled={updateStatusMutation.isPending}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updateStatusMutation.isPending && activeMutationId === appointment.id ? "Saving..." : "Complete"}
                          </button>
                        )}
                        {appointment.status !== "cancelled" && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: appointment.id, nextStatus: "cancelled" })}
                            disabled={updateStatusMutation.isPending}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updateStatusMutation.isPending && activeMutationId === appointment.id ? "Saving..." : "Cancel"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

