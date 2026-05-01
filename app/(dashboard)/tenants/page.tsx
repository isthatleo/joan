"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Filter, Plus, Building2, Loader2, Check, Copy, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  contactEmail?: string;
  createdAt?: string;
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
  { key: "role", label: "Assigning admin role" },
  { key: "departments", label: "Seeding departments" },
  { key: "modules", label: "Activating modules" },
  { key: "audit", label: "Recording audit log" },
];

const DEFAULT_DEPTS = ["Reception", "General Medicine", "Pharmacy", "Laboratory", "Emergency"];
const DEFAULT_MODULES = ["Appointments", "Pharmacy", "Laboratory", "Billing", "Inpatient", "Emergency", "Telemedicine"];

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

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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
  const [provisioning, setProvisioning] = useState(false);
  const [stageStatus, setStageStatus] = useState<Record<string, { status: "pending" | "running" | "done"; meta?: any }>>({});
  const [provisionResult, setProvisionResult] = useState<{ tenantId: string; slug: string; tempPassword: string } | null>(null);
  const [provisionError, setProvisionError] = useState<string | null>(null);

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
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchTenants(); 
  }, [debouncedSearch, planFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = tenants.filter(t => t.isActive).length;
    return {
      total: tenants.length,
      active,
      premium: tenants.filter(t => t.plan === "Premium").length,
      newThisMonth: tenants.filter(t => t.createdAt && (Date.now() - new Date(t.createdAt).getTime()) / 86400000 < 30).length,
    };
  }, [tenants]);

  const filtered = useMemo(() => {
    // Backend already handles filtering. Just returning the tenants from state.
    return tenants;
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
    setStageStatus({});
    setWizardOpen(true);
  };

  const startProvisioning = async () => {
    setProvisioning(true);
    setProvisionError(null);
    setStageStatus(Object.fromEntries(STAGES.map(s => [s.key, { status: "pending" }])));
    try {
      const res = await fetch("/api/tenants/provision", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
          const payload = JSON.parse(data);
          if (evt === "stage") {
            setStageStatus(prev => ({ ...prev, [payload.key]: { status: payload.status === "start" ? "running" : "done", meta: payload.meta } }));
          } else if (evt === "done") {
            setProvisionResult(payload);
            await fetchTenants();
          } else if (evt === "error") {
            setProvisionError(payload.message || "Provisioning failed");
          }
        }
      }
    } catch (err: any) {
      setProvisionError(err?.message || "Provisioning failed");
    } finally {
      setProvisioning(false);
    }
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

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-border">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tenants by name or slug..."
                  className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/20"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="h-10 px-4 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300">
                  <option value="all">All Plans</option>
                  <option value="Basic">Basic</option>
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 px-4 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300">
                  <option value="all">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
                <button className="h-10 px-4 rounded-lg border border-border bg-background text-sm text-foreground inline-flex items-center gap-2 hover:bg-muted transition-colors">
                  <Filter className="size-4" /> More Filters
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left px-6 py-4">Tenant Name</th>
                  <th className="text-left px-6 py-4">Slug</th>
                  <th className="text-left px-6 py-4">Plan</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4">Created</th>
                  <th className="text-left px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="size-8 text-orange-500 animate-spin" />
                        <p className="text-muted-foreground font-medium">Loading tenants...</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="size-10 text-muted" />
                        <p className="text-muted-foreground font-medium">No tenants yet — click "Provision New Tenant" to get started.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shadow-sm border border-border shrink-0">
                          <Building2 className="size-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{t.name}</p>
                          {t.contactEmail && <p className="text-xs text-muted-foreground">{t.contactEmail}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded bg-muted border border-border text-foreground font-mono text-[10px]">
                        {t.slug}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${PLAN_CHIP[t.plan] ?? "bg-muted text-foreground"}`}>
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${t.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"}`}>
                        <div className={`size-1.5 rounded-full mr-1.5 ${t.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        href={`/tenants/${t.slug}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 font-semibold text-xs transition-colors border border-transparent hover:border-orange-100 dark:hover:border-orange-500/20"
                      >
                        Config
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Wizard / Loading dialog */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => !provisioning && !provisionResult && setWizardOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {provisionResult ? "Tenant Provisioned" : provisioning ? "Provisioning Tenant" : `Step ${step + 1} of ${totalSteps}: ${stepTitles[step]}`}
                </h2>
                {!provisioning && !provisionResult && <p className="text-xs text-muted-foreground mt-0.5">Set up a new isolated hospital environment.</p>}
              </div>
              {!provisioning && !provisionResult && (
                <button onClick={() => setWizardOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              )}
            </div>

            {/* Step indicator */}
            {!provisioning && !provisionResult && (
              <div className="px-6 pt-4">
                <div className="flex gap-1">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-orange-500" : "bg-muted"}`} />
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              {/* Loading view */}
              {provisioning && (
                <div className="space-y-2">
                  {STAGES.map(s => {
                    const st = stageStatus[s.key]?.status || "pending";
                    return (
                      <div key={s.key} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50">
                        <div className="size-6 rounded-full flex items-center justify-center shrink-0">
                          {st === "done" ? <Check className="size-4 text-green-600" /> : st === "running" ? <Loader2 className="size-4 text-orange-500 animate-spin" /> : <div className="size-2 rounded-full bg-muted-foreground/30" />}
                        </div>
                        <span className={`text-sm ${st === "done" ? "text-foreground" : st === "running" ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
                        {stageStatus[s.key]?.meta && <span className="ml-auto text-xs text-muted-foreground">{Object.values(stageStatus[s.key].meta!).join(" · ")}</span>}
                      </div>
                    );
                  })}
                  {provisionError && (
                    <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-sm text-destructive">
                      <AlertCircle className="size-4 mt-0.5" /> {provisionError}
                    </div>
                  )}
                </div>
              )}

              {/* Result view */}
              {provisionResult && (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="size-14 rounded-full bg-success-soft mx-auto flex items-center justify-center mb-3">
                      <Check className="size-7 text-success" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{form.name} is live</h3>
                    <p className="text-sm text-muted-foreground mt-1">Share these one-time credentials with the new admin.</p>
                  </div>
                  <Field label="Tenant Slug" value={provisionResult.slug} />
                  <Field label="Admin Email" value={form.adminEmail} />
                  <Field label="Temporary Password" value={provisionResult.tempPassword} mono />
                </div>
              )}

              {/* Form steps */}
              {!provisioning && !provisionResult && (
                <div className="space-y-4">
                  {step === 0 && <>
                    <TextField label="Hospital Name" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} placeholder="Mountain Peak Hospital" />
                    <SelectField label="Plan" value={form.plan} onChange={(v: string) => setForm({ ...form, plan: v })} options={["Basic", "Standard", "Premium"]} />
                  </>}
                  {step === 1 && <>
                    <TextField label="Contact Email" value={form.contactEmail} onChange={(v: string) => setForm({ ...form, contactEmail: v })} placeholder="contact@hospital.com" />
                    <TextField label="Contact Phone" value={form.contactPhone} onChange={(v: string) => setForm({ ...form, contactPhone: v })} placeholder="+1 555 123 4567" />
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
                    <TextField label="Logo URL (optional)" value={form.logoUrl} onChange={(v: string) => setForm({ ...form, logoUrl: v })} placeholder="https://..." />
                  </>}
                  {step === 4 && <>
                    <TextField label="Admin Full Name" value={form.adminFullName} onChange={(v: string) => setForm({ ...form, adminFullName: v })} />
                    <TextField label="Admin Email" value={form.adminEmail} onChange={(v: string) => setForm({ ...form, adminEmail: v })} placeholder="admin@hospital.com" />
                    <p className="text-xs text-muted-foreground">A temporary password will be generated and shown once at the end.</p>
                  </>}
                  {step === 5 && <ChipsEditor label="Departments" items={form.departments} onChange={(v: string[]) => setForm({ ...form, departments: v })} />}
                  {step === 6 && <ChipsEditor label="Modules" items={form.modules} onChange={(v: string[]) => setForm({ ...form, modules: v })} />}
                  {step === 7 && (
                    <div className="space-y-2 text-sm">
                      <Row k="Hospital" v={form.name} />
                      <Row k="Plan" v={form.plan} />
                      <Row k="Admin" v={`${form.adminFullName} <${form.adminEmail}>`} />
                      <Row k="Departments" v={form.departments.join(", ")} />
                      <Row k="Modules" v={form.modules.join(", ")} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-2">
              {provisionResult ? (
                <button onClick={() => setWizardOpen(false)} className="ml-auto px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: orange }}>Done</button>
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
                    <button onClick={startProvisioning} className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: orange }}>
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

function TextField({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/20" />
    </div>
  );
}
function SelectField({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300">
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
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
          {copied ? <><Check className="size-4 text-green-600" /> Copied</> : <><Copy className="size-4" /> Copy</>}
        </button>
      </div>
    </div>
  );
}
