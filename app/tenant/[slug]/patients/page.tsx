"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Activity, Calendar, Eye, Loader2, Mail, Phone, RefreshCw, Search, UserCheck, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { withTenantPrefix } from "@/lib/tenant-routing";
import { useAuthStore } from "@/stores/auth"; // Import useAuthStore

type Patient = {
  id: string;
  userId: string;
  patientRecordId: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  dob: string | null;
  gender: string;
  address: string;
  status: "active" | "inactive";
  isActive: boolean;
  appointmentCount: number;
  visitCount: number;
  lastVisitAt: string | null;
  medicalRecordNumber?: string | null;
  role?: string;
  roles?: string[];
  createdAt: string;
};

type PatientStats = {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
  withPatientRecord: number;
};

const EMPTY_STATS: PatientStats = {
  total: 0,
  active: 0,
  inactive: 0,
  newThisMonth: 0,
  withPatientRecord: 0,
};

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString();
}

function isPatientRole(patient: Patient) {
  const roles = [patient.role, ...(patient.roles || [])].map((role) => String(role || "").trim().toLowerCase());
  return roles.includes("patient");
}

export default function PatientsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const { user } = useAuthStore(); // Get user from auth store
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<PatientStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [error, setError] = useState<string | null>(null);

  const toTenantPath = (path: string) => withTenantPrefix(path, slug, hostname);

  useEffect(() => {
    if (slug) {
      void fetchPatients();
    }
  }, [slug]);

  const fetchPatients = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenant/${slug}/patients`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to fetch patients");

      const rows = Array.isArray(data) ? data : data?.patients;
      const patientRows = Array.isArray(rows) ? rows.filter(isPatientRole) : [];
      setPatients(patientRows);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      setStats({
        total: patientRows.length,
        active: patientRows.filter((row: Patient) => row.isActive).length,
        inactive: patientRows.filter((row: Patient) => !row.isActive).length,
        newThisMonth: patientRows.filter((row: Patient) => new Date(row.createdAt) >= monthStart).length,
        withPatientRecord: patientRows.filter((row: Patient) => row.patientRecordId).length,
      });
    } catch (fetchError: any) {
      console.error("Failed to fetch patients:", fetchError);
      setError(fetchError?.message || "Failed to fetch patients");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return patients.filter((patient) => {
      const matchesStatus = statusFilter === "all" || patient.status === statusFilter;
      const matchesSearch =
        !query ||
        patient.fullName.toLowerCase().includes(query) ||
        patient.email.toLowerCase().includes(query) ||
        String(patient.phone || "").toLowerCase().includes(query) ||
        String(patient.medicalRecordNumber || "").toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [patients, search, statusFilter]);

  const isHospitalAdmin = user?.role === "hospital_admin"; // Check if user is hospital_admin

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Patient Management</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Patients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Read-only patient directory for tenant users assigned the patient role.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isHospitalAdmin && ( // Conditionally render button for non-hospital_admin roles
            <Link
              href={toTenantPath("/patients/register")}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <UserPlus className="size-4" />
              New Patient
            </Link>
          )}
          <button
            type="button"
            onClick={fetchPatients}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Patient Users</p>
              <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-500">
              <UserCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Active</p>
              <p className="text-2xl font-semibold text-foreground">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Activity className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">With Records</p>
              <p className="text-2xl font-semibold text-foreground">{stats.withPatientRecord}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Calendar className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">New This Month</p>
              <p className="text-2xl font-semibold text-foreground">{stats.newThisMonth}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patients by name, email, phone, or MRN..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <th className="text-left px-5 py-3">Patient</th>
                <th className="text-left px-5 py-3">Contact</th>
                <th className="text-left px-5 py-3">MRN</th>
                <th className="text-left px-5 py-3">Activity</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Loader2 className="size-6 text-orange-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Users className="size-10 text-muted mx-auto mb-2" />
                    <p className="text-muted-foreground font-medium">No patient users found</p>
                    <p className="text-xs text-muted-foreground mt-1">Only tenant users assigned the patient role appear here.</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border shrink-0">
                          <Users className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{patient.fullName}</p>
                          <p className="text-xs capitalize text-muted-foreground">{patient.gender || "Gender not recorded"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div>
                        <p className="text-sm text-foreground">{patient.email || "No email"}</p>
                        <p className="text-xs text-muted-foreground">{patient.phone || "No phone"}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 rounded bg-muted border border-border text-foreground font-mono text-[10px]">
                        {patient.medicalRecordNumber || "No MRN"}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div>
                        <p className="text-sm text-foreground">{patient.appointmentCount} appointments</p>
                        <p className="text-xs text-muted-foreground">Last visit: {formatDate(patient.lastVisitAt)}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                        patient.isActive
                          ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300"
                          : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                      }`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {patient.phone ? (
                          <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 font-semibold text-xs transition-colors border border-transparent hover:border-green-100">
                            <Phone className="size-3" />
                            Call
                          </a>
                        ) : null}
                        {patient.email ? (
                          <a href={`mailto:${patient.email}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-orange-600 hover:bg-orange-50 font-semibold text-xs transition-colors border border-transparent hover:border-orange-100">
                            <Mail className="size-3" />
                            Email
                          </a>
                        ) : null}
                        <Link
                          href={toTenantPath(`/patients/${patient.id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 font-semibold text-xs transition-colors border border-transparent hover:border-blue-100"
                        >
                          <Eye className="size-3" />
                          View
                        </Link>
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