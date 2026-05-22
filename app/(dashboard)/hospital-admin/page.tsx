"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Activity,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Zap,
  Heart,
  Bed,
  TestTube,
  PieChart,
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

export default function HospitalAdminDashboard() {
  const router = useRouter();
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
    { icon: Plus, label: "New Patient", color: "bg-blue-50 text-blue-600" },
    {
      icon: Calendar,
      label: "Schedule Appointment",
      color: "bg-green-50 text-green-600",
    },
    {
      icon: DollarSign,
      label: "Create Invoice",
      color: "bg-purple-50 text-purple-600",
    },
    {
      icon: Heart,
      label: "Patient Records",
      color: "bg-red-50 text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
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
        <div className="grid gap-3 p-4 rounded-xl border border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-900 font-semibold">
            <AlertTriangle className="h-5 w-5" />
            Critical Alerts ({alerts.filter((a) => a.severity === "urgent").length})
          </div>
          {alerts
            .filter((a) => a.severity === "urgent")
            .slice(0, 3)
            .map((alert) => (
              <div
                key={alert.id}
                className="p-3 rounded-lg bg-white border border-red-100"
              >
                <p className="text-sm font-medium text-red-900">{alert.title}</p>
                <p className="text-xs text-red-700 mt-1">{alert.message}</p>
              </div>
            ))}
        </div>
      )}

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          trend="⚠ High"
          trendDirection="down"
        />
      </div>

      {/* Department Performance & Staff */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Departments */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-500" />
            Department Performance
          </h2>
          <div className="space-y-3">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="p-4 rounded-lg border border-gray-100 hover:border-orange-300 hover:bg-orange-50/30 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {dept.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {dept.patients} patients • Avg wait: {dept.avgWaitTime}
                      min
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-md font-semibold ${
                      dept.status === "excellent"
                        ? "text-green-600 bg-green-50"
                        : dept.status === "good"
                        ? "text-blue-600 bg-blue-50"
                        : dept.status === "warning"
                        ? "text-yellow-600 bg-yellow-50"
                        : "text-red-600 bg-red-50"
                    }`}
                  >
                    {dept.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
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
                  <span className="text-xs font-semibold text-gray-600">
                    {dept.utilization}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Status */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            On-Duty Staff
          </h2>
          <div className="space-y-3">
            {staffMembers.slice(0, 5).map((staff) => (
              <div
                key={staff.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-all"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                  {staff.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {staff.name}
                  </p>
                  <p className="text-xs text-gray-500">{staff.role}</p>
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
              className="w-full mt-4 p-2 rounded-lg border border-orange-300 bg-orange-50 text-orange-600 text-xs font-semibold hover:bg-orange-100 transition-all text-center flex items-center justify-center gap-2"
            >
              View All Staff <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {recentActivities.slice(0, 6).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-all"
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
                  <p className="text-sm text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">
                    by {activity.actor} •{" "}
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Quick Actions
          </h2>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className={`w-full p-3 rounded-lg border border-gray-200 hover:border-orange-300 ${action.color} text-sm font-semibold transition-all text-left flex items-center gap-2`}
              >
                <action.icon className="h-4 w-4" />
                <span>{action.label}</span>
                <ArrowRight className="h-3 w-3 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
