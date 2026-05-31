"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, Clock, CheckCircle, Activity,
  AlertCircle, TrendingUp, Plus, RefreshCw, Download, Pill,
  Boxes, AlertTriangle, DollarSign, ArrowRight, Loader2, Bell
} from "lucide-react";
import Link from "next/link";

const orange = "#F97316";

interface PharmacistDashboardMetrics {
  totalMedications: number;
  lowStockItems: number;
  pendingPrescriptions: number;
  dispensedToday: number;
  drugInteractionsCritical: number;
  outOfStockItems: number;
  targetedRevenue: number;
  stockAlerts: number;
}

interface TodayDispensal {
  id: string;
  patientName: string;
  patientId: string;
  medication: string;
  quantity: number;
  status: "pending" | "dispensed" | "partial";
  time: string;
}

interface RecentActivity {
  id: string;
  type: "prescription" | "dispensing" | "inventory" | "alert";
  title: string;
  description: string;
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

export function PharmacistDashboard() {
  const params = useParams();
  const slug = params?.slug as string;
  const [metrics, setMetrics] = useState<PharmacistDashboardMetrics | null>(null);
  const [todayDispensals, setTodayDispensals] = useState<TodayDispensal[]>([]);
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
      const [metricsRes, dispensalsRes, activitiesRes, alertsRes] =
        await Promise.all([
          fetch(`/api/tenant/${slug}/pharmacy/dashboard`),
          fetch(`/api/tenant/${slug}/pharmacy/dispensals?today=true`),
          fetch(`/api/tenant/${slug}/pharmacy/activities`),
          fetch(`/api/tenant/${slug}/pharmacy/alerts`),
        ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (dispensalsRes.ok) setTodayDispensals(await dispensalsRes.json());
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
          Loading pharmacy dashboard...
        </div>
      </div>
    );
  }

  const quickActions = [
    { icon: Plus, label: "List Medication", color: "bg-blue-50 text-blue-600", href: `/tenant/${slug}/pharmacy/inventory/new` },
    { icon: Pill, label: "Fill Prescription", color: "bg-green-50 text-green-600", href: `/tenant/${slug}/pharmacy/dispensing` },
    { icon: AlertTriangle, label: "Check Interactions", color: "bg-cyan-50 text-cyan-600", href: `/tenant/${slug}/pharmacy/drug-interactions` },
    { icon: Boxes, label: "Manage Inventory", color: "bg-purple-50 text-purple-600", href: `/tenant/${slug}/pharmacy/pharmacy-inventory` },
    { icon: Bell, label: "View Alerts", color: "bg-indigo-50 text-indigo-600", href: `/tenant/${slug}/pharmacy/pharmacy-inventory/alerts` },
    { icon: TrendingUp, label: "Analytics", color: "bg-orange-50 text-orange-600", href: `/tenant/${slug}/pharmacy/analytics` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Pharmacist Dashboard
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Pharmacy Operations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time pharmacy management and inventory insights
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
          title="Total Medications"
          value={metrics?.totalMedications ?? 0}
          subtitle="In inventory"
          icon={<Pill className="h-6 w-6" />}
          trend="+3%"
          trendDirection="up"
        />
        <StatCard
          title="Pending Prescriptions"
          value={metrics?.pendingPrescriptions ?? 0}
          subtitle="Awaiting fulfillment"
          icon={<Boxes className="h-6 w-6" />}
          trend="-2%"
          trendDirection="down"
        />
        <StatCard
          title="Dispensed Today"
          value={metrics?.dispensedToday ?? 0}
          subtitle="Successfully filled"
          icon={<CheckCircle className="h-6 w-6" />}
          trend="+8%"
          trendDirection="up"
        />
        <StatCard
          title="Stock Alerts"
          value={metrics?.stockAlerts ?? 0}
          subtitle="Requiring attention"
          icon={<AlertTriangle className="h-6 w-6" />}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Low Stock Items"
          value={metrics?.lowStockItems ?? 0}
          subtitle="Below minimum threshold"
          icon={<Bell className="h-6 w-6" />}
        />
        <StatCard
          title="Drug Interactions"
          value={metrics?.drugInteractionsCritical ?? 0}
          subtitle="Critical alerts"
          icon={<AlertCircle className="h-6 w-6" />}
        />
        <StatCard
          title="Out of Stock"
          value={metrics?.outOfStockItems ?? 0}
          subtitle="Unavailable medicines"
          icon={<Boxes className="h-6 w-6" />}
        />
      </div>

      {/* Today's Dispensals & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Dispensals */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Today's Dispensing Queue
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {todayDispensals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Pill className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No dispensals today</p>
              </div>
            ) : (
              todayDispensals.map((dispensal) => (
                <div
                  key={dispensal.id}
                  className="p-4 rounded-lg border border-gray-100 hover:border-orange-300 hover:bg-orange-50/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{dispensal.patientName}</p>
                      <p className="text-xs text-gray-500">{dispensal.medication}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-semibold ${
                        dispensal.status === "dispensed"
                          ? "bg-green-50 text-green-600"
                          : dispensal.status === "partial"
                          ? "bg-yellow-50 text-yellow-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {dispensal.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {dispensal.time}
                    </span>
                    <span className="flex items-center gap-1">
                      Qty: {dispensal.quantity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Pill className="h-5 w-5 text-orange-500" />
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
