"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Bell, ClipboardList, HeartPulse, Pill, RefreshCw, ShieldAlert, UserRound, Users } from "lucide-react";
import { Badge, Button, PageHeader, SectionCard, Skeleton } from "@/components/ui";
import { DashboardGreeting } from "@/components/DashboardGreeting";
import { withTenantPrefix } from "@/lib/tenant-routing";

function MetricCard({ title, value, subtitle, icon: Icon, tone }: { title: string; value: number; subtitle: string; icon: any; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function NurseDashboardPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const toTenantPath = (path: string) => withTenantPrefix(path, slug, hostname);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["tenant-nurse-dashboard", slug],
    queryFn: async () => {
      const response = await fetch(`/api/nurse/dashboard?slug=${slug}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load dashboard");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const metrics = data?.metrics;
  const quickActions = useMemo(
    () => [
      { label: "Open Patient Roster", href: "/nurse/patients", note: "Review assigned patients and status changes." },
      { label: "Record Vitals", href: "/nurse/vitals", note: "Capture high-frequency observations and escalations." },
      { label: "Medication Round", href: "/nurse/medications", note: "Administer due medications and close completed courses." },
      { label: "Care Plans", href: "/nurse/care-plans", note: "Track interventions, tasks, and outcomes." },
      { label: "Bed Board", href: "/nurse/beds", note: "Review admissions, discharges, and ward capacity." },
      { label: "Nursing Reports", href: "/nurse/analytics/nursing", note: "Generate shift-ready summaries and handover packs." },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <DashboardGreeting roleLabel="Nurse" />

      <PageHeader
        title="Nursing Operations Dashboard"
        subtitle="Live ward overview for patient safety, medication rounds, care plans, and shift handover."
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 w-full" />)
        ) : (
          <>
            <MetricCard title="Patients Under Care" value={metrics?.totalPatients ?? 0} subtitle={`${metrics?.bedsOccupied ?? 0} currently admitted in monitored beds`} icon={Users} tone="bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" />
            <MetricCard title="Vitals Escalations" value={metrics?.vitalsAlerts ?? 0} subtitle={`${metrics?.patientsOnWatchList ?? 0} patients on close watch`} icon={HeartPulse} tone="bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" />
            <MetricCard title="Medications Due" value={metrics?.medicationsDue ?? 0} subtitle="Within the next two hours" icon={Pill} tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" />
            <MetricCard title="Open Care Tasks" value={metrics?.pendingTasks ?? 0} subtitle={`${metrics?.completedTasks ?? 0} completed today`} icon={ClipboardList} tone="bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard title="Attention Board" description="High-priority clinical signals that need action this shift.">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {data?.vitalsAlerts?.length ? data.vitalsAlerts.map((alert: any) => (
                <div key={alert.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{alert.patientName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Room {alert.room || "Unassigned"}</p>
                      <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">BP {alert.bloodPressure || "-"} | HR {alert.heartRate || "-"} | Temp {alert.temperature || "-"}</p>
                    </div>
                    <Badge variant={alert.status === "critical" ? "destructive" : "outline"}>{alert.status}</Badge>
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">No active vitals escalations right now.</p>}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Shift Quick Actions" description="Fast links for the most common nursing workflows.">
          <div className="space-y-3">
            {quickActions.map((action) => (
              <Link key={action.href} href={toTenantPath(action.href)} className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/40">
                <div>
                  <p className="text-sm font-semibold text-foreground">{action.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{action.note}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <SectionCard title="Medication Window" description="Next doses queued for administration." actions={<Link href={toTenantPath("/nurse/medications")} className="text-sm font-medium text-primary">Open round</Link>}>
          {isLoading ? <Skeleton className="h-56 w-full" /> : (
            <div className="space-y-3">
              {data?.medicationsDue?.length ? data.medicationsDue.map((medication: any) => (
                <div key={medication.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{medication.medication || "Medication"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{medication.patientName} | {medication.ward || "Ward"} / {medication.room || "Room"}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{medication.dosage || "Dose pending"} | {medication.route || "Route pending"}</p>
                    </div>
                    <Badge variant="outline">{medication.dueTime}</Badge>
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">No medications due in the next two hours.</p>}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Patients Snapshot" description="Current roster with bed and condition context." actions={<Link href={toTenantPath("/nurse/patients")} className="text-sm font-medium text-primary">View roster</Link>}>
          {isLoading ? <Skeleton className="h-56 w-full" /> : (
            <div className="space-y-3">
              {data?.patients?.map((patient: any) => (
                <div key={patient.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{patient.firstName} {patient.lastName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{patient.ward || "Ward"} | Room {patient.room || "-"}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{patient.condition || "Condition not documented yet."}</p>
                    </div>
                    <Badge variant="outline">{patient.status || "active"}</Badge>
                  </div>
                </div>
              )) || <p className="text-sm text-muted-foreground">No assigned patients found.</p>}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Care Tasks" description="Pending care-plan tasks and interventions for this shift." actions={<Link href={toTenantPath("/nurse/care-plans")} className="text-sm font-medium text-primary">Open plans</Link>}>
          {isLoading ? <Skeleton className="h-56 w-full" /> : (
            <div className="space-y-3">
              {data?.tasks?.length ? data.tasks.map((task: any) => (
                <div key={task.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{task.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{task.patientName}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Due {task.dueAt ? new Date(task.dueAt).toLocaleString() : "this shift"}</p>
                    </div>
                    <Badge variant="outline">{task.planPriority || "routine"}</Badge>
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">No open care tasks right now.</p>}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Safety Signals" description="Unread notifications and bedside alerts routed to nursing.">
          {isLoading ? <Skeleton className="h-44 w-full" /> : (
            <div className="space-y-3">
              {data?.notifications?.length ? data.notifications.map((notification: any) => (
                <div key={notification.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-orange-50 p-2 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                    </div>
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">No unread nursing notifications.</p>}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Operational Focus" description="What matters most before the next handover.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><ShieldAlert className="h-4 w-4 text-rose-500" /> Watch List</div>
              <p className="mt-3 text-3xl font-semibold text-foreground">{metrics?.patientsOnWatchList ?? 0}</p>
              <p className="mt-2 text-xs text-muted-foreground">Patients with abnormal vitals or escalating trends.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><UserRound className="h-4 w-4 text-blue-500" /> Bed Capacity</div>
              <p className="mt-3 text-3xl font-semibold text-foreground">{metrics?.bedsAvailable ?? 0}</p>
              <p className="mt-2 text-xs text-muted-foreground">Beds available for transfers, admissions, or step-down care.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4 sm:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><AlertTriangle className="h-4 w-4 text-amber-500" /> Queue Pressure</div>
              <p className="mt-3 text-3xl font-semibold text-foreground">{metrics?.activeQueue ?? 0}</p>
              <p className="mt-2 text-xs text-muted-foreground">Patients still waiting for nursing preparation, transfer, or task completion.</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
