"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, Clock, CheckCircle, Activity,
  AlertCircle, TrendingUp, Plus, RefreshCw, Download, Pill,
  FlaskConical, Microscope, Heart, Zap, BarChart3, ArrowRight, Loader2
} from "lucide-react";
import Link from "next/link";

const orange = "#F97316";

interface DoctorDashboardMetrics {
  totalPatients: number;
  newPatientsThisMonth: number;
  activeAppointmentsToday: number;
  completedAppointmentsToday: number;
  pendingLabOrders: number;
  pendingPrescriptions: number;
  patientsInQueue: number;
  averageConsultationTime: number;
  patientSatisfactionScore: number;
  pendingLabResults: number;
  completedLabResults: number;
}

interface TodayAppointment {
  id: string;
  patientName: string;
  patientId: string;
  time: string;
  status: "scheduled" | "completed" | "no-show" | "in-progress";
  type: string;
  duration: number;
}

interface RecentActivity {
  id: string;
  type: "appointment" | "lab" | "prescription" | "patient";
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

export default function DoctorDashboard() {
  const params = useParams();
  const slug = params?.slug as string;
  const [metrics, setMetrics] = useState<DoctorDashboardMetrics | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
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
      const [metricsRes, appointmentsRes, activitiesRes, alertsRes] =
        await Promise.all([
          fetch(`/api/doctor/dashboard?slug=${slug}`),
          fetch(`/api/doctor/appointments?slug=${slug}&today=true`),
          fetch(`/api/doctor/activities?slug=${slug}`),
          fetch(`/api/doctor/alerts?slug=${slug}`),
        ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (appointmentsRes.ok) setTodayAppointments(await appointmentsRes.json());
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
    { icon: Plus, label: "New Appointment", color: "bg-blue-50 text-blue-600", href: `/tenant/${slug}/doctor/appointments/new` },
    { icon: Pill, label: "Prescribe", color: "bg-green-50 text-green-600", href: `/tenant/${slug}/doctor/prescriptions/new` },
    { icon: FlaskConical, label: "Lab Order", color: "bg-cyan-50 text-cyan-600", href: `/tenant/${slug}/doctor/lab-orders/new` },
    { icon: Users, label: "View Patients", color: "bg-purple-50 text-purple-600", href: `/tenant/${slug}/doctor/patients` },
    { icon: Calendar, label: "My Appointments", color: "bg-indigo-50 text-indigo-600", href: `/tenant/${slug}/doctor/appointments` },
    { icon: BarChart3, label: "Analytics", color: "bg-orange-50 text-orange-600", href: `/tenant/${slug}/doctor/analytics/my-patients` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Doctor Dashboard
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Clinical Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time patient and appointment insights
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
          title="Total Patients"
          value={metrics?.totalPatients}
          subtitle={`${metrics?.newPatientsThisMonth} new this month`}
          icon={<Users className="h-6 w-6" />}
          trend="+8%"
          trendDirection="up"
        />
        <StatCard
          title="Appointments Today"
          value={metrics?.activeAppointmentsToday}
          subtitle={`${metrics?.completedAppointmentsToday} completed`}
          icon={<Calendar className="h-6 w-6" />}
          trend="+5%"
          trendDirection="up"
        />
        <StatCard
          title="Queue Status"
          value={metrics?.patientsInQueue}
          subtitle={`Avg wait: ${metrics?.averageConsultationTime}min`}
          icon={<Clock className="h-6 w-6" />}
        />
        <StatCard
          title="Satisfaction Score"
          value={`${metrics?.patientSatisfactionScore}%`}
          subtitle="Patient feedback"
          icon={<Heart className="h-6 w-6" />}
          trend="+2%"
          trendDirection="up"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Lab Orders"
          value={metrics?.pendingLabOrders}
          subtitle={`${metrics?.completedLabResults} completed`}
          icon={<FlaskConical className="h-6 w-6" />}
        />
        <StatCard
          title="Lab Results"
          value={metrics?.pendingLabResults}
          subtitle={`Ready to review`}
          icon={<Microscope className="h-6 w-6" />}
        />
        <StatCard
          title="Pending Prescriptions"
          value={metrics?.pendingPrescriptions}
          subtitle="Awaiting patient pickup"
          icon={<Pill className="h-6 w-6" />}
        />
      </div>

      {/* Today's Appointments & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            Today's Schedule
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No appointments today</p>
              </div>
            ) : (
              todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 rounded-lg border border-gray-100 hover:border-orange-300 hover:bg-orange-50/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{apt.patientName}</p>
                      <p className="text-xs text-gray-500">{apt.type}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-semibold ${
                        apt.status === "completed"
                          ? "bg-green-50 text-green-600"
                          : apt.status === "in-progress"
                          ? "bg-blue-50 text-blue-600"
                          : apt.status === "scheduled"
                          ? "bg-yellow-50 text-yellow-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {apt.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {apt.time}
                    </span>
                    <span className="flex items-center gap-1">
                      Duration: {apt.duration} min
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
            <Zap className="h-5 w-5 text-orange-500" />
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

