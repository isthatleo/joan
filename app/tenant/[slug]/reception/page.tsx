"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertOctagon,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Phone,
  RefreshCw,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { DashboardGreeting } from "@/components/DashboardGreeting";
import { KPICard } from "@/components/KPICard";
import { useTenantPath } from "@/hooks/useTenantPath";

type DashboardMetrics = {
  totalPatientsToday: number;
  checkedInToday: number;
  waitingInQueue: number;
  completedAppointments: number;
  emergencyAlerts: number;
  newRegistrations: number;
  averageWaitTime: number;
  satisfactionScore: number;
  upcomingAppointments: number;
  noShowsToday: number;
};

type AppointmentRow = {
  id: string;
  patientId: string;
  patientName: string;
  medicalRecordNumber: string | null;
  patientPhone: string | null;
  doctorName: string;
  scheduledAt: string | null;
  time: string;
  status: string;
  type: string;
};

type QueueRow = {
  id: string;
  patientId: string;
  patientName: string;
  priority: string;
  actualWaitTime: string;
  estimatedWaitTime: string;
  status: string;
  queueNumber: string | null;
  position: number;
};

type AlertRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  timestamp: string;
};

function statusTone(status: string) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "checked-in") return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
  if (status === "called") return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (status === "with-doctor") return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
  if (status === "cancelled" || status === "no-show") return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return "bg-muted text-muted-foreground";
}

function priorityTone(priority: string) {
  if (priority === "urgent") return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  if (priority === "high") return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

export default function ReceptionistDashboardPage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const toTenantPath = useTenantPath();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [metricsRes, appointmentsRes, queueRes, alertsRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/receptionist/metrics`),
        fetch(`/api/tenant/${slug}/receptionist/appointments?today=true`),
        fetch(`/api/tenant/${slug}/receptionist/queue`),
        fetch(`/api/tenant/${slug}/receptionist/alerts`),
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (appointmentsRes.ok) setAppointments(await appointmentsRes.json());
      if (queueRes.ok) setQueue(await queueRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
    } catch (error) {
      console.error("Failed to fetch receptionist dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!slug) return;
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [slug]);

  const activeQueue = useMemo(() => queue.filter((item) => item.status !== "completed" && item.status !== "cancelled"), [queue]);
  const topAlerts = alerts.slice(0, 3);

  const markCheckedIn = async (appointmentId: string, patientId: string) => {
    await fetch(`/api/tenant/${slug}/receptionist/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, appointmentId }),
    }).catch(() => null);
    fetchDashboardData();
  };

  const callQueuePatient = async (queueId: string) => {
    await fetch(`/api/tenant/${slug}/receptionist/queue/${queueId}/call`, {
      method: "POST",
    }).catch(() => null);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Loading receptionist dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardGreeting roleLabel="Receptionist" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Front Desk Control</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Reception Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage arrivals, check-ins, queue pressure, emergencies, and same-day throughput.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={toTenantPath("/patients/register")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <UserPlus className="h-4 w-4" />
            Register Patient
          </Link>
          <Link href={toTenantPath("/check-in")} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            <UserCheck className="h-4 w-4" />
            Check-in Desk
          </Link>
          <button onClick={fetchDashboardData} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {topAlerts.length > 0 ? (
        <div className="grid gap-3 rounded-2xl border border-amber-300/50 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <AlertOctagon className="h-5 w-5 text-amber-500" />
            Live Alerts
          </div>
          {topAlerts.map((alert) => (
            <div key={alert.id} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{alert.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${priorityTone(alert.priority)}`}>
                  {alert.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KPICard title="Patients Today" value={metrics?.totalPatientsToday ?? 0} subtitle={`${metrics?.checkedInToday ?? 0} checked in`} tone="info" icon={Users} />
        <KPICard title="Queue Pressure" value={metrics?.waitingInQueue ?? 0} subtitle={`${metrics?.averageWaitTime ?? 0} min avg wait`} tone="warning" icon={ClipboardList} />
        <KPICard title="Completed Visits" value={metrics?.completedAppointments ?? 0} subtitle={`${metrics?.noShowsToday ?? 0} no-shows`} tone="success" icon={CheckCircle2} />
        <KPICard title="Emergencies" value={metrics?.emergencyAlerts ?? 0} subtitle="Require immediate attention" tone="danger" icon={AlertOctagon} />
        <KPICard title="New Registrations" value={metrics?.newRegistrations ?? 0} subtitle={`${metrics?.upcomingAppointments ?? 0} upcoming in next hour`} tone="primary" icon={UserPlus} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Today&apos;s Appointments</h2>
              <p className="text-sm text-muted-foreground">Check in patients, confirm contact details, and spot delays early.</p>
            </div>
            <Link href={toTenantPath("/appointments")} className="text-sm font-medium text-primary">Open schedule</Link>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Doctor</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No appointments scheduled for today.</td>
                    </tr>
                  ) : (
                    appointments.slice(0, 8).map((appointment) => (
                      <tr key={appointment.id}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-foreground">{appointment.patientName}</p>
                            <p className="text-xs text-muted-foreground">{appointment.medicalRecordNumber || appointment.patientPhone || "No contact details"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground">{appointment.time}</td>
                        <td className="px-4 py-3 text-foreground">{appointment.doctorName}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link href={toTenantPath(`/patients/${appointment.patientId}`)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground">
                              View
                            </Link>
                            {appointment.patientPhone ? (
                              <a href={`tel:${appointment.patientPhone}`} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground">
                                Call
                              </a>
                            ) : null}
                            {appointment.status === "scheduled" ? (
                              <button onClick={() => markCheckedIn(appointment.id, appointment.patientId)} className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground">
                                Check In
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
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Active Queue</h2>
              <p className="text-sm text-muted-foreground">Call next patients and watch wait-time pressure.</p>
            </div>
            <Link href={toTenantPath("/queue")} className="text-sm font-medium text-primary">Open queue</Link>
          </div>
          <div className="mt-4 space-y-3">
            {activeQueue.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No active queue entries.
              </div>
            ) : (
              activeQueue.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-background/70 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{item.patientName}</p>
                      <p className="text-xs text-muted-foreground">{item.queueNumber || `Position ${item.position}`}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${priorityTone(item.priority)}`}>
                      {item.priority}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {item.actualWaitTime}</span>
                    <span className={`rounded-full px-2 py-1 font-medium capitalize ${statusTone(item.status)}`}>{item.status}</span>
                  </div>
                  {item.status === "waiting" ? (
                    <button onClick={() => callQueuePatient(item.id)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      Call patient
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Front Desk Actions</h2>
            <p className="text-sm text-muted-foreground">Fast access to the most common receptionist workflows.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            { href: "/patients/register", label: "Register", icon: UserPlus },
            { href: "/check-in", label: "Check In", icon: UserCheck },
            { href: "/appointments", label: "Appointments", icon: Calendar },
            { href: "/queue", label: "Queue", icon: ClipboardList },
            { href: "/reception/waiting", label: "Waiting Room", icon: Clock3 },
            { href: "/emergency", label: "Emergency", icon: AlertOctagon },
          ].map((action) => (
            <Link
              key={action.href}
              href={toTenantPath(action.href)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-4 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
            >
              <action.icon className="h-5 w-5 text-primary" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
