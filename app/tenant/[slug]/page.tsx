"use client";

import { DashboardGreeting } from "@/components/DashboardGreeting";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Users, Activity, DollarSign, AlertTriangle, TrendingUp, Calendar,
  BarChart3, AlertCircle, ArrowRight, Zap, Bed, TestTube, PieChart,
  RefreshCw, Settings, Stethoscope, Building2, ShieldCheck, Megaphone,
  History, ServerCog
} from "lucide-react";
import Link from "next/link";
import { withTenantPrefix } from "@/lib/tenant-routing";

interface DashboardMetrics {
  totalPatients: number;
  patientsToday: number;
  patientsYesterday?: number;
  patientTrendPercent?: number;
  activeAppointments: number;
  completedAppointments: number;
  completedAppointmentsYesterday?: number;
  appointmentTrendPercent?: number;
  totalRevenue: string;
  todayRevenue: string;
  yesterdayRevenue?: string;
  revenueTrendPercent?: number;
  pendingInvoices: string;
  bedOccupancy: number;
  occupiedBeds?: number;
  totalBeds?: number;
  staffOnDuty: number;
  totalStaff: number;
  pendingLabTests: number;
  completedLabTests: number;
  pharmacyItems: number;
  lowStockItems: number;
  criticalAlerts: number;
  systemUptime: string | null;
  cpuUsage?: number | null;
  memoryUsage?: number | null;
  apiResponseTime?: number | null;
  queueCount: number;
}

interface DepartmentMetric {
  id: string;
  name: string;
  patients: number;
  utilization: number;
  status: "excellent" | "good" | "warning" | "critical";
  avgWaitTime: number;
  activeQueue?: number;
  totalQueue?: number;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  status: "active" | "on-duty" | "off-duty" | "on-leave";
  avatar?: string;
}

interface RecentActivity {
  id: string;
  action: string;
  actor: string;
  timestamp: Date;
  type: "info" | "success" | "warning" | "error";
}

interface DashboardAlert {
  id: string;
  title: string;
  message: string;
  severity: "urgent" | "warning" | "info" | "critical" | string;
  type: string;
}

function formatTrend(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0%";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function trendDirection(value?: number | null): "up" | "down" {
  return typeof value === "number" && value < 0 ? "down" : "up";
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
  const [departmentPage, setDepartmentPage] = useState(0);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch all dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    setDepartmentPage(0);
  }, [departments.length]);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      setLoadError(null);

      const loadJson = async <T,>(url: string): Promise<T> => {
        const response = await fetch(url, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`${url} failed with ${response.status}`);
        }

        return response.json();
      };

      const [metricsResult, departmentsResult, staffResult, activitiesResult, alertsResult] = await Promise.allSettled([
        loadJson<DashboardMetrics>("/api/hospital-admin/metrics"),
        loadJson<DepartmentMetric[]>("/api/hospital-admin/departments"),
        loadJson<StaffMember[]>("/api/hospital-admin/staff"),
        loadJson<RecentActivity[]>("/api/hospital-admin/activities"),
        loadJson<DashboardAlert[]>("/api/hospital-admin/alerts"),
      ]);

      const failedSections: string[] = [];

      if (metricsResult.status === "fulfilled") setMetrics(metricsResult.value);
      else failedSections.push("metrics");

      if (departmentsResult.status === "fulfilled") {
        setDepartments(Array.isArray(departmentsResult.value) ? departmentsResult.value : []);
      } else {
        failedSections.push("departments");
      }

      if (staffResult.status === "fulfilled") {
        setStaffMembers(Array.isArray(staffResult.value) ? staffResult.value : []);
      } else {
        failedSections.push("staff");
      }

      if (activitiesResult.status === "fulfilled") {
        setRecentActivities(Array.isArray(activitiesResult.value) ? activitiesResult.value : []);
      } else {
        failedSections.push("activity");
      }

      if (alertsResult.status === "fulfilled") {
        setAlerts(Array.isArray(alertsResult.value) ? alertsResult.value : []);
      } else {
        failedSections.push("alerts");
      }

      setLastUpdated(new Date());

      if (failedSections.length > 0) {
        setLoadError(`Some dashboard sections could not refresh: ${failedSections.join(", ")}.`);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setLoadError("Dashboard data could not be refreshed. Existing values remain visible.");
    } finally {
      setRefreshing(false);
    }
  };

  const quickActions = [
    {
      icon: Stethoscope,
      label: "Manage Staff",
      color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
      href: "/staff-management"
    },
    {
      icon: Building2,
      label: "Departments",
      color: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
      href: "/departments"
    },
    {
      icon: ShieldCheck,
      label: "Roles & Permissions",
      color: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
      href: "/roles"
    },
    {
      icon: Settings,
      label: "Hospital Settings",
      color: "bg-slate-50 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200",
      href: "/settings"
    },
    {
      icon: History,
      label: "Audit Logs",
      color: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
      href: "/compliance/audit"
    },
    {
      icon: Megaphone,
      label: "Broadcasts",
      color: "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-300",
      href: "/broadcasts"
    },
    {
      icon: BarChart3,
      label: "Analytics",
      color: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300",
      href: "/analytics"
    },
    {
      icon: ServerCog,
      label: "Integrations",
      color: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300",
      href: "/hospital-admin/integrations"
    },
  ];

  const departmentPageSize = 4;
  const departmentPageCount = Math.max(1, Math.ceil(departments.length / departmentPageSize));
  const currentDepartmentPage = Math.min(departmentPage, departmentPageCount - 1);
  const visibleDepartments = departments.slice(
    currentDepartmentPage * departmentPageSize,
    currentDepartmentPage * departmentPageSize + departmentPageSize
  );

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
          {lastUpdated && (
            <p className="mt-1 text-xs text-muted-foreground">
              Last updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
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

      {loadError && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-200">
          {loadError}
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="grid gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
          <div className="flex items-center gap-2 font-semibold text-red-900 dark:text-red-200">
            <AlertTriangle className="h-5 w-5" />
            Alerts ({alerts.length})
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
          value={metrics?.totalPatients ?? "-"}
          subtitle={`${metrics?.patientsToday ?? "-"} today`}
          icon={<Users className="h-6 w-6" />}
          trend={metrics ? formatTrend(metrics.patientTrendPercent) : undefined}
          trendDirection={trendDirection(metrics?.patientTrendPercent)}
          onClick={() => router.push(toTenantPath("/patients"))}
        />
        <StatCard
          title="Revenue"
          value={metrics ? `$${metrics.todayRevenue}` : "-"}
          subtitle={metrics ? `Total: $${metrics.totalRevenue}` : "Loading revenue"}
          icon={<DollarSign className="h-6 w-6" />}
          trend={metrics ? formatTrend(metrics.revenueTrendPercent) : undefined}
          trendDirection={trendDirection(metrics?.revenueTrendPercent)}
          onClick={() => router.push(toTenantPath("/billing"))}
        />
        <StatCard
          title="Bed Occupancy"
          value={metrics ? `${metrics.bedOccupancy}%` : "-"}
          subtitle={
            metrics?.totalBeds
              ? `${metrics.occupiedBeds ?? 0} of ${metrics.totalBeds} beds occupied`
              : metrics
                ? "No bed inventory configured"
                : "Loading bed data"
          }
          icon={<Bed className="h-6 w-6" />}
          trend={metrics ? (metrics.bedOccupancy > 85 ? "Critical" : "Stable") : undefined}
          trendDirection={metrics && metrics.bedOccupancy > 85 ? "up" : "down"}
        />
        <StatCard
          title="Active Staff"
          value={metrics?.staffOnDuty ?? "-"}
          subtitle={metrics ? `${metrics.totalStaff} total active staff` : "Loading staff"}
          icon={<Users className="h-6 w-6" />}
          onClick={() => router.push(toTenantPath("/staff-management"))}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Appointments"
          value={metrics?.activeAppointments ?? "-"}
          subtitle={`${metrics?.completedAppointments ?? "-"} completed today`}
          icon={<Calendar className="h-6 w-6" />}
          trend={metrics ? formatTrend(metrics.appointmentTrendPercent) : undefined}
          trendDirection={trendDirection(metrics?.appointmentTrendPercent)}
          onClick={() => router.push(toTenantPath("/appointments"))}
        />
        <StatCard
          title="Lab Tests"
          value={metrics?.pendingLabTests ?? "-"}
          subtitle={`${metrics?.completedLabTests ?? "-"} completed`}
          icon={<TestTube className="h-6 w-6" />}
          onClick={() => router.push(toTenantPath("/lab"))}
        />
        <StatCard
          title="Pending Invoices"
          value={metrics ? `$${metrics.pendingInvoices}` : "-"}
          subtitle="Action required"
          icon={<AlertCircle className="h-6 w-6" />}
          trend={metrics && Number(metrics.pendingInvoices) > 0 ? "Open" : "Clear"}
          trendDirection={metrics && Number(metrics.pendingInvoices) > 0 ? "down" : "up"}
          onClick={() => router.push(toTenantPath("/billing"))}
        />
      </div>

      {/* Department Performance & Staff */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Departments */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <BarChart3 className="h-5 w-5 text-orange-500" />
              Department Performance
            </h2>
            {departments.length > departmentPageSize && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setDepartmentPage((page) => Math.max(0, page - 1))}
                  disabled={currentDepartmentPage === 0}
                  className="rounded-lg border border-border px-3 py-1.5 font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="font-medium">
                  Page {currentDepartmentPage + 1} of {departmentPageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setDepartmentPage((page) => Math.min(departmentPageCount - 1, page + 1))}
                  disabled={currentDepartmentPage >= departmentPageCount - 1}
                  className="rounded-lg border border-border px-3 py-1.5 font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {visibleDepartments.map((dept) => (
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
                      {dept.activeQueue ?? dept.patients} waiting / {dept.totalQueue ?? 0} total queue - Avg wait: {dept.avgWaitTime} min
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
            {departments.length === 0 && (
              <p className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No departments have been configured yet.
              </p>
            )}
            {departments.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Showing {currentDepartmentPage * departmentPageSize + 1}-{Math.min((currentDepartmentPage + 1) * departmentPageSize, departments.length)} of {departments.length} departments.
              </p>
            )}
          </div>
        </div>

        {/* Staff Status */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <Users className="h-5 w-5 text-orange-500" />
            Active Staff
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
                    staff.status === "active" || staff.status === "on-duty"
                      ? "bg-green-500"
                      : staff.status === "on-leave"
                      ? "bg-yellow-500"
                      : "bg-gray-300"
                  }`}
                />
              </div>
            ))}
            {staffMembers.length === 0 && (
              <p className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No active staff accounts found.
              </p>
            )}
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
            {recentActivities.length === 0 && (
              <p className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No recent tenant activity has been recorded.
              </p>
            )}
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
            Operational Trends
          </h2>
          <div className="grid gap-3">
            {[
              { label: "Patient registrations today", value: metrics?.patientsToday ?? "-", detail: `${formatTrend(metrics?.patientTrendPercent)} vs yesterday` },
              { label: "Revenue today", value: metrics ? `$${metrics.todayRevenue}` : "-", detail: `${formatTrend(metrics?.revenueTrendPercent)} vs yesterday` },
              { label: "Completed appointments", value: metrics?.completedAppointments ?? "-", detail: `${formatTrend(metrics?.appointmentTrendPercent)} vs yesterday` },
              { label: "Queue backlog", value: metrics?.queueCount ?? "-", detail: "Patients waiting now" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
                <span className="text-lg font-bold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <PieChart className="h-5 w-5 text-orange-500" />
            System & Department Health
          </h2>
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">System uptime</span>
                <span className="text-muted-foreground">{metrics?.systemUptime || "No system metric recorded"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>CPU: {metrics?.cpuUsage ?? "-"}%</span>
                <span>Memory: {metrics?.memoryUsage ?? "-"}%</span>
                <span>API: {metrics?.apiResponseTime ?? "-"}ms</span>
              </div>
            </div>
            {departments.slice(0, 4).map((dept) => (
              <div key={dept.id} className="rounded-lg border border-border bg-background p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">{dept.name}</span>
                  <span className="text-muted-foreground">{dept.utilization}% queue load</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-orange-500" style={{ width: `${dept.utilization}%` }} />
                </div>
              </div>
            ))}
            {departments.length === 0 && (
              <p className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                Department health appears here once departments and queues are configured.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
