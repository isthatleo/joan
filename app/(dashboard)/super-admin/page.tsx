"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PageHeader,
  StatCard,
  SectionCard,
} from "@/components/ui";
import {
  Activity,
  Hospital,
  Users,
  DollarSign,
  Server,
  ShieldCheck,
  Database,
  Cpu,
  AlertTriangle,
  TrendingUp,
  Clock,
  FileText,
} from "lucide-react";

type Tenant = { id: string; name: string; plan: string; isActive: boolean };
type Stats = { total: number; active: number; inactive: number };
type Usage = {
  totalApiCalls: number;
  totalActiveUsers: number;
  averageResponseTime: number;
  topConsumers: { id: string; name: string; apiCalls: number; storageUsed: number }[];
};

type Tone = "primary" | "success" | "warning" | "info" | "destructive" | "neutral";
const TONE_BG: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  info: "bg-info-soft text-info-soft-foreground",
  destructive: "bg-destructive-soft text-destructive-soft-foreground",
  neutral: "bg-muted text-muted-foreground",
};

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    fetch("/api/tenants").then((r) => r.json()).then((d) => setTenants(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/tenants?stats=true").then((r) => r.json()).then(setStats).catch(() => {});
    fetch("/api/tenants?usage=true").then((r) => r.json()).then(setUsage).catch(() => {});
  }, []);

  const planDistribution = useMemo(() => {
    const list = tenants;
    const counts: Record<string, number> = { Premium: 0, Standard: 0, Basic: 0 };
    list.forEach((t: any) => {
      if (counts[t.plan] !== undefined) counts[t.plan]++;
    });
    const total = list.length || 1;
    return [
      { name: "Premium", count: counts.Premium, pct: Math.round((counts.Premium / total) * 100), tone: "primary" as const },
      { name: "Standard", count: counts.Standard, pct: Math.round((counts.Standard / total) * 100), tone: "info" as const },
      { name: "Basic", count: counts.Basic, pct: Math.round((counts.Basic / total) * 100), tone: "neutral" as const },
    ];
  }, [tenants]);

  const totalHospitals = stats?.total ?? (Array.isArray(tenants) ? tenants.length : 0);
  const activeHospitals = stats?.active ?? 0;
  const apiCalls = usage?.totalApiCalls ? `${(usage.totalApiCalls / 1_000_000).toFixed(1)}M` : "—";
  const activeUsers = usage?.totalActiveUsers?.toLocaleString() ?? "—";

  return (
    <div>
      <PageHeader
        title="Global Command Center"
        subtitle="Platform-wide healthcare intelligence and system oversight."
      />

      {/* PRIMARY KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Hospitals"
          value={totalHospitals}
          subtitle={`${activeHospitals} active tenants`}
          icon={Hospital}
          tone="primary"
          trend={{ value: "+3 this month", direction: "up" }}
        />
        <StatCard
          title="Patients"
          value="124,850"
          subtitle="Across platform"
          icon={Users}
          tone="info"
          trend={{ value: "+12.4%", direction: "up" }}
        />
        <StatCard
          title="Revenue (24h)"
          value="$287,450"
          subtitle="All tenants"
          icon={DollarSign}
          tone="success"
          trend={{ value: "+8.1%", direction: "up" }}
        />
        <StatCard
          title="System Uptime"
          value="99.98%"
          subtitle="All services operational"
          icon={Activity}
          tone="success"
        />
      </div>

      {/* SECONDARY KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Active Users" value={activeUsers} subtitle="Last 24 hours" icon={Users} tone="info" />
        <StatCard title="API Requests" value={apiCalls} subtitle="24h usage" icon={Server} tone="primary" />
        <StatCard title="DB Load" value="62%" subtitle="Healthy" icon={Database} tone="success" />
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard
          title="Top Hospitals"
          description="Highest revenue contributors"
          actions={
            <a href="/super-admin/hospitals" className="text-sm font-medium text-primary hover:underline">
              View all
            </a>
          }
        >
          <div className="space-y-2">
            {(usage?.topConsumers ?? [
              { id: "1", name: "City Medical Center", apiCalls: 542000, storageUsed: 0 },
              { id: "2", name: "County Hospital", apiCalls: 421000, storageUsed: 0 },
              { id: "3", name: "Private Clinic", apiCalls: 398000, storageUsed: 0 },
              { id: "4", name: "Medical University", apiCalls: 334000, storageUsed: 0 },
            ]).map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                    <Hospital className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{h.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(h.apiCalls / 1000).toFixed(0)}K API calls
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  ${((h.apiCalls / 10) | 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="System Activity"
          description="Recent events & alerts"
          actions={
            <a href="/super-admin/audit-logs" className="text-sm font-medium text-primary hover:underline">
              Audit logs
            </a>
          }
        >
          <div className="space-y-2">
            {[
              { title: "Database load spike resolved", time: "2m ago", icon: Database, tone: "warning" as const },
              { title: "Nightly backup completed", time: "1h ago", icon: ShieldCheck, tone: "success" as const },
              { title: "Security scan finished", time: "2h ago", icon: ShieldCheck, tone: "info" as const },
              { title: "API usage rising on tenant #12", time: "5m ago", icon: TrendingUp, tone: "primary" as const },
              { title: "New tenant onboarded: Wellness Clinic", time: "3h ago", icon: Hospital, tone: "primary" as const },
            ].map((a, i) => {
              const Icon = a.icon;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONE_BG[a.tone]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm text-foreground">{a.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {a.time}
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* DISTRIBUTION */}
      <SectionCard
        title="Subscription Distribution"
        description="Tenant plan breakdown"
        className="mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {planDistribution.map((plan, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{plan.name}</p>
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${TONE_BG[plan.tone]}`}>
                  {plan.pct}%
                </span>
              </div>
              <p className="text-2xl font-semibold text-foreground mt-2">{plan.count}</p>
              <p className="text-xs text-muted-foreground mt-1">tenants on this plan</p>
              <div className="mt-3 h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${plan.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* INFRASTRUCTURE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Infrastructure Health" description="Real-time service status">
          <div className="space-y-3">
            {[
              { name: "API Gateway", status: "Operational", uptime: "99.99%", icon: Server, tone: "success" as const },
              { name: "PostgreSQL (Neon)", status: "Operational", uptime: "99.98%", icon: Database, tone: "success" as const },
              { name: "Redis Cache", status: "Operational", uptime: "99.95%", icon: Cpu, tone: "success" as const },
              { name: "AI Gateway", status: "Degraded", uptime: "97.20%", icon: AlertTriangle, tone: "warning" as const },
              { name: "Storage", status: "Operational", uptime: "100%", icon: ShieldCheck, tone: "success" as const },
            ].map((svc, i) => {
              const Icon = svc.icon;
              return (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONE_BG[svc.tone]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{svc.name}</p>
                      <p className="text-xs text-muted-foreground">{svc.status}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{svc.uptime}</p>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Recent Audit Events" description="Latest privileged actions">
          <div className="space-y-3">
            {[
              { actor: "leonardlomude", action: "Created tenant", target: "Wellness Clinic", time: "10m ago" },
              { actor: "system", action: "Rotated API key", target: "tenant-12", time: "1h ago" },
              { actor: "sarah.j", action: "Updated plan", target: "City Medical → Premium", time: "3h ago" },
              { actor: "leonardlomude", action: "Suspended tenant", target: "Old Clinic", time: "5h ago" },
            ].map((evt, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-soft text-info-soft-foreground">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{evt.actor}</span>{" "}
                    <span className="text-muted-foreground">{evt.action}</span>{" "}
                    <span className="font-medium">{evt.target}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{evt.time}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* FOOTER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Compliance Score"
          value="98.5%"
          subtitle="System-wide HIPAA"
          icon={ShieldCheck}
          tone="success"
        />
        <StatCard
          title="Audit Events"
          value="2,847"
          subtitle="This month"
          icon={FileText}
          tone="info"
        />
        <StatCard
          title="Configured Roles"
          value="10"
          subtitle="Across all tenants"
          icon={Users}
          tone="primary"
        />
      </div>
    </div>
  );
}
