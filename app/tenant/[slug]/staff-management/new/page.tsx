"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clipboard, Loader2, ShieldCheck, UserCog, UserPlus } from "lucide-react";
import { isValidPhoneNumber } from "react-phone-number-input";
import { PhoneNumberInput } from "@/components/forms/PhoneNumberInput";
import { useTenantPath } from "@/hooks/useTenantPath";

const ROLES = [
  { value: "doctor", label: "Doctor", description: "Clinical consultations, patient records, prescriptions, lab orders." },
  { value: "nurse", label: "Nurse", description: "Vitals, care plans, nursing tasks, bedside care." },
  { value: "lab_technician", label: "Lab Technician", description: "Lab orders, results, inventory, quality control." },
  { value: "pharmacist", label: "Pharmacist", description: "Prescriptions, dispensing, pharmacy inventory." },
  { value: "accountant", label: "Accountant", description: "Billing, invoices, payments, financial reports." },
  { value: "receptionist", label: "Receptionist", description: "Appointments, check-in, queue, front desk operations." },
  { value: "hospital_admin", label: "Hospital Admin", description: "Administrative dashboard and tenant management." },
];

type StaffForm = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  departmentId: string;
  department: string;
  title: string;
  employeeId: string;
  licenseNumber: string;
  startDate: string;
  emergencyContact: string;
};

type EmployeeIdSettings = {
  enabled: boolean;
  prefix: string;
  separator: string;
  includeYear: boolean;
  padding: number;
  nextNumber: number;
  customPatternEnabled: boolean;
  customPattern: string;
};

const DEFAULT_EMPLOYEE_ID_SETTINGS: EmployeeIdSettings = {
  enabled: true,
  prefix: "EMP",
  separator: "-",
  includeYear: true,
  padding: 4,
  nextNumber: 1,
  customPatternEnabled: false,
  customPattern: "EMP-{YYYY}-{SEQ}",
};

const INITIAL_FORM: StaffForm = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  role: "doctor",
  departmentId: "",
  department: "",
  title: "",
  employeeId: "",
  licenseNumber: "",
  startDate: "",
  emergencyContact: "",
};

function validateStep(step: number, form: StaffForm) {
  if (step === 0) {
    if (!form.fullName.trim()) return "Full name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "A valid email address is required.";
    if (form.phone && !isValidPhoneNumber(form.phone)) return "Enter a valid staff phone number.";
  }
  if (step === 1) {
    if (!form.role) return "Role is required.";
    if (!form.department.trim()) return "Department is required.";
    if (!form.title.trim()) return "Job title is required.";
    if (form.emergencyContact && !isValidPhoneNumber(form.emergencyContact)) return "Enter a valid emergency contact phone number.";
  }
  return null;
}

type DepartmentOption = {
  id: string;
  name: string;
  category?: string;
  level?: string;
};

function normalizeEmployeeIdSettings(value?: Partial<EmployeeIdSettings>): EmployeeIdSettings {
  const raw = value || {};
  return {
    ...DEFAULT_EMPLOYEE_ID_SETTINGS,
    ...raw,
    prefix: String(raw.prefix || DEFAULT_EMPLOYEE_ID_SETTINGS.prefix).toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 16).replace(/^-+|-+$/g, "") || DEFAULT_EMPLOYEE_ID_SETTINGS.prefix,
    separator: ["-", "/", "."].includes(String(raw.separator)) ? String(raw.separator) : DEFAULT_EMPLOYEE_ID_SETTINGS.separator,
    padding: Math.min(8, Math.max(2, Number(raw.padding || DEFAULT_EMPLOYEE_ID_SETTINGS.padding))),
    nextNumber: Math.max(1, Number(raw.nextNumber || DEFAULT_EMPLOYEE_ID_SETTINGS.nextNumber)),
    customPattern: String(raw.customPattern || DEFAULT_EMPLOYEE_ID_SETTINGS.customPattern).toUpperCase().replace(/[^A-Z0-9{}:_-]/g, "").slice(0, 80) || DEFAULT_EMPLOYEE_ID_SETTINGS.customPattern,
  };
}

function previewEmployeeId(settings: EmployeeIdSettings) {
  const sequence = String(settings.nextNumber).padStart(settings.padding, "0");
  if (settings.customPatternEnabled && settings.customPattern) {
    return settings.customPattern
      .replace(/\{YYYY\}/g, String(new Date().getFullYear()))
      .replace(/\{YY\}/g, String(new Date().getFullYear()).slice(-2))
      .replace(/\{SEQ\}/g, sequence)
      .replace(/\{RAND(\d+)\}/g, (_, size) => "9".repeat(Math.min(12, Math.max(1, Number(size || 4)))))
      .replace(/\{ALPHA(\d+)\}/g, (_, size) => "A".repeat(Math.min(12, Math.max(1, Number(size || 2)))))
      .replace(/\{PREFIX\}/g, settings.prefix);
  }
  return [settings.prefix, settings.includeYear ? new Date().getFullYear() : null, sequence].filter(Boolean).join(settings.separator);
}

export default function NewStaffMemberPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params?.slug || "");
  const tenantPath = useTenantPath();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<StaffForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [employeeIdSettings, setEmployeeIdSettings] = useState<EmployeeIdSettings>(DEFAULT_EMPLOYEE_ID_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ temporaryPassword: string; loginUrl: string; employeeId?: string } | null>(null);

  const update = (key: keyof StaffForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    let cancelled = false;
    const loadDepartments = async () => {
      if (!slug) return;
      setDepartmentsLoading(true);
      try {
        const response = await fetch(`/api/tenant/${slug}/departments`, { credentials: "include", cache: "no-store" });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Failed to load departments");
        if (!cancelled) setDepartments(Array.isArray(data?.departments) ? data.departments : []);
      } catch {
        if (!cancelled) setDepartments([]);
      } finally {
        if (!cancelled) setDepartmentsLoading(false);
      }
    };
    loadDepartments();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    const loadEmployeeIdSettings = async () => {
      if (!slug) return;
      try {
        const response = await fetch(`/api/tenants/${slug}/settings`, { credentials: "include" });
        const data = await response.json().catch(() => null);
        if (!response.ok) return;
        if (!cancelled) setEmployeeIdSettings(normalizeEmployeeIdSettings(data?.branding?.employeeIds));
      } catch {
        if (!cancelled) setEmployeeIdSettings(DEFAULT_EMPLOYEE_ID_SETTINGS);
      }
    };
    loadEmployeeIdSettings();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const selectDepartment = (departmentId: string) => {
    const department = departments.find((item) => item.id === departmentId);
    setForm((current) => ({ ...current, departmentId, department: department?.name || "" }));
  };

  const next = () => {
    const validationError = validateStep(step, form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((current) => Math.min(2, current + 1));
  };

  const submit = async () => {
    const validationError = validateStep(0, form) || validateStep(1, form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/tenant/${slug}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to register staff member");
      setResult({ temporaryPassword: data.temporaryPassword, loginUrl: data.loginUrl, employeeId: data.employeeId });
      setStep(3);
    } catch (submitError: any) {
      setError(submitError?.message || "Failed to register staff member");
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredentials = async () => {
    if (!result) return;
    await navigator.clipboard.writeText([
      `Login URL: ${result.loginUrl}`,
      `Email: ${form.email}`,
      `Employee ID: ${result.employeeId || form.employeeId || "Not assigned"}`,
      `Temporary password: ${result.temporaryPassword}`,
      "The user must change this password immediately after login.",
    ].join("\n")).catch(() => null);
  };

  const finish = () => {
    router.push(tenantPath("/staff-management"));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Staff Registration</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Add Staff Member</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create dashboard access, assign a tenant role, and generate a forced-change temporary password.</p>
        </div>
        <Link href={tenantPath("/staff-management")} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">
          <ArrowLeft className="size-4" />
          Staff Management
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {["Identity", "Access", "Review", "Complete"].map((label, index) => (
          <div key={label} className={`rounded-xl border p-4 ${index <= step ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step {index + 1}</p>
            <p className="mt-1 font-semibold text-foreground">{label}</p>
          </div>
        ))}
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {step === 0 ? (
          <div className="space-y-5">
            <div className="flex items-center gap-2"><UserPlus className="size-5 text-primary" /><h2 className="text-lg font-semibold text-foreground">Staff Identity</h2></div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1"><span className="text-sm font-medium text-foreground">Full name</span><input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
              <label className="space-y-1"><span className="text-sm font-medium text-foreground">Email</span><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
              <label className="space-y-1"><span className="text-sm font-medium text-foreground">Phone</span><PhoneNumberInput value={form.phone} onChange={(value) => update("phone", value)} placeholder="Staff phone number" /></label>
              <label className="space-y-1"><span className="text-sm font-medium text-foreground">Address</span><input value={form.address} onChange={(e) => update("address", e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /><h2 className="text-lg font-semibold text-foreground">Role & Employment</h2></div>
            <div className="grid gap-3 md:grid-cols-2">
              {ROLES.map((role) => (
                <button key={role.value} type="button" onClick={() => update("role", role.value)} className={`rounded-xl border p-4 text-left transition-colors ${form.role === role.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}>
                  <p className="font-semibold text-foreground">{role.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{role.description}</p>
                </button>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium text-foreground">Department</span>
                <select value={form.departmentId} onChange={(e) => selectDepartment(e.target.value)} disabled={departmentsLoading} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-60">
                  <option value="">{departmentsLoading ? "Loading departments..." : "Select a department"}</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}{department.category ? ` (${department.category})` : ""}</option>
                  ))}
                </select>
                {!departmentsLoading && departments.length === 0 ? <span className="text-xs text-amber-600">No departments found. Sync departments from the departments page first.</span> : null}
              </label>
              <label className="space-y-1"><span className="text-sm font-medium text-foreground">Job title</span><input value={form.title} onChange={(e) => update("title", e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
              <div className="space-y-1">
                <span className="text-sm font-medium text-foreground">Employee ID</span>
                {employeeIdSettings.enabled ? (
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Auto-generated on registration</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-foreground">{previewEmployeeId(employeeIdSettings)}</p>
                    <button
                      type="button"
                      onClick={() => update("employeeId", form.employeeId ? "" : previewEmployeeId(employeeIdSettings))}
                      className="mt-2 text-xs font-semibold text-primary hover:underline"
                    >
                      {form.employeeId ? "Use automatic ID instead" : "Override manually"}
                    </button>
                  </div>
                ) : null}
                {(!employeeIdSettings.enabled || form.employeeId) ? (
                  <input
                    value={form.employeeId}
                    onChange={(e) => update("employeeId", e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40))}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm"
                    placeholder="Manual employee ID"
                  />
                ) : null}
              </div>
              <label className="space-y-1"><span className="text-sm font-medium text-foreground">License number</span><input value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
              <label className="space-y-1"><span className="text-sm font-medium text-foreground">Start date</span><input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
              <label className="space-y-1"><span className="text-sm font-medium text-foreground">Emergency contact phone</span><PhoneNumberInput value={form.emergencyContact} onChange={(value) => update("emergencyContact", value)} placeholder="Emergency contact phone" /></label>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div className="flex items-center gap-2"><UserCog className="size-5 text-primary" /><h2 className="text-lg font-semibold text-foreground">Review Registration</h2></div>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries({
                "Full name": form.fullName,
                Email: form.email,
                Phone: form.phone || "Not provided",
                Role: ROLES.find((role) => role.value === form.role)?.label || form.role,
                Department: form.department,
                "Job title": form.title,
                "Employee ID": form.employeeId || (employeeIdSettings.enabled ? `Auto-generate next ID (${previewEmployeeId(employeeIdSettings)})` : "Not provided"),
                "License number": form.licenseNumber || "Not provided",
              }).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border bg-background/70 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium text-foreground">{value}</p></div>
              ))}
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">A temporary password will be generated. The staff member can log in to their assigned dashboard, but must immediately set a new password.</div>
          </div>
        ) : null}

        {step === 3 && result ? (
          <div className="space-y-5">
            <div className="flex items-center gap-2"><CheckCircle2 className="size-5 text-green-600" /><h2 className="text-lg font-semibold text-foreground">Staff Member Registered</h2></div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Login URL</p>
              <p className="mt-1 break-all font-mono text-sm text-foreground">{result.loginUrl}</p>
              <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Employee ID</p>
              <p className="mt-1 font-mono text-lg font-semibold text-foreground">{result.employeeId || form.employeeId || "Not assigned"}</p>
              <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Temporary password</p>
              <p className="mt-1 font-mono text-lg font-semibold text-foreground">{result.temporaryPassword}</p>
            </div>
            <button type="button" onClick={copyCredentials} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"><Clipboard className="size-4" /> Copy Credentials</button>
          </div>
        ) : null}

        <div className="mt-6 flex justify-between border-t border-border pt-5">
          <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || step === 3} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50">Back</button>
          {step < 2 ? <button type="button" onClick={next} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Continue</button> : null}
          {step === 2 ? <button type="button" onClick={submit} disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{submitting ? <Loader2 className="size-4 animate-spin" /> : null} Register Staff</button> : null}
          {step === 3 ? <button type="button" onClick={finish} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Return to Staff Management</button> : null}
        </div>
      </div>
    </div>
  );
}
