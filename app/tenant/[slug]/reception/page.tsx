"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, Clock, CheckCircle, Activity,
  AlertCircle, TrendingUp, Plus, RefreshCw, Download, UserCheck,
  ClipboardList, BedDouble, AlertOctagon, Phone, MessageSquare,
  ArrowRight, BarChart3, Timer, Zap, UserPlus, FileText
} from "lucide-react";
import Link from "next/link";

const orange = "#F97316";

interface ReceptionistDashboardMetrics {
  totalPatientsToday: number;
  checkedInToday: number;
  waitingInQueue: number;
  completedAppointments: number;
  emergencyAlerts: number;
  newRegistrations: number;
  averageWaitTime: number;
  satisfactionScore: number;
  upcomingAppointments: number;
  noShowsToday: number;
}

interface TodayAppointment {
  id: string;
  patientName: string;
  patientId: string;
  time: string;
  status: "scheduled" | "checked-in" | "in-progress" | "completed" | "no-show";
  type: string;
  doctor: string;
  duration: number;
  phone: string;
}

interface QueuePatient {
  id: string;
  patientName: string;
  checkInTime: string;
  estimatedWait: number;
  priority: "low" | "normal" | "high" | "urgent";
  reason: string;
  status: "waiting" | "called" | "in-progress";
}

interface Alert {
  id: string;
  type: "emergency" | "delay" | "no-show" | "system";
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  timestamp: string;
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendDirection,
  onClick,
  color = "bg-orange-50 text-orange-600"
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: string;
  trendDirection?: "up" | "down";
  onClick?: () => void;
  color?: string;
}) => (
  <div
    onClick={onClick}
    className={`p-6 rounded-2xl border border-gray-200 bg-white hover:shadow-lg transition-all ${
      onClick ? "cursor-pointer" : ""
    }`}
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`p-2.5 rounded-xl ${color}`}>
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

export default function ReceptionistDashboard() {
  const params = useParams();
  const slug = params?.slug as string;
  const [metrics, setMetrics] = useState<ReceptionistDashboardMetrics | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [queuePatients, setQueuePatients] = useState<QueuePatient[]>([]);
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
      const [metricsRes, appointmentsRes, queueRes, alertsRes] =
        await Promise.all([
          fetch(`/api/receptionist/dashboard?slug=${slug}`),
          fetch(`/api/receptionist/appointments/today?slug=${slug}`),
          fetch(`/api/receptionist/queue?slug=${slug}`),
          fetch(`/api/receptionist/alerts?slug=${slug}`),
        ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (appointmentsRes.ok) setTodayAppointments(await appointmentsRes.json());
      if (queueRes.ok) setQueuePatients(await queueRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch receptionist dashboard data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const checkInPatient = async (appointmentId: string) => {
    try {
      const res = await fetch(`/api/receptionist/appointments/${appointmentId}/checkin?slug=${slug}`, {
        method: "POST"
      });

      if (res.ok) {
        // Update the appointment status
        setTodayAppointments(appointments =>
          appointments.map(apt =>
            apt.id === appointmentId
              ? { ...apt, status: "checked-in" as const }
              : apt
          )
        );
      }
    } catch (error) {
      console.error("Failed to check in patient:", error);
    }
  };

  const callNextPatient = async (queueId: string) => {
    try {
      const res = await fetch(`/api/receptionist/queue/${queueId}/call?slug=${slug}`, {
        method: "POST"
      });

      if (res.ok) {
        // Update queue status
        setQueuePatients(patients =>
          patients.map(patient =>
            patient.id === queueId
              ? { ...patient, status: "called" as const }
              : patient
          )
        );
      }
    } catch (error) {
      console.error("Failed to call next patient:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading receptionist dashboard...
        </div>
      </div>
    );
  }

  const quickActions = [
    { icon: UserPlus, label: "Register Patient", color: "bg-blue-50 text-blue-600", href: `/tenant/${slug}/patients/register` },
    { icon: UserCheck, label: "Check-in Patient", color: "bg-green-50 text-green-600", href: `/tenant/${slug}/check-in` },
    { icon: ClipboardList, label: "View Queue", color: "bg-purple-50 text-purple-600", href: `/tenant/${slug}/queue` },
    { icon: Calendar, label: "Schedule Appointment", color: "bg-orange-50 text-orange-600", href: `/tenant/${slug}/appointments` },
    { icon: AlertOctagon, label: "Emergency", color: "bg-red-50 text-red-600", href: `/tenant/${slug}/emergency` },
    { icon: MessageSquare, label: "Messages", color: "bg-cyan-50 text-cyan-600", href: `/tenant/${slug}/messages` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Receptionist Dashboard
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Front Desk Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage patient flow and appointments efficiently
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
            const bgColor = alert.priority === "high" ? "bg-red-50 border-red-200" :
                           alert.priority === "medium" ? "bg-yellow-50 border-yellow-200" :
                           "bg-blue-50 border-blue-200";
            const textColor = alert.priority === "high" ? "text-red-900" :
                             alert.priority === "medium" ? "text-yellow-900" :
                             "text-blue-900";
            const icon = alert.type === "emergency" ? <AlertOctagon className="h-4 w-4" /> :
                        alert.type === "delay" ? <Clock className="h-4 w-4" /> :
                        <AlertCircle className="h-4 w-4" />;

            return (
              <div key={alert.id} className={`p-4 rounded-lg border ${bgColor}`}>
                <div className="flex items-start gap-3">
                  <div className={textColor}>
                    {icon}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${textColor}`}>{alert.title}</p>
                    <p className={`text-sm mt-1 ${textColor} opacity-90`}>{alert.message}</p>
                    <p className={`text-xs mt-2 ${textColor} opacity-75`}>
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </p>
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
          title="Patients Today"
          value={metrics?.totalPatientsToday}
          subtitle={`${metrics?.checkedInToday} checked in`}
          icon={<Users className="h-6 w-6" />}
          trend="+12%"
          trendDirection="up"
        />
        <StatCard
          title="Queue Status"
          value={metrics?.waitingInQueue}
          subtitle={`Avg wait: ${metrics?.averageWaitTime}min`}
          icon={<ClipboardList className="h-6 w-6" />}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Completed Today"
          value={metrics?.completedAppointments}
          subtitle={`${metrics?.noShowsToday} no-shows`}
          icon={<CheckCircle className="h-6 w-6" />}
          color="bg-green-50 text-green-600"
          trend="+8%"
          trendDirection="up"
        />
        <StatCard
          title="Satisfaction Score"
          value={`${metrics?.satisfactionScore}%`}
          subtitle="Patient feedback"
          icon={<TrendingUp className="h-6 w-6" />}
          color="bg-purple-50 text-purple-600"
          trend="+3%"
          trendDirection="up"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Emergency Alerts"
          value={metrics?.emergencyAlerts}
          subtitle="Require immediate attention"
          icon={<AlertOctagon className="h-6 w-6" />}
          color="bg-red-50 text-red-600"
        />
        <StatCard
          title="New Registrations"
          value={metrics?.newRegistrations}
          subtitle="This week"
          icon={<UserPlus className="h-6 w-6" />}
          color="bg-cyan-50 text-cyan-600"
        />
        <StatCard
          title="Upcoming Appointments"
          value={metrics?.upcomingAppointments}
          subtitle="Next hour"
          icon={<Calendar className="h-6 w-6" />}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      {/* Today's Schedule & Queue Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Appointments */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            Today's Appointments
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No appointments scheduled for today</p>
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
                      <p className="text-xs text-gray-500">{apt.type} with {apt.doctor}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-semibold ${
                          apt.status === "completed"
                            ? "bg-green-50 text-green-600"
                            : apt.status === "checked-in"
                            ? "bg-blue-50 text-blue-600"
                            : apt.status === "in-progress"
                            ? "bg-purple-50 text-purple-600"
                            : apt.status === "scheduled"
                            ? "bg-yellow-50 text-yellow-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {apt.status.toUpperCase()}
                      </span>
                      {apt.status === "scheduled" && (
                        <button
                          onClick={() => checkInPatient(apt.id)}
                          className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                        >
                          Check In
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {apt.time}
                    </span>
                    <span className="flex items-center gap-1">
                      Duration: {apt.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {apt.phone}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Queue Management */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-orange-500" />
            Patient Queue
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {queuePatients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Queue is empty</p>
              </div>
            ) : (
              queuePatients.slice(0, 5).map((patient) => (
                <div
                  key={patient.id}
                  className="p-3 rounded-lg border border-gray-100 hover:border-orange-300 hover:bg-orange-50/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-gray-900 text-sm">{patient.patientName}</p>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      patient.priority === "urgent" ? "bg-red-50 text-red-600" :
                      patient.priority === "high" ? "bg-orange-50 text-orange-600" :
                      patient.priority === "normal" ? "bg-blue-50 text-blue-600" :
                      "bg-gray-50 text-gray-600"
                    }`}>
                      {patient.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{patient.reason}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Wait: {patient.estimatedWait}min
                    </span>
                    {patient.status === "waiting" && (
                      <button
                        onClick={() => callNextPatient(patient.id)}
                        className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                      >
                        Call
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          {queuePatients.length > 5 && (
            <Link
              href={`/tenant/${slug}/queue`}
              className="block text-center mt-4 text-orange-600 hover:text-orange-700 text-sm font-semibold"
            >
              View All ({queuePatients.length})
            </Link>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6 rounded-2xl border border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`p-4 rounded-lg border border-gray-200 hover:border-orange-300 ${action.color} text-sm font-semibold transition-all text-center flex flex-col items-center gap-2`}
            >
              <action.icon className="h-5 w-5" />
              <span className="text-xs">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
