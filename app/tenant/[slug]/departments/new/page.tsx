"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, CheckCircle2, Loader2 } from "lucide-react";
import { useTenantPath } from "@/hooks/useTenantPath";

type DepartmentForm = {
  name: string;
  description: string;
  category: string;
  level: "major" | "minor" | "support";
  status: "excellent" | "good" | "warning" | "critical";
  beds: string;
  budget: string;
  equipmentCount: string;
  lastMaintenance: string;
};

const INITIAL_FORM: DepartmentForm = {
  name: "",
  description: "",
  category: "Clinical",
  level: "minor",
  status: "good",
  beds: "0",
  budget: "0",
  equipmentCount: "0",
  lastMaintenance: "",
};

export default function NewDepartmentPage() {
  const params = useParams();
  const router = useRouter();
  const tenantPath = useTenantPath();
  const slug = String(params?.slug || "");
  const [form, setForm] = useState<DepartmentForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof DepartmentForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!form.name.trim()) {
      setError("Department name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/tenant/${slug}/departments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          beds: Number(form.beds || 0),
          budget: Number(form.budget || 0),
          equipmentCount: Number(form.equipmentCount || 0),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to create department");
      router.push(tenantPath(`/departments/${data.departmentId}`));
    } catch (submitError: any) {
      setError(submitError?.message || "Failed to create department");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Department Setup</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Add Department</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create a tenant department with staffing, bed, budget, and readiness metadata.</p>
        </div>
        <Link href={tenantPath("/departments")} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
          <ArrowLeft className="size-4" />
          Departments
        </Link>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <Building2 className="size-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Department Profile</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-foreground">Department name</span>
            <input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Emergency, ICU, Radiology" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-foreground">Description</span>
            <textarea value={form.description} onChange={(event) => update("description", event.target.value)} rows={4} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Category</span>
            <select value={form.category} onChange={(event) => update("category", event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option>Clinical</option>
              <option>Specialty</option>
              <option>Diagnostics</option>
              <option>Support</option>
              <option>Administration</option>
              <option>Operations</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Department level</span>
            <select value={form.level} onChange={(event) => update("level", event.target.value as DepartmentForm["level"])} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="major">Major</option>
              <option value="minor">Minor</option>
              <option value="support">Support</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Status</span>
            <select value={form.status} onChange={(event) => update("status", event.target.value as DepartmentForm["status"])} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Beds</span>
            <input type="number" min="0" value={form.beds} onChange={(event) => update("beds", event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Monthly budget</span>
            <input type="number" min="0" value={form.budget} onChange={(event) => update("budget", event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Equipment count</span>
            <input type="number" min="0" value={form.equipmentCount} onChange={(event) => update("equipmentCount", event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-foreground">Last maintenance</span>
            <input type="date" value={form.lastMaintenance} onChange={(event) => update("lastMaintenance", event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
        </div>

        <div className="mt-6 flex justify-end border-t border-border pt-5">
          <button onClick={submit} disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Create Department
          </button>
        </div>
      </div>
    </div>
  );
}
