"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, Filter, Plus, Building2, Loader2, Check, Copy, AlertCircle,
  ChevronLeft, ChevronRight, X, RotateCw, ExternalLink, Clock, CheckCircle2, XCircle, Trash2,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { PhoneNumberInput } from "@/components/forms/PhoneNumberInput";

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
  stage: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  tenant: { id: string; name: string; slug: string } | null;
};

const orange = "#F97316";

const PLAN_CHIP: Record<string, string> = {
  Basic: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Standard: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  Premium: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
};

const STAGES = [
  { key: "validate", label: "Validating details" },
  { key: "slug", label: "Generating unique slug" },
  { key: "hospital", label: "Creating tenant record" },
  { key: "admin", label: "Provisioning hospital admin" },
  { key: "roles", label: "Seeding user roles" },
  { key: "departments", label: "Seeding departments" },
  { key: "modules", label: "Activating modules" },
  { key: "audit", label: "Recording audit log" },
];

const DEFAULT_DEPTS = ["Reception", "General Medicine", "Pharmacy", "Laboratory", "Emergency"];
const DEFAULT_MODULES = ["Appointments", "Pharmacy", "Laboratory", "Billing", "Inpatient", "Emergency", "Telemedicine"];

type StageState = {
  status: "pending" | "running" | "done" | "error";
  meta?: any;
  error?: string;
  details?: any;
  log?: string;
};

function emptyStageMap(): Record<string, StageState> {
  return Object.fromEntries(STAGES.map(s => [s.key, { status: "pending" }]));
}

function summarizeMeta(key: string, meta: any): string {
  if (!meta) return "";
  if (key === "slug" && meta.slug) return meta.slug;
  if (key === "hospital" && meta.slug) return `slug: ${meta.slug}`;
  if (key === "admin" && meta.adminEmail) return meta.adminEmail;
  if (key === "roles" && meta.roles) return `${meta.count} role${meta.count === 1 ? "" : "s"}`;
  if (key === "departments" && meta.departments) return `${meta.count} · ${(meta.departments as string[]).slice(0, 3).join(", ")}${meta.departments.length > 3 ? "…" : ""}`;
  if (key === "modules" && meta.modules) return `${meta.count} module${meta.count === 1 ? "" : "s"}`;
  return "";
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="flex-1 min-w-[200px] bg-card border border-border rounded-xl p-4 flex items-start gap-3 shadow-sm">
      <div className="size-10 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
        <Icon className="size-5" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ---- Client validation ----
function validateForm(form: any): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name || form.name.trim().length < 2) errors.name = "Hospital name must be at least 2 characters.";
  if (form.name && form.name.trim().length > 120) errors.name = "Hospital name is too long (max 120).";
  if (!form.contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) errors.contactEmail = "Enter a valid contact email.";
  if (!form.adminFullName || form.adminFullName.trim().length < 2) errors.adminFullName = "Admin full name is required.";
  if (!form.adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) errors.adminEmail = "Enter a valid admin email.";
  if (!form.plan) errors.plan = "Select a plan.";
  if (form.logoUrl && form.logoUrl.length > 0) {
    try { new URL(form.logoUrl); } catch { errors.logoUrl = "Logo URL is invalid."; }
  }
  return errors;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // recent provisions
  const [runs, setRuns] = useState<ProvisioningRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);

  // wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<any>({
    name: "", contactEmail: "", contactPhone: "",
    address: "", city: "", country: "", timezone: "UTC",
    logoUrl: "", plan: "Standard",
    adminEmail: "", adminFullName: "",
    departments: [...DEFAULT_DEPTS],
    modules: [...DEFAULT_MODULES],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [provisioning, setProvisioning] = useState(false);
  const [stageStatus, setStageStatus] = useState<Record<string, StageState>>(emptyStageMap());
  const [provisionResult, setProvisionResult] = useState<{ tenant: any; admin: any } | null>(null);
  const [provisionError, setProvisionError] = useState<{ stage?: string; error: string; details?: any } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleDeleteTenant = async (t: Tenant) => {
    const confirmText = prompt(
      `This will ARCHIVE "${t.name}" and hide it from default views.\n\nData will be preserved for 30 days, after which a super-admin may permanently purge it.\n\nThis action can be undone during the grace period.\n\nType the slug "${t.slug}" to confirm:`
    );
    if (confirmText !== t.slug) {
      if (confirmText !== null) alert("Slug did not match. Archive cancelled.");
      return;
    }
    setDeletingId(t.id);
    const prev = tenants;
    setTenants(curr => curr.filter(x => x.id !== t.id));
    try {
      const res = await fetch(`/api/tenants/${t.slug}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to archive tenant");
      }
      const data = await res.json();
      alert(`Tenant archived successfully. Hard purge available after ${new Date(data.scheduledPurgeAt).toLocaleDateString()}`);
    } catch (e: any) {
      console.error(e);
      alert(`Archive failed: ${e.message}`);
      setTenants(prev);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestoreTenant = async (t: Tenant) => {
    const confirmText = prompt(
      `This will RESTORE "${t.name}" and make it visible in the tenant list.\n\nType the slug "${t.slug}" to confirm:`
    );
    if (confirmText !== t.slug) {
      if (confirmText !== null) alert("Slug did not match. Restore cancelled.");
      return;
    }
    setRestoringId(t.id);
    const prev = tenants;
    setTenants(curr => curr.filter(x => x.id !== t.id));
    try {
      const res = await fetch(`/api/tenants/${t.slug}/restore`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to restore tenant");
      }
      alert(`Tenant restored successfully.`);
    } catch (e: any) {
      console.error(e);
      alert(`Restore failed: ${e.message}`);
      setTenants(prev);
    } finally {
      setRestoringId(null);
    }
  };

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (planFilter !== "all") params.set("plan", planFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/tenants?${params.toString()}`);
      const data = await res.json();
      setTenants(Array.isArray(data) ? data : data.tenants || []);
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    } finally { setLoading(false); }
  };

  const fetchRuns = async () => {
    setRunsLoading(true);
    try {
      const res = await fetch("/api/provisioning-runs?limit=6");
      const data = await res.json();
      setRuns(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch runs:", e);
    } finally { setRunsLoading(false); }
  };

  useEffect(() => { fetchTenants(); }, [debouncedSearch, planFilter, statusFilter]);
  useEffect(() => { fetchRuns(); }, []);

  const stats = useMemo(() => {
    const active = tenants.filter(t => t.isActive).length;
    return {
      total: tenants.length,
      active,
      premium: tenants.filter(t => t.plan === "Premium").length,
      newThisMonth: tenants.filter(t => t.createdAt && (Date.now() - new Date(t.createdAt).getTime()) / 86400000 < 30).length,
    };
  }, [tenants]);

  const openWizard = () => {
    setForm({
      name: "", contactEmail: "", contactPhone: "",
      address: "", city: "", country: "", timezone: "UTC",
      logoUrl: "", plan: "Standard",
      adminEmail: "", adminFullName: "",
      departments: [...DEFAULT_DEPTS], modules: [...DEFAULT_MODULES],
    });
    setStep(0);
    setProvisionResult(null);
    setProvisionError(null);
    setStageStatus(emptyStageMap());
    setErrors({});
    setWizardOpen(true);
  };

  const startProvisioning = useCallback(async (overrideForm?: any) => {
    const payload = overrideForm ?? form;
    const v = validateForm(payload);
    if (Object.keys(v).length > 0) {
      setErrors(v);
      // jump to earliest step containing an error
      const stepFields: Record<number, string[]> = {
        0: ["name", "plan"],
        1: ["contactEmail"],
        3: ["logoUrl"],
        4: ["adminFullName", "adminEmail"],
      };
      const failingStep = Object.entries(stepFields).find(([, fields]) => fields.some(f => v[f]));
      if (failingStep) setStep(parseInt(failingStep[0], 10));
      return;
    }

    setProvisioning(true);
    setProvisionError(null);
    setProvisionResult(null);
    setStageStatus(emptyStageMap());

    try {
      const res = await fetch("/api/tenants/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() || "";
        for (const e of events) {
          const lines = e.split("\n");
          const evt = lines.find(l => l.startsWith("event:"))?.slice(6).trim();
          const data = lines.find(l => l.startsWith("data:"))?.slice(5).trim();
          if (!evt || !data) continue;
          let payloadJson: any;
          try { payloadJson = JSON.parse(data); } catch { continue; }

          if (evt === "stage") {
            setStageStatus(prev => {
              const { key, status, error, details, ...meta } = payloadJson;
              if (status === "start") return { ...prev, [key]: { status: "running" } };
              if (status === "done") return { ...prev, [key]: { status: "done", meta, log: summarizeMeta(key, meta) } };
              if (status === "error") return { ...prev, [key]: { status: "error", error, details } };
              return prev;
            });
          } else if (evt === "done") {
            setProvisionResult(payloadJson);
            await Promise.all([fetchTenants(), fetchRuns()]);
          } else if (evt === "error") {
            setProvisionError({ stage: payloadJson.stage, error: payloadJson.error, details: payloadJson.details });
            await fetchRuns();
          }
        }
      }
    } catch (err: any) {
      setProvisionError({ error: err?.message || "Provisioning failed" });
    } finally {
      setProvisioning(false);
    }
  }, [form]);

  const retryProvisioning = useCallback(() => {
    setProvisionError(null);
    setStageStatus(emptyStageMap());
    startProvisioning();
  }, [startProvisioning]);

  const handleBulkDelete = async () => {
    const selectedList = tenants.filter(t => selectedTenants.has(t.id));
    if (selectedList.length === 0) return;

    const confirmText = prompt(
      `This will ARCHIVE ${selectedList.length} tenant(s) and hide them from default views.\n\nData will be preserved for 30 days, after which a super-admin may permanently purge them.\n\nThis action can be undone during the grace period.\n\nType "ARCHIVE ${selectedList.length}" to confirm:`
    );
    if (confirmText !== `ARCHIVE ${selectedList.length}`) {
      if (confirmText !== null) alert("Confirmation failed. Bulk archive cancelled.");
      return;
    }

    setBulkDeleting(true);
    const prev = tenants;
    setTenants(curr => curr.filter(x => !selectedTenants.has(x.id)));
    setSelectedTenants(new Set());

    try {
      const results = await Promise.allSettled(
        selectedList.map(t => fetch(`/api/tenants/${t.slug}`, { method: "DELETE" }))
      );

      const failed = results.filter(r => r.status === "rejected" || !(r as any).value.ok).length;
      if (failed > 0) {
        alert(`${failed} tenant(s) failed to archive. Check console for details.`);
        setTenants(prev);
      } else {
        alert(`${selectedList.length} tenant(s) archived successfully.`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Bulk archive failed: ${e.message}`);
      setTenants(prev);
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedTenants.size === tenants.length) {
      setSelectedTenants(new Set());
    } else {
      setSelectedTenants(new Set(tenants.map(t => t.id)));
    }
  };

  const toggleSelectTenant = (id: string) => {
    const newSelected = new Set(selectedTenants);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTenants(newSelected);
  };

  const totalSteps = 8;
  const stepTitles = ["Identity", "Contact", "Address", "Branding", "Admin", "Departments", "Modules", "Review"];

  return (
    <div className="min-h-screen bg-subtle -m-6 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tenant Registry</h1>
            <p className="text-muted-foreground text-sm mt-1 font-medium">Provision and manage isolated hospital environments.</p>
          </div>
          <button onClick={openWizard} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-md hover:opacity-90 transition-all active:scale-95" style={{ backgroundColor: orange }}>
            <Plus className="size-4" /> Provision New Tenant
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Stat icon={Building2} label="Total Tenants" value={stats.total} />
          <Stat icon={Check} label="Active" value={stats.active} />
          <Stat icon={Plus} label="Premium" value={stats.premium} />
          <Stat icon={Building2} label="New This Month" value={stats.newThisMonth} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Tenants table */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b border-border">
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search tenants by name or slug..."
                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/20"
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {selectedTenants.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                    >
                      {bulkDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      Archive {selectedTenants.size}
                    </button>
                  )}
                  <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300">
                    <option value="all">All Plans</option>
                    <option value="Basic">Basic</option>
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                  </select>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300">
                    <option value="all">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    <th className="text-left px-5 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedTenants.size === tenants.length && tenants.length > 0}
                          onChange={toggleSelectAll}
                          className="size-4 rounded border border-border bg-background text-orange-500 focus:ring-orange-500"
                        />
                        <span>Select</span>
                      </div>
                    </th>
                    <th className="text-left px-5 py-3">Tenant</th>
                    <th className="text-left px-5 py-3">Slug</th>
                    <th className="text-left px-5 py-3">Plan</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && (
                    <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="size-6 text-orange-500 animate-spin mx-auto" /></td></tr>
                  )}
                  {!loading && tenants.length === 0 && (
                    <tr><td colSpan={6} className="py-16 text-center">
                      <Building2 className="size-10 text-muted mx-auto mb-2" />
                      <p className="text-muted-foreground font-medium">No tenants yet — click "Provision New Tenant" to get started.</p>
                    </td></tr>
                  )}
                  {tenants.map(t => (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedTenants.has(t.id)}
                          onChange={() => toggleSelectTenant(t.id)}
                          className="size-4 rounded border border-border bg-background text-orange-500 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border shrink-0">
                            <Building2 className="size-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{t.name}</p>
                            {t.contactEmail && <p className="text-xs text-muted-foreground">{t.contactEmail}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 rounded bg-muted border border-border text-foreground font-mono text-[10px]">{t.slug}</span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${PLAN_CHIP[t.plan] ?? "bg-muted text-foreground"}`}>{t.plan}</span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${t.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"}`}>
                          <div className={`size-1.5 rounded-full mr-1.5 ${t.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {t.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/tenants/${t.slug}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 font-semibold text-xs transition-colors border border-transparent hover:border-orange-100 dark:hover:border-orange-500/20">
                            Config
                          </Link>
                          <a href={`http://${t.slug}.localhost:3000`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-orange-600 hover:bg-orange-50 font-semibold text-xs transition-colors border border-transparent hover:border-orange-100">
                            Open <ExternalLink className="size-3" />
                          </a>
                          {t.isActive ? (
                            <button
                              onClick={() => handleDeleteTenant(t)}
                              disabled={deletingId === t.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-semibold text-xs transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-500/20 disabled:opacity-50"
                              title="Archive tenant (soft delete)"
                            >
                              {deletingId === t.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                              Archive
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestoreTenant(t)}
                              disabled={restoringId === t.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 font-semibold text-xs transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-500/20 disabled:opacity-50"
                              title="Restore archived tenant"
                            >
                              {restoringId === t.id ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent provisions panel */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Recent Provisions</h3>
                <p className="text-xs text-muted-foreground">Last {Math.min(runs.length, 6)} runs</p>
              </div>
              <button onClick={fetchRuns} className="text-xs text-muted-foreground hover:text-orange-600 inline-flex items-center gap-1">
                <RotateCw className="size-3" /> Refresh
              </button>
            </div>
            <div className="p-3 space-y-2 max-h-[480px] overflow-y-auto">
              {runsLoading && <div className="text-center py-8"><Loader2 className="size-5 animate-spin text-orange-500 mx-auto" /></div>}
              {!runsLoading && runs.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">No provisioning runs yet.</div>
              )}
              {runs.map(r => {
                const statusIcon = r.status === "completed"
                  ? <CheckCircle2 className="size-4 text-emerald-500" />
                  : r.status === "failed"
                  ? <XCircle className="size-4 text-red-500" />
                  : <Loader2 className="size-4 text-orange-500 animate-spin" />;
                const statusChip = r.status === "completed"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : r.status === "failed"
                  ? "bg-red-50 text-red-700 border-red-100"
                  : "bg-orange-50 text-orange-700 border-orange-100";
                return (
                  <div key={r.id} className="rounded-lg border border-border p-3 hover:border-orange-200 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {statusIcon}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">{r.tenant?.name || "Unknown tenant"}</p>
                          {r.tenant?.slug && <p className="text-[10px] font-mono text-muted-foreground truncate">{r.tenant.slug}</p>}
                        </div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${statusChip}`}>{r.status}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="size-3" />{new Date(r.startedAt).toLocaleString()}</span>
                      {r.tenant?.slug && (
                        <Link href={`/tenants/${r.tenant.slug}`} className="text-orange-600 hover:underline font-semibold">View</Link>
                      )}
                    </div>
                    {r.status === "failed" && r.errorMessage && (
                      <p className="mt-2 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1">
                        <span className="font-semibold">@{r.stage}:</span> {r.errorMessage}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Wizard / Loading dialog */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => !provisioning && !provisionResult && setWizardOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {provisionResult ? "Tenant Provisioned" :
                    provisioning || provisionError ? "Provisioning Tenant" :
                    `Step ${step + 1} of ${totalSteps}: ${stepTitles[step]}`}
                </h2>
                {!provisioning && !provisionResult && !provisionError && <p className="text-xs text-muted-foreground mt-0.5">Set up a new isolated hospital environment.</p>}
              </div>
              {!provisioning && (
                <button onClick={() => setWizardOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
              )}
            </div>

            {!provisioning && !provisionResult && !provisionError && (
              <div className="px-6 pt-4">
                <div className="flex gap-1">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-orange-500" : "bg-muted"}`} />
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              {/* Loading / progress view */}
              {(provisioning || provisionError) && !provisionResult && (
                <div className="space-y-2">
                  {STAGES.map(s => {
                    const st = stageStatus[s.key]?.status || "pending";
                    const log = stageStatus[s.key]?.log;
                    const err = stageStatus[s.key]?.error;
                    return (
                      <div key={s.key} className={`rounded-lg border ${st === "error" ? "border-red-200 bg-red-50/50 dark:bg-red-900/10" : "border-border bg-muted/30"}`}>
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <div className="size-6 rounded-full flex items-center justify-center shrink-0">
                            {st === "done" ? <Check className="size-4 text-emerald-600" /> :
                             st === "running" ? <Loader2 className="size-4 text-orange-500 animate-spin" /> :
                             st === "error" ? <XCircle className="size-4 text-red-500" /> :
                             <div className="size-2 rounded-full bg-muted-foreground/30" />}
                          </div>
                          <span className={`text-sm flex-1 ${st === "done" ? "text-foreground" : st === "running" ? "text-foreground font-medium" : st === "error" ? "text-red-700 font-medium" : "text-muted-foreground"}`}>
                            {s.label}
                          </span>
                          {log && st === "done" && <span className="text-xs font-mono text-muted-foreground truncate max-w-[40%]">{log}</span>}
                        </div>
                        {err && (
                          <div className="px-3 pb-2.5 -mt-1 text-xs text-red-700">
                            <p className="font-semibold mb-0.5">Error</p>
                            <p className="font-mono whitespace-pre-wrap break-words">{err}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {provisionError && (
                    <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 text-sm text-red-700 dark:text-red-400">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="size-4 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold">Provisioning failed{provisionError.stage ? ` at "${provisionError.stage}"` : ""}.</p>
                          <p className="mt-0.5">{provisionError.error}</p>
                          {provisionError.details && (
                            <pre className="mt-2 text-[10px] bg-red-100/50 dark:bg-red-950/30 rounded p-2 overflow-x-auto">{JSON.stringify(provisionError.details, null, 2)}</pre>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Result view */}
              {provisionResult && (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="size-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 mx-auto flex items-center justify-center mb-3">
                      <Check className="size-7 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{provisionResult.tenant?.name} is live</h3>
                    <p className="text-sm text-muted-foreground mt-1">Share these one-time credentials with the new admin.</p>
                  </div>
                  <Field label="Tenant Slug" value={provisionResult.tenant?.slug} />
                  <Field label="Tenant URL (development)" value={`http://${provisionResult.tenant?.slug}.localhost:3000`} />
                  <Field label="Admin Email" value={provisionResult.admin?.email} />
                  <Field label="Temporary Password" value={provisionResult.admin?.tempPassword} mono />
                </div>
              )}

              {/* Form steps */}
              {!provisioning && !provisionResult && !provisionError && (
                <div className="space-y-4">
                  {step === 0 && <>
                    <TextField label="Hospital Name *" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} placeholder="Mountain Peak Hospital" error={errors.name} />
                    <SelectField label="Plan *" value={form.plan} onChange={(v: string) => setForm({ ...form, plan: v })} options={["Basic", "Standard", "Premium"]} error={errors.plan} />
                  </>}
                  {step === 1 && <>
                    <TextField label="Contact Email *" value={form.contactEmail} onChange={(v: string) => setForm({ ...form, contactEmail: v })} placeholder="contact@hospital.com" error={errors.contactEmail} />
                    <TextField label="Contact Phone" value={form.contactPhone} onChange={(v: string) => setForm({ ...form, contactPhone: v })} placeholder="+1 555 123 4567" type="phone" />
                  </>}
                  {step === 2 && <>
                    <TextField label="Address" value={form.address} onChange={(v: string) => setForm({ ...form, address: v })} />
                    <div className="grid grid-cols-2 gap-3">
                      <TextField label="City" value={form.city} onChange={(v: string) => setForm({ ...form, city: v })} />
                      <TextField label="Country" value={form.country} onChange={(v: string) => setForm({ ...form, country: v })} />
                    </div>
                    <TextField label="Timezone" value={form.timezone} onChange={(v: string) => setForm({ ...form, timezone: v })} />
                  </>}
                  {step === 3 && <>
                    <TextField label="Logo URL (optional)" value={form.logoUrl} onChange={(v: string) => setForm({ ...form, logoUrl: v })} placeholder="https://..." error={errors.logoUrl} />
                  </>}
                  {step === 4 && <>
                    <TextField label="Admin Full Name *" value={form.adminFullName} onChange={(v: string) => setForm({ ...form, adminFullName: v })} error={errors.adminFullName} />
                    <TextField label="Admin Email *" value={form.adminEmail} onChange={(v: string) => setForm({ ...form, adminEmail: v })} placeholder="admin@hospital.com" error={errors.adminEmail} />
                    <p className="text-xs text-muted-foreground">A temporary password will be generated and shown once at the end.</p>
                  </>}
                  {step === 5 && <ChipsEditor label="Departments" items={form.departments} onChange={(v: string[]) => setForm({ ...form, departments: v })} />}
                  {step === 6 && <ChipsEditor label="Modules" items={form.modules} onChange={(v: string[]) => setForm({ ...form, modules: v })} />}
                  {step === 7 && (
                    <div className="space-y-2 text-sm">
                      <Row k="Hospital" v={form.name} />
                      <Row k="Plan" v={form.plan} />
                      <Row k="Contact" v={form.contactEmail} />
                      <Row k="Admin" v={`${form.adminFullName} <${form.adminEmail}>`} />
                      <Row k="Departments" v={form.departments.join(", ")} />
                      <Row k="Modules" v={form.modules.join(", ")} />
                      {Object.keys(errors).length > 0 && (
                        <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700">
                          Please fix the highlighted fields before provisioning.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-2">
              {provisionResult ? (
                <button onClick={() => { setWizardOpen(false); }} className="ml-auto px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: orange }}>Done</button>
              ) : provisionError ? (
                <>
                  <button onClick={() => setWizardOpen(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted">Close</button>
                  <button onClick={retryProvisioning} className="px-4 py-2 rounded-lg text-white text-sm font-medium inline-flex items-center gap-2" style={{ backgroundColor: orange }}>
                    <RotateCw className="size-4" /> Retry Provisioning
                  </button>
                </>
              ) : provisioning ? (
                <p className="text-xs text-muted-foreground">Please don't close this window.</p>
              ) : (
                <>
                  <button disabled={step === 0} onClick={() => setStep(s => s - 1)} className="px-4 py-2 rounded-lg border border-border text-sm text-foreground disabled:opacity-40 inline-flex items-center gap-1 transition-colors hover:bg-muted">
                    <ChevronLeft className="size-4" /> Back
                  </button>
                  {step < totalSteps - 1 ? (
                    <button onClick={() => setStep(s => s + 1)} className="px-4 py-2 rounded-lg text-white text-sm font-medium inline-flex items-center gap-1" style={{ backgroundColor: orange }}>
                      Next <ChevronRight className="size-4" />
                    </button>
                  ) : (
                    <button onClick={() => startProvisioning()} className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: orange }}>
                      Provision Tenant
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, error, type = "text" }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {type === "phone" ? (
        <PhoneNumberInput
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={error ? "border-red-300 focus-within:border-red-400 focus-within:ring-red-100" : "focus-within:border-orange-300 focus-within:ring-orange-100 dark:focus-within:ring-orange-900/20"}
        />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full h-10 px-3 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 ${error ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-border focus:border-orange-300 focus:ring-orange-100 dark:focus:ring-orange-900/20"}`} />
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
function SelectField({ label, value, onChange, options, error }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={`w-full h-10 px-3 rounded-lg border bg-background text-sm text-foreground focus:outline-none ${error ? "border-red-300" : "border-border focus:border-orange-300"}`}>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
function ChipsEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map(it => (
          <span key={it} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs">
            {it} <button onClick={() => onChange(items.filter(x => x !== it))} className="text-orange-400 hover:text-orange-600">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add..." className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground" />
        <button onClick={() => { if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(""); } }} className="px-3 h-9 rounded-lg bg-muted text-sm text-muted-foreground transition-colors hover:bg-muted/80">Add</button>
      </div>
    </div>
  );
}
function Row({ k, v }: any) {
  return <div className="flex justify-between py-1.5 border-b border-border"><span className="text-muted-foreground">{k}</span><span className="text-foreground font-medium text-right">{v}</span></div>;
}
function Field({ label, value, mono }: any) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <div className="flex gap-2">
        <input readOnly value={value} className={`flex-1 h-10 px-3 rounded-lg border border-border bg-muted/50 text-sm text-foreground ${mono ? "font-mono" : ""}`} />
        <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-muted-foreground inline-flex items-center gap-1 transition-colors hover:bg-muted">
          {copied ? <><Check className="size-4 text-emerald-600" /> Copied</> : <><Copy className="size-4" /> Copy</>}
        </button>
      </div>
    </div>
  );
}
