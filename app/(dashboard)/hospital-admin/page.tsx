"use client";

import { DashboardGreeting } from "@/components/DashboardGreeting";
import { useEffect, useState } from "react";
import {
  Users,
  Activity,
  DollarSign,
  AlertTriangle,
  Calendar,
  BarChart3,
  AlertCircle,
  Plus,
  ArrowRight,
  Zap,
  Heart,
  Bed,
  TestTube,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface DashboardMetrics {
  totalPatients: number;
  patientsToday: number;
  activeAppointments: number;
  completedAppointments: number;
  totalRevenue: string;
  todayRevenue: string;
  pendingInvoices: string;
  bedOccupancy: number;
  staffOnDuty: number;
  totalStaff: number;
  pendingLabTests: number;
  completedLabTests: number;
  pharmacyItems: number;
  lowStockItems: number;
  criticalAlerts: number;
  systemUptime: string;
  queueCount: number;
}

interface DepartmentMetric {
  id: string;
  name: string;
  patients: number;
  utilization: number;
  status: "excellent" | "good" | "warning" | "critical";
  avgWaitTime: number;
  revenue: string;
  activeQueue: number;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  status: "on-duty" | "off-duty" | "on-leave";
  avatar?: string;
}

interface RecentActivity {
  id: string;
  action: string;
  actor: string;
  timestamp: Date;
  type: "info" | "success" | "warning" | "error";
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
    className={`rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 ${
      onClick ? "cursor-pointer" : ""
    }`}
  >
    <div className="mb-4 flex items-start justify-between">
      <div className="rounded-xl bg-orange-50 p-2.5 text-orange-500 dark:bg-orange-500/15 dark:text-orange-300">
        {Icon}
      </div>
      {trend && (
        <div
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
            trendDirection === "up"
              ? "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-300"
              : "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300"
          }`}
        >
          {trendDirection === "up" ? "↑" : "↓"} {trend}
        </div>
      )}
    </div>
    <h3 className="mb-1 text-sm font-medium text-muted-foreground">{title}</h3>
    <p className="mb-1 text-2xl font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{subtitle}</p>
  </div>
);

export default function HospitalAdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [departments, setDepartments] = useState<DepartmentMetric[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
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
      const [metricsRes, deptRes, staffRes, activitiesRes, alertsRes] = await Promise.all([
        fetch("/api/hospital-admin/metrics"),
        fetch("/api/hospital-admin/departments"),
        fetch("/api/hospital-admin/staff"),
        fetch("/api/hospital-admin/activities"),
        fetch("/api/hospital-admin/alerts"),
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (staffRes.ok) setStaffMembers(await staffRes.json());
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
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  const quickActions = [
    { icon: Plus, label: "New Patient", color: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" },
    { icon: Calendar, label: "Schedule Appointment", color: "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-300" },
    { icon: DollarSign, label: "Create Invoice", color: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300" },
    { icon: Heart, label: "Patient Records", color: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300" },
  ];

  return (
    <div className="space-y-6">
      <DashboardGreeting roleLabel="Hospital Admin" />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Hospital Management
          </p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Control Tower Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time operational overview and management
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white transition-all hover:bg-orange-600 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {alerts.length > 0 && (
        <div className="grid gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
          <div className="flex items-center gap-2 font-semibold text-red-900 dark:text-red-200">
            <AlertTriangle className="h-5 w-5" />
            Critical Alerts ({alerts.filter((a) => a.severity === "urgent").length})
          </div>
          {alerts
            .filter((a) => a.severity === "urgent")
            .slice(0, 3)
            .map((alert) => (
              <div
                key={alert.id}
                className="rounded-lg border border-red-100 bg-white p-3 dark:border-red-500/20 dark:bg-card"
              >
                <p className="text-sm font-medium text-red-900 dark:text-red-200">{alert.title}</p>
                <p className="mt-1 text-xs text-red-700 dark:text-red-300">{alert.message}</p>
              </div>
            ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Patients"
          value={metrics?.totalPatients ?? 0}
          subtitle={`${metrics?.patientsToday ?? 0} today`}
          icon={<Users className="h-6 w-6" />}
          trend="+12%"
          trendDirection="up"
        />
        <StatCard
          title="Revenue"
          value={`$${metrics?.todayRevenue}`}
          subtitle={`Total: $${metrics?.totalRevenue}`}
          icon={<DollarSign className="h-6 w-6" />}
          trend="+8%"
          trendDirection="up"
        />
        <StatCard
          title="Bed Occupancy"
          value={`${metrics?.bedOccupancy}%`}
          subtitle={metrics?.bedOccupancy! > 85 ? "High occupancy" : "Normal"}
          icon={<Bed className="h-6 w-6" />}
          trend={metrics?.bedOccupancy! > 85 ? "Critical" : "Stable"}
          trendDirection={metrics?.bedOccupancy! > 85 ? "up" : "down"}
        />
        <StatCard
          title="Staff On Duty"
          value={metrics?.staffOnDuty ?? 0}
          subtitle={`of ${metrics?.totalStaff ?? 0} total`}
          icon={<Users className="h-6 w-6" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Appointments"
          value={metrics?.activeAppointments ?? 0}
          subtitle={`${metrics?.completedAppointments ?? 0} completed today`}
          icon={<Calendar className="h-6 w-6" />}
        />
        <StatCard
          title="Lab Tests"
          value={metrics?.pendingLabTests ?? 0}
          subtitle={`${metrics?.completedLabTests ?? 0} completed`}
          icon={<TestTube className="h-6 w-6" />}
        />
        <StatCard
          title="Pending Invoices"
          value={`$${metrics?.pendingInvoices}`}
          subtitle="Action required"
          icon={<AlertCircle className="h-6 w-6" />}
          trend="High"
          trendDirection="down"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <BarChart3 className="h-5 w-5 text-orange-500" />
            Department Performance
          </h2>
          <div className="space-y-3">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="rounded-lg border border-border bg-background p-4 transition-all hover:border-orange-300 hover:bg-orange-50/30 dark:hover:bg-orange-500/10"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{dept.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {dept.patients} patients • Avg wait: {dept.avgWaitTime}
                      min
                    </p>
                  </div>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${
                      dept.status === "excellent"
                        ? "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-300"
                        : dept.status === "good"
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
                          : dept.status === "warning"
                            ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/15 dark:text-yellow-300"
                            : "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300"
                    }`}
                  >
                    {dept.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all ${
                        dept.utilization > 85
                          ? "bg-red-500"
                          : dept.utilization > 70
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${dept.utilization}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {dept.utilization}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <Users className="h-5 w-5 text-orange-500" />
            On-Duty Staff
          </h2>
          <div className="space-y-3">
            {staffMembers.slice(0, 5).map((staff) => (
              <div
                key={staff.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-all hover:bg-muted/50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-semibold text-white">
                  {staff.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{staff.name}</p>
                  <p className="text-xs text-muted-foreground">{staff.role}</p>
                </div>
                <div
                  className={`h-2 w-2 rounded-full ${
                    staff.status === "on-duty"
                      ? "bg-green-500"
                      : staff.status === "on-leave"
                        ? "bg-yellow-500"
                        : "bg-gray-300"
                  }`}
                />
              </div>
            ))}
            <Link
              href="/staff-management"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-orange-300 bg-orange-50 p-2 text-center text-xs font-semibold text-orange-600 transition-all hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20"
            >
              View All Staff <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <Activity className="h-5 w-5 text-orange-500" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {recentActivities.slice(0, 6).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-all hover:bg-muted/50"
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    activity.type === "success"
                      ? "bg-green-500"
                      : activity.type === "warning"
                        ? "bg-yellow-500"
                        : activity.type === "error"
                          ? "bg-red-500"
                          : "bg-blue-500"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">
                    by {activity.actor} • {new Date(activity.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <Zap className="h-5 w-5 text-orange-500" />
            Quick Actions
          </h2>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className={`flex w-full items-center gap-2 rounded-lg border border-border p-3 text-left text-sm font-semibold transition-all hover:border-orange-300 ${action.color}`}
              >
                <action.icon className="h-4 w-4" />
                <span>{action.label}</span>
                <ArrowRight className="ml-auto h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
