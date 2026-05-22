"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Calendar, Clock, User, MapPin, Stethoscope, Search,
  Filter, Plus, CheckCircle, XCircle, AlertCircle,
  Phone, Mail, FileText, MoreHorizontal, Loader2,
  Baby, CalendarDays, RefreshCw
} from "lucide-react";
import Link from "next/link";

const orange = "#F97316";

interface Appointment {
  id: string;
  childId: string;
  childName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no-show";
  location: string;
  notes?: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
  canReschedule: boolean;
  canCancel: boolean;
}

interface AppointmentStats {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
}

export default function GuardianAppointmentsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterChild, setFilterChild] = useState<string>("all");
  const [view, setView] = useState<"list" | "calendar">("list");

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setRefreshing(true);
      const [appointmentsRes, statsRes] = await Promise.all([
        fetch(`/api/guardian/appointments?slug=${slug}`),
        fetch(`/api/guardian/appointments/stats?slug=${slug}`)
      ]);

      if (appointmentsRes.ok) setAppointments(await appointmentsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const res = await fetch(`/api/guardian/appointments/${appointmentId}/cancel?slug=${slug}`, {
        method: "POST"
      });

      if (res.ok) {
        setAppointments(appointments.map(apt =>
          apt.id === appointmentId
            ? { ...apt, status: "cancelled" as const }
            : apt
        ));
      }
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.childName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || appointment.status === filterStatus;
    const matchesChild = filterChild === "all" || appointment.childId === filterChild;

    return matchesSearch && matchesStatus && matchesChild;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "scheduled": return <Clock className="h-5 w-5 text-blue-600" />;
      case "confirmed": return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "cancelled": return <XCircle className="h-5 w-5 text-red-600" />;
      case "no-show": return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-50 border-green-200 text-green-900";
      case "scheduled": return "bg-blue-50 border-blue-200 text-blue-900";
      case "confirmed": return "bg-green-50 border-green-200 text-green-900";
      case "cancelled": return "bg-red-50 border-red-200 text-red-900";
      case "no-show": return "bg-orange-50 border-orange-200 text-orange-900";
      default: return "bg-gray-50 border-gray-200 text-gray-900";
    }
  };

  const getUniqueChildren = () => {
    const children = new Map();
    appointments.forEach(apt => {
      if (!children.has(apt.childId)) {
        children.set(apt.childId, { id: apt.childId, name: apt.childName });
      }
    });
    return Array.from(children.values());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Loading appointments...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Appointments
          </p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            Healthcare Visits
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your children's medical appointments
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAppointments}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href={`/tenant/${slug}/guardian/book`}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Book Appointment
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Upcoming</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.upcoming || 0}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.completed || 0}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Cancelled</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.cancelled || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              view === "list"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              view === "calendar"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Calendar View
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search appointments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterChild}
            onChange={(e) => setFilterChild(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Children</option>
            {getUniqueChildren().map((child) => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no-show">No Show</option>
          </select>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No appointments found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterChild !== "all" || filterStatus !== "all"
                ? "Try adjusting your search or filters"
                : "No appointments scheduled yet"}
            </p>
            <Link
              href={`/tenant/${slug}/guardian/book`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Book First Appointment
            </Link>
          </div>
        ) : (
          filteredAppointments.map((appointment) => (
            <div key={appointment.id} className={`p-6 rounded-lg border ${getStatusColor(appointment.status)}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {getStatusIcon(appointment.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{appointment.type}</h3>
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold uppercase bg-white bg-opacity-50`}>
                        {appointment.status}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-3">{appointment.reason}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Baby className="h-4 w-4" />
                        <span>{appointment.childName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{appointment.doctorName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(appointment.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{appointment.time} ({appointment.duration}min)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm mt-2">
                      <MapPin className="h-4 w-4" />
                      <span>{appointment.location}</span>
                    </div>

                    {appointment.specialty && (
                      <div className="flex items-center gap-2 text-sm mt-1">
                        <Stethoscope className="h-4 w-4" />
                        <span>{appointment.specialty}</span>
                      </div>
                    )}

                    {appointment.notes && (
                      <div className="mt-3 p-3 bg-white bg-opacity-50 rounded-lg">
                        <p className="text-sm font-semibold mb-1">Notes:</p>
                        <p className="text-sm">{appointment.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {appointment.status === "scheduled" && (
                    <div className="flex gap-1">
                      {appointment.canReschedule && (
                        <button className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-white hover:bg-opacity-50">
                          <Calendar className="h-4 w-4" />
                        </button>
                      )}
                      {appointment.canCancel && (
                        <button
                          onClick={() => cancelAppointment(appointment.id)}
                          className="p-2 text-gray-600 hover:text-red-600 rounded-lg hover:bg-white hover:bg-opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                  <button className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-white hover:bg-opacity-50">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
