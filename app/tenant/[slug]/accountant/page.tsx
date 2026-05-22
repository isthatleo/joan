"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  LayoutDashboard, DollarSign, TrendingUp, Activity, AlertCircle,
  CheckCircle, Download, RefreshCw, Plus, LineChart, PieChart, Users, ArrowRight, Loader2, Bell
} from "lucide-react";
import Link from "next/link";

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
  icon: Icon,
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
    className={`p-6 rounded-2xl border border-gray-200 bg-white hover:shadow-lg transition-all ${
      onClick ? "cursor-pointer" : ""
    }`}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="p-2.5 rounded-xl bg-orange-50 text-orange-500">
        {Icon}
      </div>
      {trend && (
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
            trendDirection === "up"
              ? "text-green-600 bg-green-50"
              : "text-red-600 bg-red-50"
          }`}
        >
          {trendDirection === "up" ? "↑" : "↓"} {trend}
        </div>
      )}
    </div>
    <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
    <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
    <p className="text-xs text-gray-500">{subtitle}</p>
  </div>
);

export default function AccountantDashboard() {
  const params = useParams();
  const slug = params?.slug as string;
  const [metrics, setMetrics] = useState<AccountantDashboardMetrics | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [metricsRes, invoicesRes, activitiesRes, alertsRes] =
        await Promise.all([
          fetch(`/api/tenant/${slug}/accountant/dashboard`),
          fetch(`/api/tenant/${slug}/accountant/invoices?recent=true`),
          fetch(`/api/tenant/${slug}/accountant/activities`),
          fetch(`/api/tenant/${slug}/accountant/alerts`),
        ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (invoicesRes.ok) setRecentInvoices(await invoicesRes.json());
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
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading financial dashboard...
        </div>
      </div>
    );
  }

  const quickActions = [
    { icon: Plus, label: "Create Invoice", color: "bg-blue-50 text-blue-600", href: `/tenant/${slug}/accountant/billing/invoices/new` },
    { icon: DollarSign, label: "Record Payment", color: "bg-green-50 text-green-600", href: `/tenant/${slug}/accountant/payments/new` },
    { icon: TrendingUp, label: "Revenue Report", color: "bg-cyan-50 text-cyan-600", href: `/tenant/${slug}/accountant/analytics/revenue` },
    { icon: Users, label: "View Patients", color: "bg-purple-50 text-purple-600", href: `/tenant/${slug}/accountant/patients` },
    { icon: LineChart, label: "Financial Analysis", color: "bg-indigo-50 text-indigo-600", href: `/tenant/${slug}/accountant/analytics/financial` },
    { icon: CheckCircle, label: "Insurance Claims", color: "bg-orange-50 text-orange-600", href: `/tenant/${slug}/accountant/insurance-claims` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Accountant Dashboard
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Financial Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time financial metrics and payment tracking
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const bgColor = alert.type === "warning" ? "bg-yellow-50 border-yellow-200" :
                           alert.type === "error" ? "bg-red-50 border-red-200" :
                           alert.type === "success" ? "bg-green-50 border-green-200" :
                           "bg-blue-50 border-blue-200";
            const textColor = alert.type === "warning" ? "text-yellow-900" :
                             alert.type === "error" ? "text-red-900" :
                             alert.type === "success" ? "text-green-900" :
                             "text-blue-900";
            const icon = alert.type === "warning" || alert.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />;

            return (
              <div key={alert.id} className={`p-4 rounded-lg border ${bgColor}`}>
                <div className="flex items-start gap-3">
                  <div className={textColor}>
                    {icon}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${textColor}`}>{alert.title}</p>
                    <p className={`text-sm mt-1 ${textColor} opacity-90`}>{alert.message}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`$${metrics?.totalRevenue?.toFixed(2) || "0.00"}`}
          subtitle="Year to date"
          icon={<DollarSign className="h-6 w-6" />}
          trend={`${metrics?.revenueGrowth}%`}
          trendDirection={metrics?.revenueGrowth && metrics.revenueGrowth >= 0 ? "up" : "down"}
        />
        <StatCard
          title="Pending Invoices"
          value={metrics?.pendingInvoices}
          subtitle="Awaiting payment"
          icon={<Bell className="h-6 w-6" />}
        />
        <StatCard
          title="Outstanding Balance"
          value={`$${metrics?.outstandingBalance?.toFixed(2) || "0.00"}`}
          subtitle="Total due"
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <StatCard
          title="Collections Rate"
          value={`${metrics?.collectionsRate}%`}
          subtitle="Payment success"
          icon={<CheckCircle className="h-6 w-6" />}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Pending Payments"
          value={metrics?.pendingPayments}
          subtitle="To be processed"
          icon={<DollarSign className="h-6 w-6" />}
        />
        <StatCard
          title="Total Patients"
          value={metrics?.totalPatients}
          subtitle="Active accounts"
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          title="Avg Payment Time"
          value={`${metrics?.averagePaymentTime} days`}
          subtitle="Invoice to cash"
          icon={<Activity className="h-6 w-6" />}
        />
      </div>

      {/* Recent Invoices & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-500" />
            Recent Invoices
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentInvoices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent invoices</p>
              </div>
            ) : (
              recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="p-4 rounded-lg border border-gray-100 hover:border-orange-300 hover:bg-orange-50/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{invoice.patientName}</p>
                      <p className="text-xs text-gray-500">Invoice #{invoice.id}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-semibold ${
                        invoice.status === "paid"
                          ? "bg-green-50 text-green-600"
                          : invoice.status === "overdue"
                          ? "bg-red-50 text-red-600"
                          : invoice.status === "partial"
                          ? "bg-yellow-50 text-yellow-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {invoice.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Due: {new Date(invoice.dueDate).toLocaleDateString()}
                    </span>
                    <span className="font-semibold text-gray-900">${invoice.amount.toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-500" />
            Quick Actions
          </h2>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`w-full p-3 rounded-lg border border-gray-200 hover:border-orange-300 ${action.color} text-sm font-semibold transition-all text-left flex items-center gap-2`}
              >
                <action.icon className="h-4 w-4" />
                <span>{action.label}</span>
                <ArrowRight className="h-3 w-3 ml-auto" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-orange-500" />
          Recent Activity
        </h2>
        <div className="space-y-3">
          {recentActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-all"
              >
                <div className="h-2 w-2 rounded-full bg-orange-500 mt-1.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(activity.timestamp).toLocaleTimeString()}</p>
                </div>
                {activity.amount && (
                  <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    ${activity.amount.toFixed(2)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

