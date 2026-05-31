"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Plus, Send, Trash2 } from "lucide-react";

type TenantOption = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  contactEmail?: string | null;
  isActive: boolean;
};

type PlanOption = {
  id: string;
  name: string;
  code: string;
  currency: string;
  monthlyPrice: string;
};

type LineItem = {
  description: string;
  quantity: string;
  unitPrice: string;
};

const today = new Date().toISOString().slice(0, 10);
const dueDefault = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function NewPlatformInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [form, setForm] = useState({
    tenantId: "",
    planId: "",
    status: "sent",
    currency: "USD",
    billingEmail: "",
    billingName: "",
    dueAt: dueDefault,
    periodStart: today,
    periodEnd: dueDefault,
    tax: "0",
    notes: "",
    kind: "monthly_fee",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "Monthly platform subscription", quantity: "1", unitPrice: "0" },
  ]);

  useEffect(() => {
    async function load() {
      setError("");
      try {
        const res = await fetch("/api/super-admin/billing", { cache: "no-store", credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load billing options");
        setTenants((data.tenants || []).filter((tenant: TenantOption) => tenant.isActive));
        setPlans(data.plans || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load billing options");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const selectedTenant = tenants.find((tenant) => tenant.id === form.tenantId);
  const selectedPlan = plans.find((plan) => plan.id === form.planId);
  const subtotal = useMemo(() => lineItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0), [lineItems]);
  const total = subtotal + Number(form.tax || 0);

  function applyTenant(tenantId: string) {
    const tenant = tenants.find((item) => item.id === tenantId);
    setForm((current) => ({
      ...current,
      tenantId,
      billingName: tenant?.name || current.billingName,
      billingEmail: tenant?.contactEmail || current.billingEmail,
    }));
  }

  function applyPlan(planId: string) {
    const plan = plans.find((item) => item.id === planId);
    setForm((current) => ({
      ...current,
      planId,
      currency: plan?.currency || current.currency,
    }));
    if (plan) {
      setLineItems([{ description: `${plan.name} monthly subscription`, quantity: "1", unitPrice: String(plan.monthlyPrice || "0") }]);
    }
  }

  async function submit() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/super-admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          planId: form.planId || null,
          dueAt: form.dueAt,
          periodStart: form.periodStart || null,
          periodEnd: form.periodEnd || null,
          tax: Number(form.tax || 0),
          lineItems: lineItems.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity || 0),
            unitPrice: Number(item.unitPrice || 0),
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create invoice");
      router.push(`/super-admin/billing/invoices/${data.invoice.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="size-6 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="min-h-screen bg-subtle -m-6 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Link href="/super-admin/billing" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> Back to billing
            </Link>
            <h1 className="text-3xl font-bold">Create Platform Invoice</h1>
            <p className="mt-1 text-sm text-muted-foreground">Issue monthly fees, subscriptions, retainers, setup fees, and maintenance invoices to tenants.</p>
          </div>
          <button disabled={saving || !form.tenantId || !lineItems.length} onClick={submit} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Create & Send
          </button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-4 text-lg font-bold">Recipient & Billing Terms</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Tenant
                  <select value={form.tenantId} onChange={(event) => applyTenant(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <option value="">Select tenant</option>
                    {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.slug})</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold">
                  Linked plan
                  <select value={form.planId} onChange={(event) => applyPlan(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <option value="">No plan link</option>
                    {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                  </select>
                </label>
                <Input label="Billing name" value={form.billingName} onChange={(value) => setForm((current) => ({ ...current, billingName: value }))} />
                <Input label="Billing email" value={form.billingEmail} onChange={(value) => setForm((current) => ({ ...current, billingEmail: value }))} />
                <Input label="Currency" value={form.currency} onChange={(value) => setForm((current) => ({ ...current, currency: value.toUpperCase() }))} />
                <label className="text-sm font-semibold">
                  Invoice type
                  <select value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <option value="monthly_fee">Monthly fee</option>
                    <option value="subscription">Subscription</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retainer">Retainer</option>
                    <option value="setup_fee">Setup fee</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
                <Input label="Due date" type="date" value={form.dueAt} onChange={(value) => setForm((current) => ({ ...current, dueAt: value }))} />
                <Input label="Tax" type="number" value={form.tax} onChange={(value) => setForm((current) => ({ ...current, tax: value }))} />
              </div>
              <label className="mt-4 block text-sm font-semibold">
                Notes
                <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="mt-1 min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </label>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Line Items</h2>
                <button onClick={() => setLineItems((items) => [...items, { description: "", quantity: "1", unitPrice: "0" }])} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold">
                  <Plus className="size-4" /> Add item
                </button>
              </div>
              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={index} className="grid gap-3 rounded-xl border border-border p-3 md:grid-cols-[1fr_100px_140px_40px]">
                    <Input label="Description" value={item.description} onChange={(value) => setLineItems((items) => items.map((line, i) => i === index ? { ...line, description: value } : line))} />
                    <Input label="Qty" type="number" value={item.quantity} onChange={(value) => setLineItems((items) => items.map((line, i) => i === index ? { ...line, quantity: value } : line))} />
                    <Input label="Unit price" type="number" value={item.unitPrice} onChange={(value) => setLineItems((items) => items.map((line, i) => i === index ? { ...line, unitPrice: value } : line))} />
                    <button onClick={() => setLineItems((items) => items.filter((_, i) => i !== index))} className="mt-6 inline-flex h-10 items-center justify-center rounded-lg border border-border text-red-600">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="rounded-2xl border border-border bg-slate-950 p-5 text-white">
            <p className="text-sm font-semibold text-orange-300">Invoice Preview</p>
            <h2 className="mt-2 text-2xl font-bold">{selectedTenant?.name || "No tenant selected"}</h2>
            <p className="text-sm text-white/60">{selectedPlan?.name || "Manual invoice"}</p>
            <div className="mt-6 space-y-3 text-sm">
              <Row label="Subtotal" value={money(form.currency, subtotal)} />
              <Row label="Tax" value={money(form.currency, Number(form.tax || 0))} />
              <Row label="Total" value={money(form.currency, total)} prominent />
              <Row label="Due" value={form.dueAt || "-"} />
              <Row label="Status" value={form.status} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function money(currency: string, value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 }).format(value || 0);
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </label>
  );
}

function Row({ label, value, prominent = false }: { label: string; value: string; prominent?: boolean }) {
  return <div className={`flex justify-between gap-4 border-b border-white/10 pb-2 ${prominent ? "text-lg font-bold text-orange-200" : ""}`}><span className="text-white/60">{label}</span><span>{value}</span></div>;
}
