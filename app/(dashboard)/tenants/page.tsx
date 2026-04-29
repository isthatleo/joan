"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PageHeader,
  StatCard,
  SectionCard,
  StatusPill,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  Plus,
  Search,
  Hospital,
  Building2,
  CheckCircle,
  XCircle,
  DollarSign,
  Loader2,
  Check,
  Copy,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  contactEmail?: string;
  createdAt?: string;
};

type ProvisioningRun = {
  id: string;
  status: "running" | "completed" | "failed";
  stage?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
};

const DEFAULT_MODULES = [
  "Appointments",
  "Pharmacy",
  "Laboratory",
  "Billing",
  "Inpatient",
  "Emergency",
  "Telemedicine",
];

const DEFAULT_DEPTS = [
  "Reception",
  "General Medicine",
  "Pharmacy",
  "Laboratory",
  "Emergency",
];

type FormState = {
  name: string;
  plan: "Basic" | "Standard" | "Premium";
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  logoUrl: string;
  adminEmail: string;
  adminFullName: string;
  adminPhone: string;
  seedDepartments: string[];
  modules: string[];
};

const initialForm: FormState = {
  name: "",
  plan: "Standard",
  contactEmail: "",
  contactPhone: "",
  address: "",
  city: "",
  country: "",
  timezone: "UTC",
  logoUrl: "",
  adminEmail: "",
  adminFullName: "",
  adminPhone: "",
  seedDepartments: DEFAULT_DEPTS,
  modules: ["Appointments", "Pharmacy", "Laboratory", "Billing"],
};

const STEPS = [
  "Hospital Identity",
  "Contact Details",
  "Address & Timezone",
  "Branding",
  "Hospital Admin",
  "Departments",
  "Modules",
  "Review & Provision",
];

const PROVISION_STAGES = [
  { key: "validate", label: "Validating configuration" },
  { key: "slug", label: "Generating unique slug" },
  { key: "hospital", label: "Creating hospital record" },
  { key: "admin", label: "Assigning hospital admin" },
  { key: "role", label: "Configuring role & permissions" },
  { key: "departments", label: "Seeding departments & data" },
  { key: "modules", label: "Activating modules" },
  { key: "audit", label: "Writing audit log & finalizing" },
];

export default function TenantsPage() {
  // list state
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  // recent provisions state
  const [recentRuns, setRecentRuns] = useState<ProvisioningRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);

  // wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [stepError, setStepError] = useState<string | null>(null);

  // provisioning state
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [stageStatus, setStageStatus] = useState<Record<string, "pending" | "running" | "done">>({});
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [stageDetails, setStageDetails] = useState<Record<string, any>>({});
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    tenant: Tenant;
    admin: { email: string; fullName: string; tempPassword: string };
  } | null>(null);
  const [copied, setCopied] = useState(false);
   const [passwordRevealed, setPasswordRevealed] = useState(false);
   const [passwordVisible, setPasswordVisible] = useState(false);

  const fetchTenants = async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (planFilter) params.set("plan", planFilter);
    if (statusFilter) params.set("status", statusFilter);
    setLoading(true);
    try {
      const r = await fetch(`/api/tenants?${params.toString()}`);
      const d = await r.json();
      setTenants(Array.isArray(d) ? d : []);
    } catch {
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentRuns = async () => {
    setRunsLoading(true);
    try {
      const r = await fetch(`/api/provisioning-runs`);
      const d = await r.json();
      setRecentRuns(Array.isArray(d) ? d : []);
    } catch {
      setRecentRuns([]);
    } finally {
      setRunsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchRecentRuns();
  }, [search, planFilter, statusFilter]);

  const filtered = useMemo(() => tenants, [tenants]);

  const total = tenants.length;
  const active = tenants.filter((t) => t.isActive).length;
  const inactive = total - active;
  const premium = tenants.filter((t) => t.plan === "Premium").length;

  // ---- Wizard helpers ----
  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleIn = (key: "seedDepartments" | "modules", v: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v],
    }));

  const validateStep = (): string | null => {
    switch (step) {
      case 0:
        if (!form.name.trim() || form.name.trim().length < 2)
          return "Hospital name is required (min 2 chars).";
        if (!form.plan) return "Pick a subscription plan.";
        return null;
      case 1:
        if (!form.contactEmail.trim()) return "Contact email is required.";
        if (!/^\S+@\S+\.\S+$/.test(form.contactEmail))
          return "Enter a valid contact email.";
        return null;
      case 2:
        if (!form.timezone.trim()) return "Timezone is required.";
        return null;
      case 3:
        if (form.logoUrl && !/^https?:\/\//.test(form.logoUrl))
          return "Logo URL must start with http(s)://";
        return null;
      case 4:
        if (!form.adminEmail.trim()) return "Admin email is required.";
        if (!/^\S+@\S+\.\S+$/.test(form.adminEmail))
          return "Enter a valid admin email.";
        if (!form.adminFullName.trim() || form.adminFullName.trim().length < 2)
          return "Admin full name is required.";
        return null;
      case 5:
        if (form.seedDepartments.length === 0)
          return "Select at least one department to seed.";
        return null;
      case 6:
        if (form.modules.length === 0) return "Pick at least one module.";
        return null;
      default:
        return null;
    }
  };

  const currentStepError = useMemo(() => validateStep(), [step, form]);

  // Update step error when validation changes
  useEffect(() => {
    setStepError(currentStepError);
  }, [currentStepError]);

  const next = () => {
    const err = validateStep();
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const prev = () => {
    setStepError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const resetWizard = () => {
    setForm(initialForm);
    setStep(0);
    setStepError(null);
  };

  // ---- Provision ----
  const runProvision = async () => {
    const err = validateStep();
    if (err) {
      setStepError(err);
      return;
    }
    setWizardOpen(false);
    setProvisionOpen(true);
    setProvisionError(null);
    setResult(null);
    setActiveStage(null);
    setStageDetails({});
    setStageStatus(
      Object.fromEntries(PROVISION_STAGES.map((s) => [s.key, "pending"])) as Record<
        string,
        "pending" | "running" | "done"
      >
    );

    try {
      const res = await fetch("/api/tenants/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(form),
      });
      if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      // Parse SSE events: "event: X\ndata: {...}\n\n"
      const handleEvent = (evt: string, payload: any) => {
        if (evt === "stage") {
          const { key, status, ...rest } = payload;
          setStageStatus((prev) => ({
            ...prev,
            [key]: status === "done" ? "done" : "running",
          }));
          setActiveStage(status === "done" ? null : key);
          if (Object.keys(rest).length > 0) {
            setStageDetails((d) => ({ ...d, [key]: { ...(d[key] || {}), ...rest } }));
          }
        } else if (evt === "done") {
          setStageStatus((prev) => {
            const copy = { ...prev };
            for (const s of PROVISION_STAGES) copy[s.key] = "done";
            return copy;
          });
          setActiveStage(null);
          setResult({ tenant: payload.tenant, admin: payload.admin });
          fetchTenants();
        } else if (evt === "error") {
          setProvisionError(payload?.error || "Provisioning failed");
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const lines = chunk.split("\n");
          let evt = "message";
          let dataStr = "";
          for (const ln of lines) {
            if (ln.startsWith("event:")) evt = ln.slice(6).trim();
            else if (ln.startsWith("data:")) dataStr += ln.slice(5).trim();
          }
          if (!dataStr) continue;
          try {
            handleEvent(evt, JSON.parse(dataStr));
          } catch {
            // ignore parse failures
          }
        }
      }
    } catch (e: any) {
      setProvisionError(e?.message || "Provisioning failed");
    }
  };

   const closeProvision = () => {
     setProvisionOpen(false);
     setResult(null);
     setProvisionError(null);
     setPasswordVisible(false);
     setPasswordRevealed(false);
     resetWizard();
   };

   const togglePasswordVisibility = () => {
     setPasswordVisible(!passwordVisible);
   };

   const copyPassword = async () => {
     if (!result) return;
     try {
       await navigator.clipboard.writeText(result.admin.tempPassword);
       setCopied(true);
       // Mark as revealed so it can't be copied again
       setPasswordRevealed(true);
       // Auto-hide after 3 seconds
       setTimeout(() => {
         setPasswordVisible(false);
         setPasswordRevealed(false);
         setCopied(false);
       }, 3000);
       // Log audit event for password copy
       await fetch("/api/audit", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           action: "password.copied",
           entity: "tenant",
           entityId: result.tenant.id,
           metadata: { adminEmail: result.admin.email },
         }),
       });
     } catch {
       // noop
     }
   };

  const retryProvision = async () => {
    setProvisionError(null);
    setResult(null);
    setActiveStage(null);
    setStageDetails({});
    setStageStatus(
      Object.fromEntries(PROVISION_STAGES.map((s) => [s.key, "pending"])) as Record<
        string,
        "pending" | "running" | "done"
      >
    );
    await runProvision();
  };

  return (
    <div>
      <PageHeader
        title="Tenant Management"
        subtitle="Manage all hospital tenants and provision new ones"
        actions={
          <Button
            onClick={() => {
              resetWizard();
              setWizardOpen(true);
            }}
            className="inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Tenant
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Tenants" value={total} subtitle="Across the platform" icon={Building2} tone="primary" />
        <StatCard title="Active" value={active} subtitle="Currently operational" icon={CheckCircle} tone="success" />
        <StatCard title="Inactive" value={inactive} subtitle="Suspended / paused" icon={XCircle} tone="destructive" />
        <StatCard title="Premium Tier" value={premium} subtitle="High-revenue accounts" icon={DollarSign} tone="info" />
      </div>

      {/* Recent Provisions */}
      <SectionCard title="Recent Provisions" description="Latest tenant provisioning attempts" className="mb-6">
        {runsLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading recent runs…</div>
        ) : recentRuns.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No provisioning runs yet.
          </div>
        ) : (
          <div className="space-y-2">
            {recentRuns.map((run) => (
              <div key={run.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <StatusPill
                    tone={
                      run.status === "completed"
                        ? "success"
                        : run.status === "failed"
                        ? "destructive"
                        : "info"
                    }
                  >
                    {run.status === "running" ? "Running" : run.status === "completed" ? "Success" : "Failed"}
                  </StatusPill>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {run.tenant?.name || "Unknown Tenant"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {run.tenant?.slug || "unknown-slug"} • {new Date(run.startedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {run.tenant && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/dashboard/tenants/${run.tenant.slug}`}>View</a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Search & Filter */}
      <SectionCard className="mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tenants..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Plans</option>
            <option value="Premium">Premium</option>
            <option value="Standard">Standard</option>
            <option value="Basic">Basic</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </SectionCard>

      {/* Table */}
      <SectionCard title="All Tenants" description={`${filtered.length} result${filtered.length === 1 ? "" : "s"}`} flush>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading tenants…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No tenants yet. Click <span className="font-semibold text-foreground">New Tenant</span> to provision one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Hospital</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((h) => (
                  <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                          <Hospital className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{h.name}</p>
                          <p className="text-xs text-muted-foreground">{h.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-md bg-info-soft px-2 py-1 text-xs font-medium text-info-soft-foreground">
                        {h.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{h.contactEmail || "—"}</td>
                    <td className="px-6 py-4">
                      <StatusPill tone={h.isActive ? "success" : "destructive"}>
                        {h.isActive ? "Active" : "Inactive"}
                      </StatusPill>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ---- WIZARD DIALOG ---- */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Provision New Tenant — Step {step + 1} of {STEPS.length}
            </DialogTitle>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center gap-1 mb-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-sm font-medium text-foreground">{STEPS[step]}</p>

          <div className="mt-4 space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {step === 0 && (
              <>
                <div>
                  <Label>Hospital Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="e.g. Nairobi Women's Hospital"
                  />
                </div>
                <div>
                  <Label>Subscription Plan</Label>
                  <Select value={form.plan} onValueChange={(v: any) => update("plan", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Basic">Basic</SelectItem>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <Label>Hospital Contact Email</Label>
                  <Input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => update("contactEmail", e.target.value)}
                    placeholder="info@hospital.com"
                  />
                </div>
                <div>
                  <Label>Hospital Contact Phone</Label>
                  <Input
                    value={form.contactPhone}
                    onChange={(e) => update("contactPhone", e.target.value)}
                    placeholder="+254 700 000000"
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <Label>Street Address</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="Street, building"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>City</Label>
                    <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input value={form.country} onChange={(e) => update("country", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Input
                    value={form.timezone}
                    onChange={(e) => update("timezone", e.target.value)}
                    placeholder="UTC"
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <div>
                <Label>Logo URL (optional)</Label>
                <Input
                  value={form.logoUrl}
                  onChange={(e) => update("logoUrl", e.target.value)}
                  placeholder="https://…/logo.png"
                />
                {form.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.logoUrl}
                    alt="Logo preview"
                    className="mt-3 h-16 rounded border border-border"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                )}
              </div>
            )}

            {step === 4 && (
              <>
                <div>
                  <Label>Admin Full Name</Label>
                  <Input
                    value={form.adminFullName}
                    onChange={(e) => update("adminFullName", e.target.value)}
                    placeholder="Dr. Jane Doe"
                  />
                </div>
                <div>
                  <Label>Admin Email</Label>
                  <Input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => update("adminEmail", e.target.value)}
                    placeholder="admin@hospital.com"
                  />
                </div>
                <div>
                  <Label>Admin Phone (optional)</Label>
                  <Input
                    value={form.adminPhone}
                    onChange={(e) => update("adminPhone", e.target.value)}
                    placeholder="+254 700 000000"
                  />
                </div>
                <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  A temporary password will be generated and shown once at the end. The admin will be asked to reset it on first sign-in.
                </div>
              </>
            )}

            {step === 5 && (
              <div>
                <Label className="mb-2 block">Seed Departments</Label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_DEPTS.concat(["Radiology", "Cardiology", "Pediatrics", "Maternity"]).map(
                    (d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleIn("seedDepartments", d)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          form.seedDepartments.includes(d)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        {d}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {step === 6 && (
              <div>
                <Label className="mb-2 block">Activate Modules</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_MODULES.map((m) => (
                    <label
                      key={m}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                        form.modules.includes(m)
                          ? "border-primary bg-primary-soft text-primary-soft-foreground"
                          : "border-border bg-background hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.modules.includes(m)}
                        onChange={() => toggleIn("modules", m)}
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-3">
                <ReviewRow k="Name" v={form.name} />
                <ReviewRow k="Plan" v={form.plan} />
                <ReviewRow k="Contact" v={`${form.contactEmail} · ${form.contactPhone || "—"}`} />
                <ReviewRow
                  k="Address"
                  v={[form.address, form.city, form.country].filter(Boolean).join(", ") || "—"}
                />
                <ReviewRow k="Timezone" v={form.timezone} />
                <ReviewRow k="Admin" v={`${form.adminFullName} <${form.adminEmail}>`} />
                <ReviewRow k="Departments" v={form.seedDepartments.join(", ") || "—"} />
                <ReviewRow k="Modules" v={form.modules.join(", ") || "—"} />
              </div>
            )}
          </div>

          {stepError && (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive-soft px-3 py-2 text-xs text-destructive-soft-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              {stepError}
            </div>
          )}

          <DialogFooter className="mt-4 flex items-center justify-between gap-2">
            <Button variant="outline" onClick={prev} disabled={step === 0} className="inline-flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next} disabled={!!currentStepError} className="inline-flex items-center gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={runProvision} disabled={!!currentStepError}>Provision Tenant</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- PROVISION LOADING DIALOG ---- */}
      <Dialog open={provisionOpen} onOpenChange={(o) => !o && result && closeProvision()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {result
                ? "Tenant provisioned"
                : provisionError
                ? "Provisioning failed"
                : "Provisioning tenant…"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {PROVISION_STAGES.map((s, i) => {
              const status = stageStatus[s.key] ?? "pending";
              const done = status === "done";
              const active = status === "running" || activeStage === s.key;
              const detail = stageDetails[s.key];
              return (
                <div
                  key={s.key}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    done
                      ? "border-success/40 bg-success-soft"
                      : active
                      ? "border-primary/40 bg-primary-soft"
                      : "border-border bg-background"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                      done
                        ? "bg-success text-success-foreground"
                        : active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="text-xs font-semibold">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm ${
                        done
                          ? "text-success-soft-foreground font-medium"
                          : active
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </div>
                    {detail?.slug && (
                      <div className="text-[11px] font-mono text-muted-foreground truncate">
                        {detail.slug}
                      </div>
                    )}
                    {typeof detail?.count === "number" && (
                      <div className="text-[11px] text-muted-foreground">
                        {detail.count} item{detail.count === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {provisionError && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive-soft px-3 py-2 text-xs text-destructive-soft-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <span>{provisionError}</span>
            </div>
          )}

          {result && (
            <div className="mt-4 space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm font-semibold text-foreground">
                {result.tenant.name} is live
              </p>
              <div className="text-xs text-muted-foreground">
                Slug: <span className="font-mono text-foreground">{result.tenant.slug}</span>
              </div>
              <div className="rounded-md border border-warning/40 bg-warning-soft p-3">
                <p className="text-xs font-semibold text-warning-soft-foreground">
                  Temporary password — shown only once
                </p>
                <p className="mt-1 text-xs text-warning-soft-foreground">
                  Share this with {result.admin.fullName} ({result.admin.email}). They must reset it on first sign-in.
                </p>
               <div className="mt-2 flex items-center gap-2">
                   <code className="flex-1 rounded bg-background px-2 py-1.5 text-sm font-mono text-foreground border border-border">
                     {passwordVisible ? result.admin.tempPassword : "••••••••••••••••"}
                   </code>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={togglePasswordVisibility}
                     disabled={passwordRevealed}
                     className="inline-flex items-center gap-1"
                   >
                     {passwordVisible ? "Hide" : "Reveal"}
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={copyPassword}
                     disabled={passwordRevealed}
                     className="inline-flex items-center gap-1"
                   >
                     {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                     {copied ? "Copied" : "Copy"}
                   </Button>
                 </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            {provisionError && (
              <Button variant="outline" onClick={retryProvision} className="inline-flex items-center gap-1">
                <Loader2 className="h-4 w-4" />
                Retry Provisioning
              </Button>
            )}
            {(result || provisionError) && (
              <Button onClick={closeProvision}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border px-3 py-2 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right text-foreground font-medium break-all">{v}</span>
    </div>
  );
}
