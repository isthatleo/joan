"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CreditCard, Loader2, Plus, RefreshCw, ShieldCheck, Users, X } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  code: string;
  description?: string;
  currency: string;
  monthlyPrice: string;
  yearlyPrice: string;
  staffLimit: number;
  clientLimit: number;
  storageGb: number;
  features: string[];
  modules: string[];
  supportLevel: string;
  isActive: boolean;
  isDefault: boolean;
};

type Retainer = {
  id: string;
  name: string;
  code: string;
  description?: string;
  currency: string;
  monthly_fee: string;
  setup_fee: string;
  response_sla_hours: number;
  included_hours: number;
  overage_rate: string;
  features: string[];
  is_active: boolean;
  is_default: boolean;
  active_tenants: number;
};

const money = (currency: string, value: string | number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value || 0));

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [retainers, setRetainers] = useState<Retainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRetainer, setSavingRetainer] = useState(false);
  const [showRetainerForm, setShowRetainerForm] = useState(false);
  const [error, setError] = useState("");
  const [retainerForm, setRetainerForm] = useState({
    name: "",
    code: "",
    description: "",
    currency: "USD",
    monthlyFee: "0",
    setupFee: "0",
    responseSlaHours: "8",
    includedHours: "10",
    overageRate: "75",
    features: "Priority support\nMonthly reporting\nConfiguration advisory",
    isDefault: false,
  });

  async function loadPlans() {
    setLoading(true);
    setError("");
    try {
      const [res, retainerRes] = await Promise.all([
        fetch("/api/subscription-plans?includeInactive=true", { cache: "no-store", credentials: "include" }),
        fetch("/api/retainer-plans?includeInactive=true", { cache: "no-store", credentials: "include" }),
      ]);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load plans");
      const retainerData = await retainerRes.json().catch(() => ({}));
      if (!retainerRes.ok) throw new Error(retainerData?.error || "Failed to load retainer plans");
      setPlans(data.plans || []);
      setRetainers(retainerData.retainers || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPlans(); }, []);

  const stats = useMemo(() => ({
    active: plans.filter((plan) => plan.isActive).length,
    staff: plans.reduce((sum, plan) => sum + Number(plan.staffLimit || 0), 0),
    clients: plans.reduce((sum, plan) => sum + Number(plan.clientLimit || 0), 0),
    retainers: retainers.filter((retainer) => retainer.is_active).length,
    retainedTenants: retainers.reduce((sum, retainer) => sum + Number(retainer.active_tenants || 0), 0),
  }), [plans, retainers]);

  async function createRetainer() {
    setSavingRetainer(true);
    setError("");
    try {
      const res = await fetch("/api/retainer-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...retainerForm,
          monthlyFee: Number(retainerForm.monthlyFee),
          setupFee: Number(retainerForm.setupFee),
          responseSlaHours: Number(retainerForm.responseSlaHours),
          includedHours: Number(retainerForm.includedHours),
          overageRate: Number(retainerForm.overageRate),
          features: retainerForm.features.split("\n").map((item) => item.trim()).filter(Boolean),
          isActive: true,
          sortOrder: retainers.length + 1,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create retainer plan");
      setShowRetainerForm(false);
      setRetainerForm({
        name: "",
        code: "",
        description: "",
        currency: "USD",
        monthlyFee: "0",
        setupFee: "0",
        responseSlaHours: "8",
        includedHours: "10",
        overageRate: "75",
        features: "Priority support\nMonthly reporting\nConfiguration advisory",
        isDefault: false,
      });
      await loadPlans();
    } catch (err: any) {
      setError(err?.message || "Failed to create retainer plan");
    } finally {
      setSavingRetainer(false);
    }
  }

  return (
    <div className="min-h-screen bg-subtle -m-6 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-semibold text-orange-600">Tenant Registry</p>
            <h1 className="text-3xl font-bold text-foreground">Subscription Plans</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage system plans, limits, modules, and tenant billing tiers.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadPlans} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold">
              <RefreshCw className="size-4" /> Refresh
            </button>
            <Link href="/tenants/subscription-plans/new" className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white">
              <Plus className="size-4" /> Add Plan
            </Link>
            <button onClick={() => setShowRetainerForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
              <ShieldCheck className="size-4" /> Add Retainer
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <Metric icon={<CreditCard className="size-5" />} label="Active plans" value={stats.active} />
          <Metric icon={<Users className="size-5" />} label="Total staff capacity" value={stats.staff.toLocaleString()} />
          <Metric icon={<Users className="size-5" />} label="Total client capacity" value={stats.clients.toLocaleString()} />
          <Metric icon={<ShieldCheck className="size-5" />} label="Retainers" value={stats.retainers} />
          <Metric icon={<Users className="size-5" />} label="Retained tenants" value={stats.retainedTenants} />
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {showRetainerForm && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Create Retainer Package</h2>
                <p className="text-sm text-muted-foreground">Retainers are optional platform support packages tracked independently from subscription tiers.</p>
              </div>
              <button onClick={() => setShowRetainerForm(false)} className="rounded-lg border border-border p-2"><X className="size-4" /></button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Name" value={retainerForm.name} onChange={(value) => setRetainerForm((form) => ({ ...form, name: value }))} />
              <Input label="Code" value={retainerForm.code} onChange={(value) => setRetainerForm((form) => ({ ...form, code: value }))} />
              <Input label="Monthly fee" type="number" value={retainerForm.monthlyFee} onChange={(value) => setRetainerForm((form) => ({ ...form, monthlyFee: value }))} />
              <Input label="Setup fee" type="number" value={retainerForm.setupFee} onChange={(value) => setRetainerForm((form) => ({ ...form, setupFee: value }))} />
              <Input label="Response SLA hours" type="number" value={retainerForm.responseSlaHours} onChange={(value) => setRetainerForm((form) => ({ ...form, responseSlaHours: value }))} />
              <Input label="Included support hours" type="number" value={retainerForm.includedHours} onChange={(value) => setRetainerForm((form) => ({ ...form, includedHours: value }))} />
              <Input label="Overage hourly rate" type="number" value={retainerForm.overageRate} onChange={(value) => setRetainerForm((form) => ({ ...form, overageRate: value }))} />
              <Input label="Currency" value={retainerForm.currency} onChange={(value) => setRetainerForm((form) => ({ ...form, currency: value.toUpperCase() }))} />
              <label className="md:col-span-2 text-sm font-semibold">
                Description
                <textarea value={retainerForm.description} onChange={(event) => setRetainerForm((form) => ({ ...form, description: event.target.value }))} className="mt-1 min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </label>
              <label className="md:col-span-2 text-sm font-semibold">
                Features, one per line
                <textarea value={retainerForm.features} onChange={(event) => setRetainerForm((form) => ({ ...form, features: event.target.value }))} className="mt-1 min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button disabled={savingRetainer} onClick={createRetainer} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {savingRetainer && <Loader2 className="size-4 animate-spin" />} Save Retainer
              </button>
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-border bg-card">
            <Loader2 className="size-6 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h2 className="mb-3 text-lg font-bold">Subscription Tiers</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {plans.map((plan) => (
                  <Link key={plan.id} href={`/tenants/subscription-plans/${plan.id}`} className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-orange-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                      {plan.isDefault && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">Default</span>}
                      {!plan.isActive && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Inactive</span>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <ArrowRight className="size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-orange-600" />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Mini label="Monthly" value={money(plan.currency, plan.monthlyPrice)} />
                  <Mini label="Staff" value={plan.staffLimit.toLocaleString()} />
                  <Mini label="Clients" value={plan.clientLimit.toLocaleString()} />
                  <Mini label="Storage" value={`${plan.storageGb.toLocaleString()}GB`} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {plan.features.slice(0, 5).map((feature) => (
                    <span key={feature} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-3 text-emerald-600" /> {feature}
                    </span>
                  ))}
                </div>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-bold">Retainer Packages</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {retainers.map((retainer) => (
                  <Link key={retainer.id} href={`/tenants/subscription-plans/retainers/${retainer.id}`} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white shadow-sm transition hover:border-orange-300 hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-bold">{retainer.name}</h3>
                          {retainer.is_default && <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold">Default</span>}
                          {!retainer.is_active && <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold">Inactive</span>}
                        </div>
                        <p className="mt-1 text-sm text-white/70">{retainer.description}</p>
                      </div>
                      <ShieldCheck className="size-6 text-orange-300" />
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <MiniDark label="Monthly" value={money(retainer.currency, retainer.monthly_fee)} />
                      <MiniDark label="Setup" value={money(retainer.currency, retainer.setup_fee)} />
                      <MiniDark label="SLA" value={`${retainer.response_sla_hours}h`} />
                      <MiniDark label="Active tenants" value={String(retainer.active_tenants || 0)} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(retainer.features || []).slice(0, 6).map((feature) => (
                        <span key={feature} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80">
                          <CheckCircle2 className="size-3 text-orange-300" /> {feature}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-white/60">
                      Includes {retainer.included_hours} support hours. Overage: {money(retainer.currency, retainer.overage_rate)}/hour.
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="mb-2 text-orange-500">{icon}</div><p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold text-foreground">{value}</p></div>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-muted/60 p-3"><p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p><p className="mt-1 font-bold text-foreground">{value}</p></div>;
}

function MiniDark({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white/10 p-3"><p className="text-[11px] font-semibold uppercase text-white/60">{label}</p><p className="mt-1 font-bold text-white">{value}</p></div>;
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </label>
  );
}
