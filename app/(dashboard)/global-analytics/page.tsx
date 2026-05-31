"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarDays,
  Clock3,
  Download,
  FileText,
  FlaskConical,
  Loader2,
  ReceiptText,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

type Analytics = {
  generatedAt: string;
  queryLatencyMs: number;
  totalHospitals: number;
  activeHospitals: number;
  newHospitals30d: number;
  totalPatients: number;
  totalAppointments: number;
  totalVisits: number;
  totalLabOrders: number;
  totalPrescriptions: number;
  liveSessions: number;
  totalRevenue: number;
  platformRevenue: number;
  patientRevenue: number;
  paidPlatformRevenue: number;
  openPlatformInvoices: number;
  overdueInvoices: number;
  monthlyRecurring: number;
  revenueTrend: number;
  systemUptime: number;
  systemLoad: number;
  databaseHealth: number;
  apiLatency: number;
  errorRate: number;
  highRiskEvents: number;
  unresolvedSecurityEvents: number;
  planDistribution: Array<{ plan: string; count: number; revenue: number; mrrCapacity: number }>;
  topRevenueTenants: Array<{ id: string; name: string; slug: string; plan: string; patients: number; revenue: number; platformRevenue: number; patientRevenue: number; activity: number }>;
  revenueTrends: { thisMonth: number; lastMonth: number; growth: number; target: number; months: Array<{ label: string; revenue: number; invoices: number }> };
  systemMetrics: Array<{ label: string; value: string; status: "excellent" | "good" | "warning" }>;
  recentActivity: Array<{ id: string; type: string; message: string; timestamp: string }>;
};

const money = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
const number = (value: number) => new Intl.NumberFormat().format(value || 0);

export default function GlobalAnalyticsPage() {
  const [tab, setTab] = useState<"command" | "revenue" | "operations" | "risk">("command");
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["global-analytics-revamp"],
    queryFn: async () => {
      const response = await fetch("/api/global-analytics", { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to fetch global analytics");
      return payload as Analytics;
    },
    refetchInterval: 60000,
  });

  const maxMonthRevenue = useMemo(() => Math.max(...(data?.revenueTrends?.months || []).map((item) => item.revenue), 1), [data]);
  const avgPatientsPerHospital = Math.round((data?.totalPatients || 0) / Math.max(data?.activeHospitals || 1, 1));
  const clinicalThroughput = (data?.totalAppointments || 0) + (data?.totalVisits || 0);
  const collectedRate = (data?.platformRevenue || 0) > 0 ? Math.round(((data?.paidPlatformRevenue || 0) / (data?.platformRevenue || 1)) * 100) : 0;

  function exportCsv() {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total hospitals", data.totalHospitals],
      ["Active hospitals", data.activeHospitals],
      ["Total patients", data.totalPatients],
      ["Platform revenue", data.platformRevenue],
      ["Patient revenue", data.patientRevenue],
      ["Open platform invoices", data.openPlatformInvoices],
      ["System uptime", data.systemUptime],
      ["API latency", data.apiLatency],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `global-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Analytics"
        subtitle="Platform-wide tenant, revenue, usage, operations, and risk intelligence."
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => refetch()} disabled={isFetching} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-60">
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white">
              <Download className="size-4" /> Export CSV
            </button>
          </div>
        }
      />

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">{(error as Error).message}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={ReceiptText} title="Platform Revenue" value={money(data?.platformRevenue || 0)} detail={`${data?.revenueTrend || 0}% monthly trend`} />
        <Metric icon={Building2} title="Active Hospitals" value={number(data?.activeHospitals || 0)} detail={`${number(data?.totalHospitals || 0)} total hospitals`} />
        <Metric icon={Users} title="Live Sessions" value={number(data?.liveSessions || 0)} detail="Currently active tenant sessions" />
        <Metric icon={ShieldCheck} title="System Uptime" value={`${data?.systemUptime || 0}%`} detail={`${data?.apiLatency || 0}ms average API latency`} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric icon={Stethoscope} title="Patients" value={number(data?.totalPatients || 0)} detail="Across all tenants" />
        <Metric icon={CalendarDays} title="Appointments" value={number(data?.totalAppointments || 0)} detail={`${number(data?.totalVisits || 0)} visits`} />
        <Metric icon={FlaskConical} title="Lab Orders" value={number(data?.totalLabOrders || 0)} detail="Total lab workload" />
        <Metric icon={FileText} title="Prescriptions" value={number(data?.totalPrescriptions || 0)} detail="Medication records" />
        <Metric icon={ReceiptText} title="Open Invoices" value={number(data?.openPlatformInvoices || 0)} detail={`${data?.overdueInvoices || 0} overdue`} />
        <Metric icon={ShieldAlert} title="Risk Events" value={number(data?.highRiskEvents || 0)} detail={`${data?.unresolvedSecurityEvents || 0} unresolved`} />
      </div>

      <nav className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-2">
        {[
          ["command", "Command"],
          ["revenue", "Revenue"],
          ["operations", "Operations"],
          ["risk", "Risk & Health"],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === id ? "bg-orange-500 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </nav>

      {tab === "command" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricPanel icon={Building2} label="New Hospitals" value={number(data?.newHospitals30d || 0)} detail="Provisioned in the last 30 days" />
            <MetricPanel icon={Users} label="Avg Patients / Hospital" value={number(avgPatientsPerHospital)} detail="Patient density across active tenants" />
            <MetricPanel icon={Activity} label="Tenant Activity" value={number((data?.topRevenueTenants || []).reduce((sum, tenant) => sum + tenant.activity, 0))} detail="Top-tenant events in current window" />
            <MetricPanel icon={Clock3} label="Generated In" value={`${data?.queryLatencyMs || 0}ms`} detail="Analytics query generation time" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader><CardTitle>Top Tenant Performance</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(data?.topRevenueTenants || []).map((tenant, index) => (
                  <div key={tenant.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-200">{index + 1}</div>
                        <div className="min-w-0">
                          <p className="font-bold">{tenant.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{tenant.slug} / {tenant.plan || "Unassigned"}</p>
                        </div>
                      </div>
                      <Badge className="w-fit">{money(tenant.revenue)}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                      <span>{number(tenant.patients)} patients</span>
                      <span>{money(tenant.platformRevenue)} platform</span>
                      <span>{money(tenant.patientRevenue)} patient billing</span>
                      <span>{number(tenant.activity)} events</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Plan Mix</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {(data?.planDistribution || []).map((plan) => (
                  <div key={plan.plan}>
                    <div className="mb-2 flex flex-col gap-1 text-sm sm:flex-row sm:justify-between">
                      <span className="font-semibold">{plan.plan}</span>
                      <span className="text-muted-foreground">{plan.count} tenants</span>
                    </div>
                    <Progress value={(plan.count / Math.max(data?.totalHospitals || 1, 1)) * 100} />
                    <p className="mt-1 text-xs text-muted-foreground">{money(plan.revenue)} billed, {money(plan.mrrCapacity)} MRR capacity</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "revenue" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricPanel icon={TrendingUp} label="MRR This Month" value={money(data?.monthlyRecurring || 0)} detail={`${data?.revenueTrend || 0}% vs previous month`} />
            <MetricPanel icon={ReceiptText} label="Collected" value={money(data?.paidPlatformRevenue || 0)} detail={`${collectedRate}% of platform revenue`} />
            <MetricPanel icon={FileText} label="Open Invoices" value={number(data?.openPlatformInvoices || 0)} detail="Draft, sent, and overdue invoices" />
            <MetricPanel icon={AlertTriangle} label="Overdue" value={number(data?.overdueInvoices || 0)} detail="Invoices past due date" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Six-Month Platform Revenue</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {(data?.revenueTrends?.months || []).map((month) => (
                  <div key={month.label}>
                    <div className="mb-2 flex flex-col gap-1 text-sm sm:flex-row sm:justify-between">
                      <span className="font-semibold">{month.label}</span>
                      <span>{money(month.revenue)} / {month.invoices} invoices</span>
                    </div>
                    <Progress value={(month.revenue / maxMonthRevenue) * 100} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Revenue Composition</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <Split label="Platform billing" value={data?.platformRevenue || 0} total={data?.totalRevenue || 1} />
                <Split label="Tenant patient billing" value={data?.patientRevenue || 0} total={data?.totalRevenue || 1} />
                <Split label="Collected platform revenue" value={data?.paidPlatformRevenue || 0} total={data?.platformRevenue || 1} />
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100">
                  Monthly recurring this month is <strong>{money(data?.monthlyRecurring || 0)}</strong>. Open platform invoices: <strong>{data?.openPlatformInvoices || 0}</strong>.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "operations" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricPanel icon={Users} label="Patient Density" value={number(avgPatientsPerHospital)} detail="Average patients per active hospital" />
            <MetricPanel icon={Activity} label="Clinical Throughput" value={number(clinicalThroughput)} detail="Appointments plus visits" />
            <MetricPanel icon={FlaskConical} label="Lab Workload" value={number(data?.totalLabOrders || 0)} detail="Total lab orders" />
            <MetricPanel icon={FileText} label="Prescription Load" value={number(data?.totalPrescriptions || 0)} detail="Total prescription records" />
            <MetricPanel icon={CalendarDays} label="Appointments" value={number(data?.totalAppointments || 0)} detail="Scheduled care workload" />
            <MetricPanel icon={Stethoscope} label="Visits" value={number(data?.totalVisits || 0)} detail="Completed clinical encounters" />
            <MetricPanel icon={Zap} label="API Latency" value={`${data?.apiLatency || 0}ms`} detail="Average response time" />
            <MetricPanel icon={Clock3} label="Query Runtime" value={`${data?.queryLatencyMs || 0}ms`} detail="Analytics endpoint generation time" />
          </div>

          <Card>
            <CardHeader><CardTitle>Recent Platform Activity</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {(data?.recentActivity || []).map((activity) => (
                <div key={activity.id} className="rounded-xl border border-border bg-background p-3">
                  <p className="break-words text-sm font-semibold">{activity.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "risk" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricPanel icon={ShieldCheck} label="Uptime" value={`${data?.systemUptime || 0}%`} detail="Derived from current event/error rate" />
            <MetricPanel icon={Activity} label="System Load" value={`${Math.round(data?.systemLoad || 0)}%`} detail="CPU and memory rollup" />
            <MetricPanel icon={ShieldAlert} label="High Risk Events" value={number(data?.highRiskEvents || 0)} detail="High and critical security events" />
            <MetricPanel icon={AlertTriangle} label="Unresolved Events" value={number(data?.unresolvedSecurityEvents || 0)} detail="Security events awaiting resolution" />
            <MetricPanel icon={Zap} label="Error Rate" value={`${data?.errorRate || 0}%`} detail="Current analytics risk window" />
            <MetricPanel icon={ShieldCheck} label="Database Health" value={`${Math.round(data?.databaseHealth || 0)}%`} detail="Health score from unresolved risk" />
            <MetricPanel icon={Clock3} label="API Latency" value={`${data?.apiLatency || 0}ms`} detail="Recent response average" />
            <MetricPanel icon={Users} label="Live Sessions" value={number(data?.liveSessions || 0)} detail="Currently authenticated activity" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>System Health Matrix</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(data?.systemMetrics || []).map((metric) => (
                  <div key={metric.label} className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{metric.label}</p>
                      <p className="text-sm text-muted-foreground">{metric.value}</p>
                    </div>
                    <Badge variant={metric.status === "warning" ? "destructive" : "default"}>{metric.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Risk Radar</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Risk label="System load" value={data?.systemLoad || 0} />
                <Risk label="Database health" value={data?.databaseHealth || 0} inverse />
                <Risk label="Error rate" value={Math.min((data?.errorRate || 0) * 10, 100)} />
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  <AlertTriangle className="mb-2 size-5" />
                  {data?.highRiskEvents ? `${data.highRiskEvents} high-risk events need review.` : "No high-risk security events in the current window."}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, title, value, detail }: { icon: any; title: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icon className="mb-3 size-5 text-orange-500" />
        <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
        <p className="mt-1 break-words text-xl font-bold text-foreground sm:text-2xl">{value}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function MetricPanel({ icon: Icon, label, value, detail }: { icon: any; label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <Icon className="mb-4 size-5 text-orange-500" />
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <p className="mt-2 break-words text-2xl font-bold text-foreground">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function Split({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div>
      <div className="mb-2 flex flex-col gap-1 text-sm sm:flex-row sm:justify-between">
        <span className="font-semibold">{label}</span>
        <span>{money(value)}</span>
      </div>
      <Progress value={(value / Math.max(total, 1)) * 100} />
    </div>
  );
}

function Risk({ label, value, inverse = false }: { label: string; value: number; inverse?: boolean }) {
  const display = inverse ? 100 - value : value;
  return (
    <div>
      <div className="mb-2 flex justify-between gap-3 text-sm">
        <span className="font-semibold">{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <Progress value={Math.max(0, Math.min(100, display))} />
    </div>
  );
}
