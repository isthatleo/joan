"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, Clock, CheckCircle, Activity,
  AlertCircle, TrendingUp, Plus, RefreshCw, Download, Heart,
  Baby, ShieldCheck, Bell, FileText, UserCheck, Loader2,
  ArrowRight, BarChart3, CalendarDays, Stethoscope
} from "lucide-react";
import Link from "next/link";

const orange = "#F97316";

interface GuardianDashboardMetrics {
  totalChildren: number;
  activeChildren: number;
  upcomingAppointments: number;
  completedAppointments: number;
  pendingVaccinations: number;
  completedVaccinations: number;
  unreadAlerts: number;
  healthRecordsCount: number;
  averageHealthScore: number;
  recentActivityCount: number;
}

interface ChildProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  lastVisit: string;
  nextAppointment?: string;
  healthStatus: "excellent" | "good" | "fair" | "poor";
  avatar?: string;
}

interface UpcomingAppointment {
  id: string;
  childName: string;
  childId: string;
  date: string;
  time: string;
  type: string;
  doctor: string;
  location: string;
}

interface RecentActivity {
  id: string;
  type: "appointment" | "vaccination" | "record" | "alert";
  title: string;
  description: string;
  childName: string;
  timestamp: string;
}

interface Alert {
  id: string;
  type: "info" | "warning" | "success" | "error";
  title: string;
  message: string;
  childName?: string;
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

export default function GuardianDashboard() {
  const params = useParams();
  const slug = params?.slug as string;
  const [metrics, setMetrics] = useState<GuardianDashboardMetrics | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
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
      const [metricsRes, childrenRes, appointmentsRes, activitiesRes, alertsRes] =
        await Promise.all([
          fetch(`/api/guardian/dashboard?slug=${slug}`),
          fetch(`/api/guardian/children?slug=${slug}`),
          fetch(`/api/guardian/appointments?slug=${slug}&upcoming=true`),
          fetch(`/api/guardian/activities?slug=${slug}`),
          fetch(`/api/guardian/alerts?slug=${slug}`),
        ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (childrenRes.ok) setChildren(await childrenRes.json());
      if (appointmentsRes.ok) setUpcomingAppointments(await appointmentsRes.json());
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
          Loading guardian dashboard...
        </div>
      </div>
    );
  }

  const quickActions = [
    { icon: Calendar, label: "Book Appointment", color: "bg-blue-50 text-blue-600", href: `/tenant/${slug}/guardian/book` },
    { icon: FileText, label: "View Records", color: "bg-green-50 text-green-600", href: `/tenant/${slug}/guardian/records` },
    { icon: ShieldCheck, label: "Vaccinations", color: "bg-cyan-50 text-cyan-600", href: `/tenant/${slug}/guardian/vaccinations` },
    { icon: Bell, label: "Alerts", color: "bg-purple-50 text-purple-600", href: `/tenant/${slug}/guardian/alerts` },
    { icon: Users, label: "Child Profiles", color: "bg-indigo-50 text-indigo-600", href: `/tenant/${slug}/guardian/children` },
    { icon: BarChart3, label: "Health Analytics", color: "bg-orange-50 text-orange-600", href: `/tenant/${slug}/analytics/guardian` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Guardian Dashboard
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Family Health Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor your children's health and manage appointments
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
                    {alert.childName && (
                      <p className={`text-xs mt-2 ${textColor} opacity-75`}>Regarding: {alert.childName}</p>
                    )}
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
          title="Children"
          value={metrics?.totalChildren}
          subtitle={`${metrics?.activeChildren} active profiles`}
          icon={<Baby className="h-6 w-6" />}
          trend="+1"
          trendDirection="up"
        />
        <StatCard
          title="Upcoming Appointments"
          value={metrics?.upcomingAppointments}
          subtitle={`${metrics?.completedAppointments} completed this month`}
          icon={<Calendar className="h-6 w-6" />}
        />
        <StatCard
          title="Vaccinations"
          value={metrics?.pendingVaccinations}
          subtitle={`${metrics?.completedVaccinations} completed`}
          icon={<ShieldCheck className="h-6 w-6" />}
        />
        <StatCard
          title="Health Score"
          value={`${metrics?.averageHealthScore}%`}
          subtitle="Average across children"
          icon={<Heart className="h-6 w-6" />}
          trend="+5%"
          trendDirection="up"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Health Records"
          value={metrics?.healthRecordsCount}
          subtitle="Total medical records"
          icon={<FileText className="h-6 w-6" />}
        />
        <StatCard
          title="Unread Alerts"
          value={metrics?.unreadAlerts}
          subtitle="Require attention"
          icon={<Bell className="h-6 w-6" />}
        />
        <StatCard
          title="Recent Activity"
          value={metrics?.recentActivityCount}
          subtitle="Last 7 days"
          icon={<Activity className="h-6 w-6" />}
        />
      </div>

      {/* Children Overview & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Children Overview */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            Children Overview
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {children.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Baby className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No children profiles found</p>
                <Link
                  href={`/tenant/${slug}/guardian/children`}
                  className="text-orange-500 hover:text-orange-600 text-sm mt-2 inline-block"
                >
                  Add your first child →
                </Link>
              </div>
            ) : (
              children.map((child) => (
                <div
                  key={child.id}
                  className="p-4 rounded-lg border border-gray-100 hover:border-orange-300 hover:bg-orange-50/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <span className="text-orange-600 font-semibold text-sm">
                          {child.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{child.name}</p>
                        <p className="text-xs text-gray-500">Age {child.age} • {child.gender}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-semibold ${
                        child.healthStatus === "excellent"
                          ? "bg-green-50 text-green-600"
                          : child.healthStatus === "good"
                          ? "bg-blue-50 text-blue-600"
                          : child.healthStatus === "fair"
                          ? "bg-yellow-50 text-yellow-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {child.healthStatus.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                    <span>Last visit: {new Date(child.lastVisit).toLocaleDateString()}</span>
                    {child.nextAppointment && (
                      <span>Next: {new Date(child.nextAppointment).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
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

      {/* Upcoming Appointments & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Appointments */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-orange-500" />
            Upcoming Appointments
          </h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No upcoming appointments</p>
                <Link
                  href={`/tenant/${slug}/guardian/book`}
                  className="text-orange-500 hover:text-orange-600 text-sm mt-2 inline-block"
                >
                  Book an appointment →
                </Link>
              </div>
            ) : (
              upcomingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 rounded-lg border border-gray-100 hover:border-orange-300 hover:bg-orange-50/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{apt.childName}</p>
                      <p className="text-xs text-gray-500">{apt.type} with {apt.doctor}</p>
                    </div>
                    <span className="px-2 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-600">
                      UPCOMING
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(apt.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {apt.time}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{apt.location}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            Recent Activity
          </h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
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
                    <p className="text-xs text-gray-400 mt-1">{activity.childName} • {new Date(activity.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
