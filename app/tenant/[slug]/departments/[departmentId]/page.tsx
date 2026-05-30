"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Activity, ArrowLeft, Bed, Building2, Loader2, RefreshCw, Settings, Users, Wrench } from "lucide-react";
import { useTenantPath } from "@/hooks/useTenantPath";

type Department = {
  id: string;
  name: string;
  description: string;
  category: string;
  level: string;
  headOfDepartment: string;
  totalStaff: number;
  activeStaff: number;
  beds: number;
  occupiedBeds: number;
  patients: number;
  utilization: number;
  status: string;
  budget: number;
  equipmentCount: number;
  lastMaintenance: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function DepartmentDetailsPage() {
  const params = useParams();
  const tenantPath = useTenantPath();
  const slug = String(params?.slug || "");
  const departmentId = String(params?.departmentId || "");
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartment = async (initial = false) => {
    if (!slug || !departmentId) return;
    if (initial) setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch(`/api/tenant/${slug}/departments/${departmentId}`, { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to fetch department");
      setDepartment(data.department || null);
    } catch (fetchError: any) {
      setError(fetchError?.message || "Failed to fetch department");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDepartment(true);
  }, [slug, departmentId]);

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  }

  if (!department) {
    return (
      <div className="space-y-4">
        <Link href={tenantPath("/departments")} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"><ArrowLeft className="size-4" /> Departments</Link>
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">{error || "Department not found."}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={tenantPath("/departments")} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Departments</Link>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{department.category} / {department.level}</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">{department.name}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{department.description}</p>
        </div>
        <button onClick={() => fetchDepartment()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60">
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Active Staff" value={`${department.activeStaff}/${department.totalStaff}`} subtitle="Assigned staff coverage" icon={<Users className="size-5" />} />
        <Metric title="Beds" value={`${department.occupiedBeds}/${department.beds}`} subtitle={`${department.utilization}% utilization`} icon={<Bed className="size-5" />} />
        <Metric title="Equipment" value={department.equipmentCount.toLocaleString()} subtitle="Tracked equipment count" icon={<Wrench className="size-5" />} />
        <Metric title="Patients" value={department.patients.toLocaleString()} subtitle="Linked patient activity" icon={<Activity className="size-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Operational Profile</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="Head of department" value={department.headOfDepartment} />
            <Info label="Status" value={department.status.toUpperCase()} />
            <Info label="Monthly budget" value={`$${department.budget.toLocaleString()}`} />
            <Info label="Last maintenance" value={department.lastMaintenance || "Not recorded"} />
            <Info label="Created" value={department.createdAt ? new Date(department.createdAt).toLocaleDateString() : "Not recorded"} />
            <Info label="Last updated" value={department.updatedAt ? new Date(department.updatedAt).toLocaleDateString() : "Not recorded"} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Settings className="size-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Admin Actions</h2>
          </div>
          <div className="space-y-3">
            <Link href={tenantPath("/staff-management/new")} className="block rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-muted">Assign new staff member</Link>
            <Link href={tenantPath("/staff-management")} className="block rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-muted">Review staff allocation</Link>
            <Link href={tenantPath("/departments")} className="block rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-muted">Return to department grid</Link>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-2 flex justify-between text-sm"><span className="font-medium text-foreground">Bed utilization</span><span className="text-muted-foreground">{department.utilization}%</span></div>
        <div className="h-3 rounded-full bg-muted"><div className={`h-3 rounded-full ${department.utilization >= 90 ? "bg-red-500" : department.utilization >= 75 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min(100, department.utilization)}%` }} /></div>
      </div>
    </div>
  );
}

function Metric({ title, value, subtitle, icon }: { title: string; value: string | number; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-border bg-background/70 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium text-foreground">{value}</p></div>;
}
