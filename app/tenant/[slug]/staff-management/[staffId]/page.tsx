"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Badge, CalendarDays, KeyRound, Loader2, Mail, MapPin, Phone, Shield, UserCheck, UserX, Users } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { useTenantPath } from "@/hooks/useTenantPath";

type StaffMember = {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  avatar?: string | null;
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
          {staff ? <Link href={tenantPath(`/staff-management/id-cards?staffId=${staff.id}`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"><Badge className="size-4" /> ID Card</Link> : null}
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Employee Number</p>
              <p className="mt-2 font-mono text-xl font-black text-foreground">{staff.employeeId || "Not generated"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Pulled from staff profile settings.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Contact Readiness</p>
              <p className="mt-2 text-xl font-black text-foreground">{[staff.email, staff.phone, staff.address].filter(Boolean).length}/3</p>
              <p className="mt-1 text-xs text-muted-foreground">Email, phone, and address completeness.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Credential Gate</p>
              <p className="mt-2 text-xl font-black text-foreground">{staff.forcePasswordChange ? "Onboarding" : "Cleared"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{staff.forcePasswordChange ? "Must set a permanent password." : "Password policy satisfied."}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Clinical License</p>
              <p className="mt-2 font-mono text-xl font-black text-foreground">{staff.licenseNumber || "Not recorded"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Real staff employment metadata.</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.72fr_1.15fr]">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                {staff.avatar ? (
                  <img src={staff.avatar} alt={`${staff.fullName} avatar`} className="size-28 rounded-2xl border border-border object-cover shadow-sm" />
                ) : (
                  <div className="flex size-28 items-center justify-center rounded-2xl border border-border bg-muted text-3xl font-bold text-muted-foreground">
                    {staff.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "ST"}
                  </div>
                )}
                <h2 className="mt-4 text-xl font-semibold text-foreground">{staff.fullName}</h2>
                <p className="text-sm text-muted-foreground">{staff.title || staff.roleLabel}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${staff.isActive ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300" : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"}`}>{staff.isActive ? "Active account" : "Inactive account"}</span>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">{staff.roleLabel}</span>
                </div>
              </div>
              <div className="mt-6 grid gap-3 text-sm">
                <div className="rounded-xl border border-border bg-background p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Employee ID</p><p className="mt-1 font-mono font-semibold">{staff.employeeId || "Not recorded"}</p></div>
                <div className="rounded-xl border border-border bg-background p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Department</p><p className="mt-1 font-semibold">{staff.department || "General"}</p></div>
                <div className="rounded-xl border border-border bg-background p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Start date</p><p className="mt-1 font-semibold">{formatDate(staff.startDate).split(",")[0]}</p></div>
              </div>
            </section>

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
                {staff.address ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(staff.address)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"><MapPin className="size-4" /> Map</a> : null}
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
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

            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Access & Audit Snapshot</h2>
              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm">
                  <span className="inline-flex items-center gap-2 text-muted-foreground"><Shield className="size-4" /> Assigned roles</span>
                  <span className="font-semibold">{staff.roles?.length || 1}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm">
                  <span className="inline-flex items-center gap-2 text-muted-foreground"><KeyRound className="size-4" /> Password change</span>
                  <span className="font-semibold">{staff.forcePasswordChange ? "Required" : "Not required"}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm">
                  <span className="inline-flex items-center gap-2 text-muted-foreground"><CalendarDays className="size-4" /> Created</span>
                  <span className="font-semibold">{formatDate(staff.createdAt)}</span>
                </div>
              </div>
              <div className="mt-5">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Role assignments</p>
                <div className="flex flex-wrap gap-2">
                  {(staff.roles?.length ? staff.roles : [staff.role]).map((role, index) => (
                    <span key={`${role}-${index}`} className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold capitalize">{role.replace(/_/g, " ")}</span>
                  ))}
                </div>
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
