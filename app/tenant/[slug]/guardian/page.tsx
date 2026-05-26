"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Baby, Bell, CalendarDays, CreditCard, FileText, HeartPulse, Microscope, RefreshCw, Users } from "lucide-react";
import { DashboardGreeting } from "@/components/DashboardGreeting";
import { ProfileModeToggle } from "@/components/ProfileModeToggle";

type DashboardData = {
  metrics: {
    totalChildren: number;
    activeChildren: number;
    upcomingAppointments: number;
    unreadAlerts: number;
    healthRecordsCount: number;
    averageHealthScore: number;
  };
  children: Array<{ id: string; name: string; age: number; gender: string; healthStatus: string; nextAppointment?: string | null; outstandingAmount: number }>;
  upcomingAppointments: Array<{ id: string; childId: string; childName: string; scheduledAt?: string | null; status: string }>;
  recentActivities: Array<{ id: string; type: string; title: string; description: string; childName: string; timestamp?: string | null }>;
  alerts: Array<{ id: string; title: string; message: string; childName?: string; read: boolean }>;
  currency: string;
  hasPatientRole?: boolean;
};

export default function GuardianDashboardPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData(showSpinner = true) {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/guardian/dashboard`, { cache: "no-store", credentials: "include" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to load guardian dashboard");
      }
      setError(null);
      setData(await response.json());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load guardian dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, [slug]);

  if (loading) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading guardian dashboard...</div>;
  if (!data) return <div className="flex h-full items-center justify-center text-sm text-destructive">{error || "Failed to load guardian dashboard"}</div>;

  const actions = [
    { href: `/tenant/${slug}/guardian/family`, label: "Family", icon: Users },
    { href: `/tenant/${slug}/guardian/book`, label: "Book Appointment", icon: CalendarDays },
    { href: `/tenant/${slug}/guardian/records`, label: "Health Records", icon: FileText },
    { href: `/tenant/${slug}/guardian/lab-results`, label: "Lab Results", icon: Microscope },
  ];

  return (
    <div className="space-y-6">
      <DashboardGreeting roleLabel="Guardian" />
      <ProfileModeToggle currentMode="guardian" hasPatientRole={data.hasPatientRole} hasGuardianRole />

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Guardian Dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Family health command center</h1>
          <p className="mt-2 text-sm text-muted-foreground">Live child health summaries, appointments, alerts, records, and billing visibility from the tenant care workflows.</p>
        </div>
        <button onClick={() => loadData()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <RefreshCw className={`mr-2 inline h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><Users className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Children</p><p className="mt-1 text-3xl font-semibold text-foreground">{data.metrics.totalChildren}</p><p className="text-xs text-muted-foreground">{data.metrics.activeChildren} active profiles</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><CalendarDays className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Upcoming appointments</p><p className="mt-1 text-3xl font-semibold text-foreground">{data.metrics.upcomingAppointments}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><Bell className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Unread alerts</p><p className="mt-1 text-3xl font-semibold text-foreground">{data.metrics.unreadAlerts}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><HeartPulse className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Average health score</p><p className="mt-1 text-3xl font-semibold text-foreground">{data.metrics.averageHealthScore}%</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.85fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">Children overview</h2>
            <Link href={`/tenant/${slug}/guardian/children`} className="text-sm font-medium text-primary hover:underline">Open child profiles</Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.children.map((child) => (
              <Link key={child.id} href={`/tenant/${slug}/guardian/children/${child.id}`} className="rounded-2xl border border-border bg-background p-4 hover:bg-muted/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{child.name}</p>
                    <p className="text-sm text-muted-foreground">Age {child.age} • {child.gender}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium capitalize text-primary">{child.healthStatus}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{child.nextAppointment ? new Date(child.nextAppointment).toLocaleDateString() : "No upcoming visit"}</span>
                  <span>{data.currency} {child.outstandingAmount.toFixed(2)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Quick actions</h2>
          <div className="mt-4 grid gap-3">
            {actions.map((action) => (
              <Link key={action.href} href={action.href} className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/60">
                <action.icon className="h-4 w-4 text-primary" />
                {action.label}
              </Link>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-border bg-background p-4">
            <p className="text-sm font-semibold text-foreground">Health records tracked</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{data.metrics.healthRecordsCount}</p>
            <p className="text-sm text-muted-foreground">Visits, prescriptions, and lab records visible from the child record timeline.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Upcoming appointments</h2>
          <div className="mt-4 space-y-3">
            {data.upcomingAppointments.length ? data.upcomingAppointments.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                <p className="font-medium text-foreground">{item.childName}</p>
                <p className="text-sm text-muted-foreground">{item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "Date pending"}</p>
              </div>
            )) : <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">No upcoming appointments.</div>}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Recent activity</h2>
          <div className="mt-4 space-y-3">
            {data.recentActivities.length ? data.recentActivities.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.childName} • {item.description}</p>
              </div>
            )) : <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">No recent activity.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
