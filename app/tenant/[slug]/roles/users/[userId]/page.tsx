"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Key, Loader2, Mail, Phone, RefreshCw, ShieldCheck, UserCheck, UserX, Users } from "lucide-react";
import { useTenantPath } from "@/hooks/useTenantPath";

type Permission = { id: string; key: string; resource: string; action: string; description?: string };
type RoleDetail = { id: string; name: string; label: string; description: string; permissions: Permission[]; isSystem: boolean };
type AccessUserDetail = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  roleLabel: string;
  roles: string[];
  department?: string;
  isActive: boolean;
  forcePasswordChange: boolean;
  lastActive: string;
  createdAt: string;
  updatedAt: string;
  roleDetails: RoleDetail[];
  permissions: Permission[];
};

export default function UserAccessDetailPage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const userId = String(params?.userId || "");
  const tenantPath = useTenantPath();
  const [user, setUser] = useState<AccessUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUser = async (initial = false) => {
    if (!slug || !userId) return;
    if (initial) setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch(`/api/tenant/${slug}/roles/users/${userId}`, { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to load user access details");
      setUser(data.user || null);
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load user access details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadUser(true);
  }, [slug, userId]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;

  if (!user) {
    return (
      <div className="space-y-4">
        <Link href={tenantPath("/roles")} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"><ArrowLeft className="size-4" /> Roles & Permissions</Link>
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">{error || "User not found."}</div>
      </div>
    );
  }

  const resources = Array.from(new Set(user.permissions.map((permission) => permission.resource))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={tenantPath("/roles")} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Roles & Permissions</Link>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">User Access Detail</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">{user.fullName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <button onClick={() => loadUser()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"><RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh</button>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Primary Role" value={user.roleLabel} subtitle={user.department || "No department"} icon={<ShieldCheck className="size-5" />} />
        <Metric title="Access Status" value={user.isActive ? "Active" : "Inactive"} subtitle={user.isActive ? "Can access dashboards" : "Access blocked"} icon={user.isActive ? <UserCheck className="size-5" /> : <UserX className="size-5" />} />
        <Metric title="Permissions" value={user.permissions.length} subtitle={`${resources.length} protected resources`} icon={<Key className="size-5" />} />
        <Metric title="Roles" value={user.roleDetails.length} subtitle="Assigned tenant roles" icon={<Users className="size-5" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Identity & State</h2>
          <div className="mt-4 space-y-4">
            <Info label="Full name" value={user.fullName} />
            <Info label="Email" value={user.email} />
            <Info label="Phone" value={user.phone || "Not provided"} />
            <Info label="Department" value={user.department || "Not assigned"} />
            <Info label="Password policy" value={user.forcePasswordChange ? "Must change password" : "Current"} />
            <Info label="Created" value={formatDate(user.createdAt)} />
            <Info label="Last updated" value={formatDate(user.updatedAt)} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={`mailto:${user.email}`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"><Mail className="size-4" /> Email</a>
            {user.phone ? <a href={`tel:${user.phone}`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"><Phone className="size-4" /> Call</a> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Assigned Roles</h2>
          <div className="mt-4 space-y-3">
            {user.roleDetails.length ? user.roleDetails.map((role) => (
              <div key={role.id} className="rounded-xl border border-border bg-background/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-semibold text-foreground">{role.label}</p><p className="mt-1 text-sm text-muted-foreground">{role.description}</p></div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{role.isSystem ? "System" : "Custom"}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">{role.permissions.slice(0, 10).map((permission) => <span key={permission.id} className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{permission.key}</span>)}{role.permissions.length > 10 ? <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">+{role.permissions.length - 10} more</span> : null}</div>
              </div>
            )) : <div className="rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">No tenant roles assigned.</div>}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Effective Permissions</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {user.permissions.map((permission) => (
            <div key={`${permission.id}-${permission.key}`} className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-sm font-semibold text-foreground">{permission.key}</p>
              <p className="mt-1 text-xs text-muted-foreground">{permission.description || `${permission.action} ${permission.resource}`}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value, subtitle, icon }: { title: string; value: string | number; subtitle: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p><p className="text-2xl font-semibold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{subtitle}</p></div></div></div>;
}

function Info({ label, value }: { label: string; value: string | number }) {
  return <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm text-foreground">{value}</p></div>;
}

function formatDate(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}
