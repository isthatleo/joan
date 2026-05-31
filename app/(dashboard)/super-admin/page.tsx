"use client";

import Link from "next/link";
import { DashboardGreeting } from "@/components/DashboardGreeting";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, StatCard, SectionCard } from "@/components/ui";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  DollarSign,
  FileText,
  Hospital,
  Loader2,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

type Tone = "primary" | "success" | "warning" | "info" | "destructive" | "neutral";

type DashboardPayload = {
  generatedAt: string;
  metrics: {
    hospitals: { total: number; active: number; inactive: number; trend: number };
    patients: { total: number; trend: number };
    users: { total: number; active: number; active24h: number; activeSessions: number; activeFromActivity24h: number };
    revenue: { total: number; today: number; thisMonth: number; trend: number; transactionCount: number; source: string };
    appointments: { today: number; completedToday: number; trend: number };
    invoices: { open: number; overdue: number };
    risk: {
      unresolvedSecurityEvents: number;
      criticalSecurityEvents: number;
      openFeedback: number;
      urgentFeedback: number;
      integrationErrors: number;
    };
    platform: {
      uptime: number;
      uptimeLabel: string;
      apiLatency: number;
      memoryUsage: number;
      memoryUsedMb: number;
      memoryTotalMb: number;
      databaseHealth: number;
      failureRate: number;
      eventVolume24h: number;
      integrationsActive: number;
      integrationsTotal: number;
      rolesTotal: number;
    };
  };
  topHospitals: Array<{
    id: string;
    name: string;
    slug: string;
    plan: string;
    isActive: boolean | null;
    patientCount: number;
    staffCount: number;
    revenue: number;
  }>;
  planDistribution: Array<{ plan: string; count: number; active: number }>;
  recentActivity: Array<{ id: string; action: string; actor: string; resource: string; status: string; timestamp: string }>;
  recentAudit: Array<{ id: string; action: string; entity: string; entityId: string | null; actor: string; timestamp: string }>;
  systemHealth: Array<{ name: string; status: string; value: string; score: number }>;
};

const TONE_BG: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  info: "bg-info-soft text-info-soft-foreground",
  destructive: "bg-destructive-soft text-destructive-soft-foreground",
  neutral: "bg-muted text-muted-foreground",
};

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

function trend(value: number) {
  return {
    value: `${value > 0 ? "+" : ""}${value}%`,
    direction: value > 0 ? "up" as const : value < 0 ? "down" as const : "neutral" as const,
  };
}

function statusTone(status: string): Tone {
  if (["operational", "success", "healthy"].includes(status)) return "success";
  if (["attention", "warning", "degraded"].includes(status)) return "warning";
  if (["failed", "error", "critical"].includes(status)) return "destructive";
  return "info";
}

function EmptyLine({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard(showInitialLoader = false) {
    if (showInitialLoader) setLoading(true);
    setRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/super-admin/dashboard", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to load super admin dashboard");
      setPayload(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load super admin dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDashboard(true);
  }, []);

  const planTotal = useMemo(
    () => Math.max(1, payload?.planDistribution.reduce((sum, item) => sum + item.count, 0) || 0),
    [payload]
  );

  const riskScore = payload
    ? payload.metrics.risk.criticalSecurityEvents * 3 +
      payload.metrics.risk.integrationErrors * 2 +
      payload.metrics.risk.urgentFeedback +
      payload.metrics.invoices.overdue
    : 0;

  return (
    <div>
      <DashboardGreeting roleLabel="Super Admin" />

      <br></br>
      <PageHeader
        title="Global Command Center"
        subtitle="Platform-wide healthcare intelligence, tenant operations, and system oversight."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadDashboard(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Loading real-time platform dashboard...
          </div>
        </div>
      ) : payload ? (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Hospitals" value={payload.metrics.hospitals.total} subtitle={`${payload.metrics.hospitals.active} active tenants`} icon={Hospital} tone="primary" trend={trend(payload.metrics.hospitals.trend)} />
            <StatCard title="Patients" value={compact.format(payload.metrics.patients.total)} subtitle="Across all tenants" icon={Users} tone="info" trend={trend(payload.metrics.patients.trend)} />
            <StatCard
              title="Platform Revenue Today"
              value={money.format(payload.metrics.revenue.today)}
              subtitle={`${money.format(payload.metrics.revenue.thisMonth)} this month from tenant subscriptions and fees`}
              icon={DollarSign}
              tone="success"
              trend={trend(payload.metrics.revenue.trend)}
            />
            <StatCard title="Server Uptime" value={payload.metrics.platform.uptimeLabel} subtitle={`${payload.metrics.platform.apiLatency}ms dashboard API latency`} icon={Activity} tone="success" />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              title="Active Users"
              value={payload.metrics.users.active24h.toLocaleString()}
              subtitle={`${payload.metrics.users.activeSessions.toLocaleString()} live sessions, ${payload.metrics.users.active.toLocaleString()} active accounts`}
              icon={Users}
              tone="info"
            />
            <StatCard title="Platform Events" value={compact.format(payload.metrics.platform.eventVolume24h)} subtitle={`${payload.metrics.platform.failureRate}% failure rate`} icon={Server} tone={payload.metrics.platform.failureRate > 1 ? "warning" : "primary"} />
            <StatCard title="Risk Queue" value={riskScore} subtitle={`${payload.metrics.risk.criticalSecurityEvents} critical security, ${payload.metrics.invoices.overdue} overdue invoices`} icon={AlertTriangle} tone={riskScore > 0 ? "warning" : "success"} />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Users"
              value={payload.metrics.users.total.toLocaleString()}
              subtitle={`${payload.metrics.users.active.toLocaleString()} active user accounts`}
              icon={Users}
              tone="primary"
            />
            <StatCard
              title="Appointments Today"
              value={payload.metrics.appointments.today.toLocaleString()}
              subtitle={`${payload.metrics.appointments.completedToday.toLocaleString()} completed today`}
              icon={Clock}
              tone="info"
              trend={trend(payload.metrics.appointments.trend)}
            />
            <StatCard
              title="Database Health"
              value={`${payload.metrics.platform.databaseHealth}%`}
              subtitle="Derived from unresolved critical security and integration issues"
              icon={Database}
              tone={payload.metrics.platform.databaseHealth < 90 ? "warning" : "success"}
            />
            <StatCard
              title="Memory Usage"
              value={`${payload.metrics.platform.memoryUsage}%`}
              subtitle={`${payload.metrics.platform.memoryUsedMb}MB / ${payload.metrics.platform.memoryTotalMb}MB server heap`}
              icon={Cpu}
              tone={payload.metrics.platform.memoryUsage > 85 ? "warning" : "success"}
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Inactive Hospitals"
              value={payload.metrics.hospitals.inactive}
              subtitle="Tenants currently paused or archived"
              icon={Hospital}
              tone={payload.metrics.hospitals.inactive ? "warning" : "success"}
            />
            <StatCard
              title="Monthly Revenue"
              value={money.format(payload.metrics.revenue.thisMonth)}
              subtitle={`${money.format(payload.metrics.revenue.total)} lifetime collected across ${payload.metrics.revenue.transactionCount.toLocaleString()} platform transactions`}
              icon={DollarSign}
              tone="success"
              trend={trend(payload.metrics.revenue.trend)}
            />
            <StatCard
              title="Security Events"
              value={payload.metrics.risk.unresolvedSecurityEvents}
              subtitle={`${payload.metrics.risk.criticalSecurityEvents} critical or high unresolved`}
              icon={ShieldCheck}
              tone={payload.metrics.risk.criticalSecurityEvents ? "destructive" : payload.metrics.risk.unresolvedSecurityEvents ? "warning" : "success"}
            />
            <StatCard
              title="API Latency"
              value={`${payload.metrics.platform.apiLatency}ms`}
              subtitle="Dashboard endpoint response time"
              icon={Activity}
              tone={payload.metrics.platform.apiLatency > 250 ? "warning" : "success"}
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <SectionCard
              title="Quick Actions"
              description="Operational shortcuts"
              className="lg:col-span-1"
            >
              <div className="grid gap-2">
                {[
                  { label: "Create or Manage Hospitals", href: "/super-admin/hospitals", icon: Building2 },
                  { label: "Manage Billing & Invoices", href: "/super-admin/billing", icon: FileText },
                  { label: "Manage Platform Users", href: "/super-admin/users", icon: Users },
                  { label: "Review Security Audit", href: "/super-admin/audit-logs", icon: ShieldCheck },
                  { label: "Open System Health", href: "/super-admin/system-health", icon: Cpu },
                  { label: "Configure Platform Settings", href: "/super-admin/settings", icon: Settings },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-muted"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1">{action.label}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard
              title="Top Hospitals"
              description="Ranked by platform subscription and service-fee revenue"
              className="lg:col-span-2"
              actions={<Link href="/super-admin/hospitals" className="text-sm font-semibold text-primary hover:underline">View all</Link>}
            >
              <div className="space-y-2">
                {payload.topHospitals.length ? payload.topHospitals.map((hospital) => (
                  <Link
                    key={hospital.id}
                    href={`/tenants/${hospital.slug}`}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3 transition hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                        <Hospital className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{hospital.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {hospital.plan} plan - {hospital.patientCount.toLocaleString()} patients - {hospital.staffCount.toLocaleString()} staff
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{money.format(hospital.revenue)}</p>
                      <p className={`text-xs ${hospital.isActive ? "text-success" : "text-destructive"}`}>
                        {hospital.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </Link>
                )) : <EmptyLine message="No platform subscription or service-fee revenue has been recorded yet." />}
              </div>
            </SectionCard>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard
              title="System Health"
              description="Live platform service indicators"
              actions={<Link href="/super-admin/system-health" className="text-sm font-semibold text-primary hover:underline">Details</Link>}
            >
              <div className="space-y-3">
                {payload.systemHealth.map((service) => {
                  const toneName = statusTone(service.status);
                  return (
                    <div key={service.name} className="rounded-lg border border-border bg-background p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${TONE_BG[toneName]}`}>
                            {service.name === "Database" ? <Database className="h-4 w-4" /> : service.name === "Memory" ? <Cpu className="h-4 w-4" /> : <Server className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{service.name}</p>
                            <p className="text-xs capitalize text-muted-foreground">{service.status}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-foreground">{service.value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, service.score))}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard
              title="Tenant Plan Distribution"
              description="Subscription mix and activation"
            >
              <div className="space-y-4">
                {payload.planDistribution.length ? payload.planDistribution.map((plan) => {
                  const pct = Math.round((plan.count / planTotal) * 100);
                  return (
                    <div key={plan.plan} className="rounded-lg border border-border bg-background p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{plan.plan}</p>
                        <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">{pct}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{plan.active} active of {plan.count} tenants</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                }) : <EmptyLine message="No tenant plans have been configured." />}
              </div>
            </SectionCard>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard
              title="Recent Platform Activity"
              description="Latest user and system events"
              actions={<Link href="/super-admin/audit" className="text-sm font-semibold text-primary hover:underline">Activity</Link>}
            >
              <div className="space-y-2">
                {payload.recentActivity.length ? payload.recentActivity.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.status === "success" ? "bg-success" : "bg-warning"}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.action}</p>
                        <p className="text-xs text-muted-foreground">{item.actor} - {item.resource}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                )) : <EmptyLine message="No recent activity has been recorded." />}
              </div>
            </SectionCard>

            <SectionCard
              title="Recent Audit Events"
              description="Latest privileged and administrative actions"
              actions={<Link href="/super-admin/audit-logs" className="text-sm font-semibold text-primary hover:underline">Audit logs</Link>}
            >
              <div className="space-y-2">
                {payload.recentAudit.length ? payload.recentAudit.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info-soft text-info-soft-foreground">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.actor} - {item.entity} - {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )) : <EmptyLine message="No audit events have been recorded." />}
              </div>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard title="Open Feedback" value={payload.metrics.risk.openFeedback} subtitle={`${payload.metrics.risk.urgentFeedback} urgent`} icon={AlertTriangle} tone={payload.metrics.risk.urgentFeedback ? "warning" : "info"} />
            <StatCard title="Open Platform Invoices" value={payload.metrics.invoices.open} subtitle={`${payload.metrics.invoices.overdue} overdue tenant billing invoices`} icon={DollarSign} tone={payload.metrics.invoices.overdue ? "warning" : "success"} />
            <StatCard title="Integrations" value={`${payload.metrics.platform.integrationsActive}/${payload.metrics.platform.integrationsTotal}`} subtitle={`${payload.metrics.risk.integrationErrors} errors`} icon={CheckCircle} tone={payload.metrics.risk.integrationErrors ? "warning" : "success"} />
            <StatCard title="Configured Roles" value={payload.metrics.platform.rolesTotal} subtitle="Across platform" icon={Users} tone="primary" />
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Last refreshed {new Date(payload.generatedAt).toLocaleString()}
          </p>
        </>
      ) : (
        <EmptyLine message="Dashboard data is unavailable." />
      )}
    </div>
  );
}
