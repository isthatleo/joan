"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import {
  LayoutDashboard, Users, Calendar, Clock, CheckCircle, Activity,
  AlertCircle, TrendingUp, Plus, RefreshCw, Download, Pill,
  Stethoscope, FileText, UserCheck, ClipboardList, ArrowRight
} from "lucide-react";
import Link from "next/link";

const orange = "#F97316";

interface DoctorDashboardMetrics {
  totalPatients: number;
  todaysAppointments: number;
  pendingPrescriptions: number;
  completedVisits: number;
  urgentCases: number;
  averageConsultationTime: number;
}

interface TodayAppointment {
  id: string;
  patientName: string;
  patientId: string;
  time: string;
  type: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
}

interface RecentActivity {
  id: string;
  type: "prescription" | "visit" | "appointment" | "note";
  title: string;
  description: string;
  timestamp: string;
  patientName: string;
}

interface Alert {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
}

export function DoctorDashboard() {
  const params = useParams();
  const slug = params?.slug as string;
  const { user } = useAuthStore();

  const [metrics, setMetrics] = useState<DoctorDashboardMetrics>({
    totalPatients: 0,
    todaysAppointments: 0,
    pendingPrescriptions: 0,
    completedVisits: 0,
    urgentCases: 0,
    averageConsultationTime: 0,
  });

  const [todaysAppointments, setTodaysAppointments] = useState<TodayAppointment[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [slug]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/doctor/dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load doctor dashboard");
      const data = await response.json();
      const apiMetrics = data.metrics || {};
      const appointments = Array.isArray(data.todayAppointments) ? data.todayAppointments : [];
      const labOrders = Array.isArray(data.recentLabOrders) ? data.recentLabOrders : [];
      const prescriptions = Array.isArray(data.recentPrescriptions) ? data.recentPrescriptions : [];
      const queue = Array.isArray(data.queueSnapshot) ? data.queueSnapshot : [];

      setMetrics({
        totalPatients: Number(apiMetrics.totalPatients || 0),
        todaysAppointments: Number(apiMetrics.appointmentsToday || 0),
        pendingPrescriptions: Number(apiMetrics.recentPrescriptions || 0),
        completedVisits: Number(apiMetrics.completedToday || 0),
        urgentCases: queue.filter((entry: any) => entry.priority === "urgent" || entry.priority === "emergency").length,
        averageConsultationTime: Number(apiMetrics.averageConsultationTime || 0),
      });

      setTodaysAppointments(appointments.map((appointment: any) => ({
        id: appointment.id,
        patientName: appointment.patientName || "Patient",
        patientId: appointment.patientId,
        time: appointment.scheduledAt ? new Date(appointment.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Unscheduled",
        type: "Appointment",
        status: appointment.status || "scheduled",
      })));

      setRecentActivity([
        ...prescriptions.map((item: any) => ({
          id: `rx-${item.id}`,
          type: "prescription" as const,
          title: "Prescription issued",
          description: item.prescribedAt ? new Date(item.prescribedAt).toLocaleString() : "Prescription recorded",
          timestamp: item.prescribedAt ? new Date(item.prescribedAt).toLocaleString() : "",
          patientName: item.patientName || "Patient",
        })),
        ...labOrders.map((item: any) => ({
          id: `lab-${item.id}`,
          type: "note" as const,
          title: "Lab order updated",
          description: item.status || "Lab order recorded",
          timestamp: item.orderedAt ? new Date(item.orderedAt).toLocaleString() : "",
          patientName: item.patientName || "Patient",
        })),
      ].slice(0, 6));

      setAlerts(queue
        .filter((entry: any) => entry.priority === "urgent" || entry.priority === "emergency")
        .map((entry: any) => ({
          id: entry.id,
          type: "warning" as const,
          title: "Urgent queue case",
          message: `${entry.patientName || "Patient"} is waiting in queue ${entry.queueNumber || ""}`.trim(),
        })));
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { icon: Plus, label: "New Prescription", color: "bg-blue-50 text-blue-600", href: `/tenant/${slug}/doctor/prescriptions/new` },
    { icon: Calendar, label: "Schedule Appointment", color: "bg-green-50 text-green-600", href: `/tenant/${slug}/doctor/appointments/new` },
    { icon: Users, label: "View Patients", color: "bg-purple-50 text-purple-600", href: `/tenant/${slug}/doctor/patients` },
    { icon: FileText, label: "Medical Records", color: "bg-indigo-50 text-indigo-600", href: `/tenant/${slug}/doctor/records` },
    { icon: ClipboardList, label: "My Prescriptions", color: "bg-orange-50 text-orange-600", href: `/tenant/${slug}/doctor/prescriptions` },
    { icon: Stethoscope, label: "Start Consultation", color: "bg-cyan-50 text-cyan-600", href: `/tenant/${slug}/doctor/consultation` },
  ];

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color = "text-gray-600",
    bgColor = "bg-gray-50"
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    color?: string;
    bgColor?: string;
  }) => (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${bgColor}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading your dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, Dr. {user?.fullName || 'Doctor'}. Here's your overview for today.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Today's Appointments"
          value={metrics.todaysAppointments}
          subtitle="scheduled"
          icon={Calendar}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Pending Prescriptions"
          value={metrics.pendingPrescriptions}
          subtitle="need review"
          icon={Pill}
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
        <StatCard
          title="Total Patients"
          value={metrics.totalPatients}
          subtitle="under care"
          icon={Users}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          title="Completed Visits"
          value={metrics.completedVisits}
          subtitle="this month"
          icon={CheckCircle}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <StatCard
          title="Urgent Cases"
          value={metrics.urgentCases}
          subtitle="require attention"
          icon={AlertCircle}
          color="text-red-600"
          bgColor="bg-red-50"
        />
        <StatCard
          title="Avg Consultation"
          value={`${metrics.averageConsultationTime}m`}
          subtitle="time"
          icon={Clock}
          color="text-indigo-600"
          bgColor="bg-indigo-50"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className={`flex flex-col items-center p-4 rounded-lg border hover:shadow-md transition-shadow ${action.color}`}
            >
              <action.icon className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium text-center">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Today's Appointments</h2>
            <Link
              href={`/tenant/${slug}/doctor/appointments`}
              className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {todaysAppointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    appointment.status === 'completed' ? 'bg-green-500' :
                    appointment.status === 'in_progress' ? 'bg-blue-500' :
                    appointment.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
                  }`} />
                  <div>
                    <p className="font-medium">{appointment.patientName}</p>
                    <p className="text-sm text-muted-foreground">{appointment.type} at {appointment.time}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                  appointment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {appointment.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <Link
              href={`/tenant/${slug}/doctor/activity`}
              className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className={`p-2 rounded-full ${
                  activity.type === 'prescription' ? 'bg-blue-50' :
                  activity.type === 'visit' ? 'bg-green-50' :
                  activity.type === 'appointment' ? 'bg-purple-50' : 'bg-gray-50'
                }`}>
                  {activity.type === 'prescription' && <Pill className="h-4 w-4 text-blue-600" />}
                  {activity.type === 'visit' && <Stethoscope className="h-4 w-4 text-green-600" />}
                  {activity.type === 'appointment' && <Calendar className="h-4 w-4 text-purple-600" />}
                  {activity.type === 'note' && <FileText className="h-4 w-4 text-gray-600" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{activity.patientName} • {activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Alerts & Notifications</h2>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border ${
                alert.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                alert.type === 'error' ? 'border-red-200 bg-red-50' :
                alert.type === 'success' ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'
              }`}>
                <div className="flex items-start gap-3">
                  {alert.type === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />}
                  {alert.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />}
                  {alert.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />}
                  {alert.type === 'info' && <Activity className="h-5 w-5 text-blue-600 mt-0.5" />}
                  <div>
                    <h3 className="font-medium">{alert.title}</h3>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
