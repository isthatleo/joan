"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Eye, KeyRound, Loader2, Plus, RefreshCw, Search, Shield, Stethoscope, UserCheck, UserX, Users } from "lucide-react";
import { useTenantPath } from "@/hooks/useTenantPath";

type StaffMember = {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  roleLabel: string;
  department: string;
  title: string;
  employeeId: string;
  isActive: boolean;
  forcePasswordChange: boolean;
  createdAt: string;
};

type StaffStats = {
  total: number;
  active: number;
  inactive: number;
  doctors: number;
  nurses: number;
  admins: number;
  forcePasswordChange: number;
};

const EMPTY_STATS: StaffStats = {
  total: 0,
  active: 0,
  inactive: 0,
  doctors: 0,
  nurses: 0,
  admins: 0,
  forcePasswordChange: 0,
};

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString();
}

function statusClass(isActive: boolean) {
  return isActive
    ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300"
    : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
}

export default function StaffManagementPage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const tenantPath = useTenantPath();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<StaffStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);

  const fetchStaff = async (showRefresh = false) => {
    if (!slug) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tenant/${slug}/staff`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to fetch staff");
      setStaff(Array.isArray(data?.staff) ? data.staff : []);
      setStats(data?.stats || EMPTY_STATS);
    } catch (fetchError: any) {
      console.error("Failed to fetch staff:", fetchError);
      setError(fetchError?.message || "Failed to fetch staff");
      setStaff([]);
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchStaff(false);
  }, [slug]);

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    return staff.filter((member) => {
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? member.isActive : !member.isActive);
      const haystack = [
        member.fullName,
        member.email,
        member.phone,
        member.roleLabel,
        member.department,
        member.title,
        member.employeeId,
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesRole && matchesStatus && (!query || haystack.includes(query));
    });
  }, [staff, search, roleFilter, statusFilter]);

  const resetPassword = async (member: StaffMember) => {
    if (!window.confirm(`Generate a temporary password for ${member.fullName}? They will be forced to change it after login.`)) return;
    setBusyId(`reset-${member.id}`);
    setError(null);
    try {
      const response = await fetch(`/api/tenant/${slug}/staff/${member.id}/reset-password`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to reset password");
      setResetResult({ email: member.email, password: data.temporaryPassword });
      await fetchStaff(true);
    } catch (resetError: any) {
      setError(resetError?.message || "Failed to reset password");
    } finally {
      setBusyId(null);
    }
  };

  const updateStatus = async (member: StaffMember, isActive: boolean) => {
    const action = isActive ? "reactivate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${action} ${member.fullName}?`)) return;
    setBusyId(`status-${member.id}`);
    setError(null);
    try {
      const response = await fetch(`/api/tenant/${slug}/staff/${member.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to update staff status");
      await fetchStaff(true);
    } catch (statusError: any) {
      setError(statusError?.message || "Failed to update staff status");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Staff Management</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Staff Directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register staff, manage dashboard access, reset credentials, and deactivate accounts for this tenant.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fetchStaff(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${refreshing || loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link href={tenantPath("/staff-management/new")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90">
            <Plus className="size-4" />
            Add Staff Member
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div>
      ) : null}

      {resetResult ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-semibold">Temporary password generated for {resetResult.email}</p>
          <p className="mt-1 font-mono text-base">{resetResult.password}</p>
          <p className="mt-1 text-xs">Share this securely. The user must change it immediately after login.</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-500 dark:bg-blue-500/10"><Stethoscope className="size-5" /></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Doctors</p><p className="text-2xl font-semibold text-foreground">{stats.doctors}</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-full bg-green-50 text-green-500 dark:bg-green-500/10"><UserCheck className="size-5" /></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nurses</p><p className="text-2xl font-semibold text-foreground">{stats.nurses}</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-full bg-purple-50 text-purple-500 dark:bg-purple-500/10"><Shield className="size-5" /></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admins</p><p className="text-2xl font-semibold text-foreground">{stats.admins}</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-full bg-orange-50 text-orange-500 dark:bg-orange-500/10"><Users className="size-5" /></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Staff</p><p className="text-2xl font-semibold text-foreground">{stats.total}</p></div></div></div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_200px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search staff by name, email, phone, role, employee ID, or department..."
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground focus:outline-none focus:border-orange-300"
            />
          </div>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="all">All roles</option>
            <option value="hospital_admin">Hospital Admins</option>
            <option value="doctor">Doctors</option>
            <option value="nurse">Nurses</option>
            <option value="lab_technician">Lab Technicians</option>
            <option value="pharmacist">Pharmacists</option>
            <option value="accountant">Accountants</option>
            <option value="receptionist">Receptionists</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 text-left">Staff Member</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Department</th>
                <th className="px-5 py-3 text-left">Access</th>
                <th className="px-5 py-3 text-left">Join Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="mx-auto size-6 animate-spin text-orange-500" /></td></tr>
              ) : filteredStaff.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center"><Users className="mx-auto mb-2 size-10 text-muted" /><p className="font-medium text-muted-foreground">No staff members found</p><p className="mt-1 text-xs text-muted-foreground">Try adjusting your search or filters.</p></td></tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr key={member.id} className="transition-colors hover:bg-muted/30">
                    <td className="whitespace-nowrap px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground"><Users className="size-4" /></div>
                        <div>
                          <p className="font-semibold text-foreground">{member.fullName}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3"><span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">{member.roleLabel}</span></td>
                    <td className="whitespace-nowrap px-5 py-3"><p className="text-sm text-foreground">{member.department || "General"}</p><p className="text-xs text-muted-foreground">{member.employeeId || member.title || "No employee ID"}</p></td>
                    <td className="whitespace-nowrap px-5 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(member.isActive)}`}>{member.isActive ? "Active" : "Inactive"}</span>{member.forcePasswordChange ? <p className="mt-1 text-xs text-amber-600">Password change required</p> : null}</td>
                    <td className="whitespace-nowrap px-5 py-3"><p className="text-sm text-foreground">{formatDate(member.createdAt)}</p></td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={tenantPath(`/staff-management/${member.id}`)} className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600">
                          <Eye className="size-3" /> View
                        </Link>
                        <button onClick={() => resetPassword(member)} disabled={busyId === `reset-${member.id}`} className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-orange-100 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-60">
                          <KeyRound className="size-3" /> Reset
                        </button>
                        <button onClick={() => updateStatus(member, !member.isActive)} disabled={busyId === `status-${member.id}`} className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-600 disabled:opacity-60">
                          {member.isActive ? <UserX className="size-3" /> : <UserCheck className="size-3" />}
                          {member.isActive ? "Deactivate" : "Activate"}
                        </button>
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
