"use client";

import { DashboardGreeting } from "@/components/DashboardGreeting";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Users, Activity, DollarSign, AlertTriangle, TrendingUp, Calendar,
  BarChart3, Clock, CheckCircle2, AlertCircle, Plus, ArrowRight,
  Zap, Heart, Bed, Pill, TestTube, PieChart, TrendingDown,
  RefreshCw, Download, Settings, Stethoscope, FlaskConical, Building2, Wallet
} from "lucide-react";
import Link from "next/link";
import { withTenantPrefix } from "@/lib/tenant-routing";

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
    <div className="flex items-start justify-between mb-4">
      <div className="rounded-xl bg-orange-50 p-2.5 text-orange-500 dark:bg-orange-500/15 dark:text-orange-300">
        {Icon}
      </div>
      {trend && (
        <div
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
            trendDirection === "up"
              ? "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-300 dark:bg-green-500/15 dark:text-green-300"
              : "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300 dark:bg-red-500/15 dark:text-red-300"
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
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const toTenantPath = (path: string) => withTenantPrefix(path, slug, hostname);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [departments, setDepartments] = useState<DepartmentMetric[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all dashboard data
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [metricsRes, deptRes, staffRes, activitiesRes, alertsRes] =
        await Promise.all([
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
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  const quickActions = [
    { icon: Plus, label: "New Patient", color: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300", href: "/patients/register" },
    {
      icon: Calendar,
      label: "Schedule Appointment",
      color: "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-300",
      href: "/appointments"
    },
    {
      icon: DollarSign,
      label: "Create Invoice",
      color: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300",
      href: "/billing/invoices"
    },
    {
      icon: Heart,
      label: "Patient Records",
      color: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
      href: "/patients"
    },
    {
      icon: Stethoscope,
      label: "Staff Management",
      color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
      href: "/staff-management"
    },
    {
      icon: FlaskConical,
      label: "Lab Orders",
      color: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300",
      href: "/lab"
    },
    {
      icon: Pill,
      label: "Pharmacy",
      color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
      href: "/pharmacy"
    },
    {
      icon: Building2,
      label: "Departments",
      color: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
      href: "/departments"
    },
  ];

  return (
    <div className="space-y-6">
      <DashboardGreeting roleLabel="Hospital Admin" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Hospital Management
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Control Tower Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time operational overview and management
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

      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <div className="grid gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
          <div className="flex items-center gap-2 font-semibold text-red-900 dark:text-red-200">
            <AlertTriangle className="h-5 w-5" />
            Critical Alerts ({alerts.length})
          </div>
          {alerts.slice(0, 3).map((alert) => (
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

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Patients"
          value={metrics?.totalPatients}
          subtitle={`${metrics?.patientsToday} today`}
          icon={<Users className="h-6 w-6" />}
          trend="+12%"
          trendDirection="up"
          onClick={() => router.push(toTenantPath("/patients"))}
        />
        <StatCard
          title="Revenue"
          value={`$${metrics?.todayRevenue}`}
          subtitle={`Total: $${metrics?.totalRevenue}`}
          icon={<DollarSign className="h-6 w-6" />}
          trend="+8%"
          trendDirection="up"
          onClick={() => router.push(toTenantPath("/billing"))}
        />
        <StatCard
          title="Bed Occupancy"
          value={`${metrics?.bedOccupancy}%`}
          subtitle={metrics?.bedOccupancy > 85 ? "High occupancy" : "Normal"}
          icon={<Bed className="h-6 w-6" />}
          trend={metrics?.bedOccupancy > 85 ? "Critical" : "Stable"}
          trendDirection={metrics?.bedOccupancy > 85 ? "up" : "down"}
        />
        <StatCard
          title="Staff On Duty"
          value={metrics?.staffOnDuty}
          subtitle={`of ${metrics?.totalStaff} total`}
          icon={<Users className="h-6 w-6" />}
          onClick={() => router.push(toTenantPath("/staff-management"))}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Appointments"
          value={metrics?.activeAppointments}
          subtitle={`${metrics?.completedAppointments} completed today`}
          icon={<Calendar className="h-6 w-6" />}
          onClick={() => router.push(toTenantPath("/appointments"))}
        />
        <StatCard
          title="Lab Tests"
          value={metrics?.pendingLabTests}
          subtitle={`${metrics?.completedLabTests} completed`}
          icon={<TestTube className="h-6 w-6" />}
          onClick={() => router.push(toTenantPath("/lab"))}
        />
        <StatCard
          title="Pending Invoices"
          value={`$${metrics?.pendingInvoices}`}
          subtitle="Action required"
          icon={<AlertCircle className="h-6 w-6" />}
          trend="⚠ High"
          trendDirection="down"
          onClick={() => router.push(toTenantPath("/billing"))}
        />
      </div>

      {/* Department Performance & Staff */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Departments */}
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
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {dept.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dept.patients} patients • Avg wait: {dept.avgWaitTime}
                      min
                    </p>
                  </div>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${
                      dept.status === "excellent"
                        ? "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-300 dark:bg-green-500/15 dark:text-green-300"
                        : dept.status === "good"
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 dark:bg-blue-500/15 dark:text-blue-300"
                        : dept.status === "warning"
                        ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/15 dark:text-yellow-300"
                        : "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300 dark:bg-red-500/15 dark:text-red-300"
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

        {/* Staff Status */}
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
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                  {staff.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {staff.name}
                  </p>
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
              href={toTenantPath("/staff-management")}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-orange-300 bg-orange-50 p-2 text-center text-xs font-semibold text-orange-600 transition-all hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20"
            >
              View All Staff <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
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
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">
                    by {activity.actor} •{" "}
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <Zap className="h-5 w-5 text-orange-500" />
            Quick Actions
          </h2>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={toTenantPath(action.href)}
                className={`flex w-full items-center gap-2 rounded-lg border border-border p-3 hover:border-orange-300 ${action.color} text-sm font-semibold transition-all text-left flex items-center gap-2`}
              >
                <action.icon className="h-4 w-4" />
                <span>{action.label}</span>
                <ArrowRight className="h-3 w-3 ml-auto" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Weekly Trends
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">Coming soon - Analytics integration</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <PieChart className="h-5 w-5 text-orange-500" />
            Department Distribution
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">Coming soon - Chart integration</p>
        </div>
      </div>
    </div>
  );
}
