"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, Search, Plus, Clock, User, Stethoscope, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

const orange = "#F97316";

type Appointment = {
  id: string;
  tenantId: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
};

export default function AppointmentsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (slug) {
      fetchAppointments();
    }
  }, [slug]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/appointments`);
      if (!res.ok) throw new Error('Failed to fetch appointments');
      const data = await res.json();
      setAppointments(data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      // Keep empty array on error
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(a => {
    const matchesSearch = a.patientId.toLowerCase().includes(search.toLowerCase()) ||
                         a.doctorId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-50 text-blue-700 border-blue-100";
      case "completed": return "bg-green-50 text-green-700 border-green-100";
      case "cancelled": return "bg-red-50 text-red-700 border-red-100";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled": return <Clock className="size-3" />;
      case "completed": return <CheckCircle className="size-3" />;
      case "cancelled": return <XCircle className="size-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Appointment Management</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Appointments</h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule and manage patient appointments.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
          <Plus className="size-4" />
          New Appointment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Calendar className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total</p>
              <p className="text-2xl font-semibold text-foreground">{appointments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Scheduled</p>
              <p className="text-2xl font-semibold text-foreground">{appointments.filter(a => a.status === "scheduled").length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-500">
              <CheckCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Completed</p>
              <p className="text-2xl font-semibold text-foreground">{appointments.filter(a => a.status === "completed").length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500">
              <XCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cancelled</p>
              <p className="text-2xl font-semibold text-foreground">{appointments.filter(a => a.status === "cancelled").length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search appointments by patient, doctor, or type..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <th className="text-left px-5 py-3">Patient</th>
                <th className="text-left px-5 py-3">Doctor</th>
                <th className="text-left px-5 py-3">Date & Time</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="size-6 text-orange-500 animate-spin mx-auto" /></td></tr>
              ) : filteredAppointments.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center">
                  <Calendar className="size-10 text-muted mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium">No appointments found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your search criteria</p>
                </td></tr>
              ) : (
                filteredAppointments.map(a => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border shrink-0">
                          <User className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{a.patientId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border shrink-0">
                          <Stethoscope className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{a.doctorId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{new Date(a.scheduledAt).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.scheduledAt).toLocaleTimeString()}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="text-sm text-foreground">{a.status}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(a.status)}`}>
                        {getStatusIcon(a.status)}
                        {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-semibold text-xs transition-colors border border-transparent hover:border-blue-100">
                          View Details
                        </button>
                        {a.status === "scheduled" && (
                          <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-orange-600 hover:bg-orange-50 font-semibold text-xs transition-colors border border-transparent hover:border-orange-100">
                            Reschedule
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
