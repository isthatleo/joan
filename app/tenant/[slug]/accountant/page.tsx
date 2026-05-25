"use client";

import { DashboardGreeting } from "@/components/DashboardGreeting";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CheckCircle,
  DollarSign,
  Loader2,
  Plus,
  TrendingUp,
  Users,
  RefreshCw,
  LineChart,
} from "lucide-react";
import Link from "next/link";
import { useTenantPath } from "@/hooks/useTenantPath";

const orange = "#F97316";

interface AccountantDashboardMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  pendingInvoices: number;
  pendingPayments: number;
  totalPatients: number;
  collectionsRate: number;
  outstandingBalance: number;
  averagePaymentTime: number;
}

interface RecentInvoice {
  id: string;
  patientName: string;
  amount: number;
  status: "pending" | "paid" | "overdue" | "partial";
  dueDate: string;
  issueDate: string;
}

interface RecentActivity {
  id: string;
  type: "payment" | "invoice" | "claim" | "adjustment";
  title: string;
  description: string;
  amount?: number;
  timestamp: string;
}

interface Alert {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendDirection,
  onClick,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: string;
  trendDirection?: "up" | "down";
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={`rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-orange-300/70 hover:shadow-md ${onClick ? "cursor-pointer" : ""}`}
  >
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="rounded-xl bg-orange-500/10 p-2.5 text-orange-500">{icon}</div>
      {trend ? (
        <div
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${trendDirection === "up" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-red-500/10 text-red-600 dark:text-red-300"}`}
        >
          {trendDirection === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />} {trend}
        </div>
      ) : null}
    </div>
    <h3 className="mb-1 text-sm font-medium text-muted-foreground">{title}</h3>
    <p className="mb-1 text-2xl font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{subtitle}</p>
  </div>
);

export default function AccountantDashboard() {
  const params = useParams();
  const slug = params?.slug as string;
  const tenantPath = useTenantPath();
  const [metrics, setMetrics] = useState<AccountantDashboardMetrics | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void fetchDashboardData();
    const interval = setInterval(() => {
      void fetchDashboardData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [metricsRes, invoicesRes, activitiesRes, alertsRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/accountant/dashboard`),
        fetch(`/api/tenant/${slug}/accountant/invoices?recent=true`),
        fetch(`/api/tenant/${slug}/accountant/activities`),
        fetch(`/api/tenant/${slug}/accountant/alerts`),
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (invoicesRes.ok) {
        const payload = await invoicesRes.json();
        setRecentInvoices(Array.isArray(payload) ? payload : payload.invoices || []);
      }
      if (activitiesRes.ok) setRecentActivities(await activitiesRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading financial dashboard...
        </div>
      </div>
    );
  }

  const quickActions = [
    { icon: Plus, label: "Create Invoice", color: "bg-blue-500/10 text-blue-600 dark:text-blue-300", href: tenantPath("/accountant/billing/invoices/new") },
    { icon: DollarSign, label: "Record Payment", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300", href: tenantPath("/accountant/payments/new") },
    { icon: TrendingUp, label: "Revenue Report", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300", href: tenantPath("/accountant/analytics/revenue") },
    { icon: Users, label: "View Patients", color: "bg-violet-500/10 text-violet-600 dark:text-violet-300", href: tenantPath("/accountant/patients") },
    { icon: LineChart, label: "Financial Analysis", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300", href: tenantPath("/accountant/analytics/financial") },
    { icon: CheckCircle, label: "Insurance Claims", color: "bg-orange-500/10 text-orange-600 dark:text-orange-300", href: tenantPath("/accountant/insurance-claims") },
  ];

  return (
    <div className="space-y-6">
      <DashboardGreeting roleLabel="Accountant" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Accountant Dashboard</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Financial Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">Real-time financial metrics and payment tracking.</p>
        </div>
        <button
          onClick={() => void fetchDashboardData()}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {alerts.length > 0 ? (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const tone =
              alert.type === "warning"
                ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-900 dark:text-yellow-200"
                : alert.type === "error"
                  ? "border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-200"
                  : alert.type === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                    : "border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-200";

            return (
              <div key={alert.id} className={`rounded-2xl border p-4 ${tone}`}>
                <div className="flex items-start gap-3">
                  {alert.type === "warning" || alert.type === "error" ? <AlertCircle className="mt-0.5 h-4 w-4" /> : <CheckCircle className="mt-0.5 h-4 w-4" />}
                  <div>
                    <p className="font-semibold">{alert.title}</p>
                    <p className="mt-1 text-sm opacity-90">{alert.message}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Revenue" value={`$${metrics?.totalRevenue?.toFixed(2) || "0.00"}`} subtitle="Year to date" icon={<DollarSign className="h-6 w-6" />} trend={`${metrics?.revenueGrowth}%`} trendDirection={metrics?.revenueGrowth && metrics.revenueGrowth >= 0 ? "up" : "down"} />
        <StatCard title="Pending Invoices" value={metrics?.pendingInvoices ?? 0} subtitle="Awaiting payment" icon={<Bell className="h-6 w-6" />} />
        <StatCard title="Outstanding Balance" value={`$${metrics?.outstandingBalance?.toFixed(2) || "0.00"}`} subtitle="Total due" icon={<TrendingUp className="h-6 w-6" />} />
        <StatCard title="Collections Rate" value={`${metrics?.collectionsRate}%`} subtitle="Payment success" icon={<CheckCircle className="h-6 w-6" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Pending Payments" value={metrics?.pendingPayments ?? 0} subtitle="To be processed" icon={<DollarSign className="h-6 w-6" />} />
        <StatCard title="Total Patients" value={metrics?.totalPatients ?? 0} subtitle="Active accounts" icon={<Users className="h-6 w-6" />} />
        <StatCard title="Avg Payment Time" value={`${metrics?.averagePaymentTime ?? 0} days`} subtitle="Invoice to cash" icon={<Activity className="h-6 w-6" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm xl:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <DollarSign className="h-5 w-5 text-orange-500" />
            Recent Invoices
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentInvoices.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Bell className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p>No recent invoices</p>
              </div>
            ) : (
              recentInvoices.map((invoice) => (
                <div key={invoice.id} className="rounded-xl border border-border bg-background/60 p-4 transition hover:border-orange-300/70 hover:bg-orange-500/5">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{invoice.patientName}</p>
                      <p className="text-xs text-muted-foreground">Invoice #{invoice.id}</p>
                    </div>
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${
                        invoice.status === "paid"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                          : invoice.status === "overdue"
                            ? "bg-red-500/10 text-red-600 dark:text-red-300"
                            : invoice.status === "partial"
                              ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-300"
                      }`}
                    >
                      {invoice.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-muted-foreground">Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                    <span className="font-semibold text-foreground">${invoice.amount.toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <DollarSign className="h-5 w-5 text-orange-500" />
            Quick Actions
          </h2>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`flex w-full items-center gap-2 rounded-xl border border-border px-3 py-3 text-left text-sm font-semibold transition hover:border-orange-300/70 ${action.color}`}
              >
                <action.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{action.label}</span>
                <ArrowRight className="ml-auto h-3 w-3 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
          <Activity className="h-5 w-5 text-orange-500" />
          Recent Activity
        </h2>
        <div className="space-y-3">
          {recentActivities.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Activity className="mx-auto mb-2 h-12 w-12 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-3 transition hover:bg-muted/40">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-orange-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{activity.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground/80">{new Date(activity.timestamp).toLocaleTimeString()}</p>
                </div>
                {activity.amount ? <p className="whitespace-nowrap text-sm font-semibold text-foreground">${activity.amount.toFixed(2)}</p> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
