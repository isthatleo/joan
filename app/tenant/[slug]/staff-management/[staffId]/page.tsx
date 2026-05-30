"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, Mail, Phone, Shield, UserCheck, UserX, Users } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { useTenantPath } from "@/hooks/useTenantPath";

type StaffMember = {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  role: string;
  roleLabel: string;
  roles: string[];
  department: string;
  title: string;
  employeeId: string;
  licenseNumber: string;
  startDate: string;
  emergencyContact: string;
  isActive: boolean;
  forcePasswordChange: boolean;
  createdAt: string;
  updatedAt: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString();
}

export default function StaffDetailPage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const staffId = String(params?.staffId || "");
  const tenantPath = useTenantPath();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  const loadStaff = async () => {
    if (!slug || !staffId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tenant/${slug}/staff/${staffId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to load staff member");
      setStaff(data?.staff || null);
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load staff member");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStaff();
  }, [slug, staffId]);

  const resetPassword = async () => {
    if (!staff || !window.confirm(`Generate a temporary password for ${staff.fullName}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/tenant/${slug}/staff/${staff.id}/reset-password`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to reset password");
      setTemporaryPassword(data.temporaryPassword);
      await loadStaff();
    } catch (resetError: any) {
      setError(resetError?.message || "Failed to reset password");
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (isActive: boolean) => {
    if (!staff || !window.confirm(`${isActive ? "Reactivate" : "Deactivate"} ${staff.fullName}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/tenant/${slug}/staff/${staff.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to update status");
      await loadStaff();
    } catch (statusError: any) {
      setError(statusError?.message || "Failed to update status");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Staff Profile</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">{loading ? "Loading staff..." : staff?.fullName || "Staff member"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review access, role assignment, employment metadata, and credential state.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={tenantPath("/staff-management")} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"><ArrowLeft className="size-4" /> Back</Link>
          {staff ? <button type="button" onClick={resetPassword} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"><KeyRound className="size-4" /> Reset Password</button> : null}
          {staff ? <button type="button" onClick={() => updateStatus(!staff.isActive)} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{staff.isActive ? <UserX className="size-4" /> : <UserCheck className="size-4" />}{staff.isActive ? "Deactivate" : "Activate"}</button> : null}
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}
      {temporaryPassword ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"><p className="font-semibold">Temporary password generated</p><p className="mt-1 font-mono text-lg">{temporaryPassword}</p><p className="mt-1 text-xs">The staff member must change it immediately after login.</p></div> : null}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="size-6 animate-spin text-orange-500" /></div>
      ) : staff ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KPICard title="Role" value={staff.roleLabel} subtitle={staff.department || "No department"} tone="info" icon={Shield} />
            <KPICard title="Dashboard Access" value={staff.isActive ? "Active" : "Inactive"} subtitle={staff.isActive ? "Can sign in" : "Blocked from dashboards"} tone={staff.isActive ? "success" : "warning"} icon={UserCheck} />
            <KPICard title="Password State" value={staff.forcePasswordChange ? "Change Required" : "Current"} subtitle="Credential policy" tone={staff.forcePasswordChange ? "warning" : "success"} icon={KeyRound} />
            <KPICard title="Joined" value={formatDate(staff.createdAt).split(",")[0]} subtitle="Created date" tone="primary" icon={Users} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Identity & Contact</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Full name</p><p className="mt-1 text-sm text-foreground">{staff.fullName}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p><p className="mt-1 text-sm text-foreground">{staff.email}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Phone</p><p className="mt-1 text-sm text-foreground">{staff.phone || "Not provided"}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Address</p><p className="mt-1 text-sm text-foreground">{staff.address || "Not provided"}</p></div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <a href={`mailto:${staff.email}`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"><Mail className="size-4" /> Email</a>
                {staff.phone ? <a href={`tel:${staff.phone}`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"><Phone className="size-4" /> Call</a> : null}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Employment Details</h2>
              <div className="mt-4 space-y-4">
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Title</p><p className="mt-1 text-sm text-foreground">{staff.title || staff.roleLabel}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Employee ID</p><p className="mt-1 text-sm text-foreground">{staff.employeeId || "Not recorded"}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">License number</p><p className="mt-1 text-sm text-foreground">{staff.licenseNumber || "Not recorded"}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Emergency contact</p><p className="mt-1 text-sm text-foreground">{staff.emergencyContact || "Not recorded"}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Last updated</p><p className="mt-1 text-sm text-foreground">{formatDate(staff.updatedAt)}</p></div>
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Staff member not found.</div>
      )}
    </div>
  );
}
