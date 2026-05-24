"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Activity, BellRing, CalendarDays, ClipboardList, FilePlus2, FlaskConical, History, Pill, Plus, Stethoscope, Users } from "lucide-react";
import { toast } from "sonner";
import { KPICard } from "@/components/KPICard";
import { DataCard } from "@/components/DataCard";
import { useTenantPath } from "@/hooks/useTenantPath";

function formatDateTime(value: string | Date | null) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DoctorDashboardPage() {
  const router = useRouter();
  const tenantPath = useTenantPath();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["doctor-dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/doctor/dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load doctor dashboard");
      return response.json();
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ["doctor-lab-result-notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications?unreadOnly=true", { cache: "no-store" });
      if (!response.ok) return { notifications: [] };
      return response.json();
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const notifications = notificationsQuery.data?.notifications ?? [];
    const pending = notifications.filter((item: any) => item.type === "lab_result_ready");

    pending.forEach((item: any) => {
      const storageKey = `doctor-lab-toast-${item.id}`;
      if (typeof window !== "undefined" && window.sessionStorage.getItem(storageKey)) {
        return;
      }

      toast.success(item.message || "A lab result is ready for review.");
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(storageKey, "1");
      }

      fetch(`/api/notifications/${item.id}/read`, { method: "POST" })
        .then(() => notificationsQuery.refetch())
        .catch(() => undefined);
    });
  }, [notificationsQuery.data?.notifications]);

  const metrics = data?.metrics ?? {};
  const appointments = data?.todayAppointments ?? [];
  const queueSnapshot = data?.queueSnapshot ?? [];
  const recentLabOrders = data?.recentLabOrders ?? [];
  const recentPrescriptions = data?.recentPrescriptions ?? [];
  const unreadLabNotifications = notificationsQuery.data?.notifications?.filter((item: any) => item.type === "lab_result_ready") ?? [];
  const scheduledToday = appointments.filter((item: any) => item.status === "scheduled").length;
  const completedToday = metrics.completedToday ?? 0;
  const actionCards = useMemo(
    () => [
      { label: "New Appointment", href: tenantPath("/doctor/appointments/new"), icon: Plus, tone: "bg-primary text-primary-foreground" },
      { label: "Add Patient", href: tenantPath("/doctor/patients/register"), icon: Users, tone: "bg-card text-foreground border border-border" },
      { label: "Open Queue", href: tenantPath("/doctor/queue"), icon: ClipboardList, tone: "bg-card text-foreground border border-border" },
      { label: "New Lab Order", href: tenantPath("/doctor/lab-orders/new"), icon: FilePlus2, tone: "bg-card text-foreground border border-border" },
      { label: "Write Prescription", href: tenantPath("/doctor/prescriptions/new"), icon: Pill, tone: "bg-card text-foreground border border-border" },
      { label: "Patient History", href: tenantPath("/doctor/analytics/my-patients"), icon: History, tone: "bg-card text-foreground border border-border" },
    ],
    [tenantPath]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Doctor Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live overview of your patients, appointments, queue, and clinical follow-ups.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actionCards.slice(0, 2).map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${action.tone}`}
              >
                <Icon className="h-4 w-4" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Total Patients" value={metrics.totalPatients ?? 0} subtitle="Active tenant registry" tone="info" icon={Users} />
        <KPICard title="Appointments Today" value={metrics.appointmentsToday ?? 0} subtitle="Scheduled for your list" tone="primary" icon={CalendarDays} />
        <KPICard title="Active Queue" value={metrics.activeQueue ?? 0} subtitle="Currently assigned to you" tone="warning" icon={ClipboardList} />
        <KPICard title="Pending Lab Follow-ups" value={metrics.pendingLabOrders ?? 0} subtitle="Recent orders awaiting closure" tone="success" icon={FlaskConical} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Clinical Pulse</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">Today&apos;s operating view</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Scheduled consults, completed encounters, queue load, and result review in one place.
              </p>
            </div>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Scheduled</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{scheduledToday}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{completedToday}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Visits</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{metrics.totalVisits ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Unread Lab Alerts</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{unreadLabNotifications.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Attention Queue</h2>
              <p className="text-sm text-muted-foreground">Clinical follow-up requiring action</p>
            </div>
            <BellRing className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-3">
            <button
              onClick={() => router.push(tenantPath("/doctor/lab-results"))}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-background/70 px-4 py-3 text-left hover:bg-muted/40"
            >
              <div>
                <p className="text-sm font-medium text-foreground">Pending Lab Reviews</p>
                <p className="text-xs text-muted-foreground">Accept published results and request repeats</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {metrics.pendingLabOrders ?? 0}
              </span>
            </button>
            <button
              onClick={() => router.push(tenantPath("/doctor/queue"))}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-background/70 px-4 py-3 text-left hover:bg-muted/40"
            >
              <div>
                <p className="text-sm font-medium text-foreground">Queue Load</p>
                <p className="text-xs text-muted-foreground">Open the live consultation queue</p>
              </div>
              <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning-soft-foreground">
                {metrics.activeQueue ?? 0}
              </span>
            </button>
          </div>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load doctor dashboard data.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DataCard
            title={`Today's Appointments (${appointments.length})`}
            items={appointments.map((item: any) => ({
              id: item.id,
              title: item.patientName || "Unknown patient",
              subtitle: formatDateTime(item.scheduledAt),
              value: item.status || "scheduled",
              status: item.status || "scheduled",
            }))}
            emptyMessage={isLoading ? "Loading appointments..." : "No appointments for today."}
            onItemClick={(item) => {
              router.push(tenantPath("/doctor/appointments"));
            }}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Quick Actions</h2>
                <p className="text-sm text-muted-foreground">Common doctor workflows</p>
              </div>
              <Stethoscope className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-4 grid gap-3">
              {actionCards.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.label} href={action.href} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm text-foreground transition-colors hover:bg-muted/40">
                    <span>{action.label}</span>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          </div>

          <DataCard
            title={`Queue Snapshot (${queueSnapshot.length})`}
            items={queueSnapshot.map((item: any) => ({
              id: item.id,
              title: item.patientName || "Unknown patient",
              subtitle: item.queueNumber ? `Queue ${item.queueNumber}` : "Assigned queue entry",
              value: item.position ?? "-",
              status: item.status || "waiting",
            }))}
            emptyMessage={isLoading ? "Loading queue..." : "No active queue entries."}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DataCard
          title={`Recent Lab Orders (${recentLabOrders.length})`}
          items={recentLabOrders.map((item: any) => ({
            id: item.id,
            title: item.patientName || "Unknown patient",
            subtitle: `Ordered ${formatDateTime(item.orderedAt)}`,
            status: item.status || "ordered",
          }))}
          emptyMessage={isLoading ? "Loading lab orders..." : "No recent lab orders."}
          onItemClick={() => router.push(tenantPath("/doctor/lab-orders"))}
        />
        <DataCard
          title={`Recent Prescriptions (${recentPrescriptions.length})`}
          items={recentPrescriptions.map((item: any) => ({
            id: item.id,
            title: item.patientName || "Unknown patient",
            subtitle: `Issued ${formatDateTime(item.prescribedAt)}`,
            status: "completed",
          }))}
          emptyMessage={isLoading ? "Loading prescriptions..." : "No recent prescriptions."}
          onItemClick={() => router.push(tenantPath("/doctor/prescriptions"))}
        />
      </div>
    </div>
  );
}
