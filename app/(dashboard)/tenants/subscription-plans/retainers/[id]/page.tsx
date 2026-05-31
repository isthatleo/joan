"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";

type RetainerForm = {
  name: string;
  code: string;
  description: string;
  currency: string;
  monthlyFee: string;
  setupFee: string;
  responseSlaHours: string;
  includedHours: string;
  overageRate: string;
  features: string;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: string;
};

const emptyForm: RetainerForm = {
  name: "",
  code: "",
  description: "",
  currency: "USD",
  monthlyFee: "0",
  setupFee: "0",
  responseSlaHours: "24",
  includedHours: "0",
  overageRate: "0",
  features: "",
  isActive: true,
  isDefault: false,
  sortOrder: "0",
};

const money = (currency: string, value: string | number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 }).format(Number(value || 0));

export default function RetainerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [form, setForm] = useState<RetainerForm>(emptyForm);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/retainer-plans/${id}`, { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load retainer plan");
      const retainer = data.retainer;
      setForm({
        name: retainer.name || "",
        code: retainer.code || "",
        description: retainer.description || "",
        currency: retainer.currency || "USD",
        monthlyFee: String(retainer.monthly_fee || "0"),
        setupFee: String(retainer.setup_fee || "0"),
        responseSlaHours: String(retainer.response_sla_hours || "24"),
        includedHours: String(retainer.included_hours || "0"),
        overageRate: String(retainer.overage_rate || "0"),
        features: Array.isArray(retainer.features) ? retainer.features.join("\n") : "",
        isActive: Boolean(retainer.is_active),
        isDefault: Boolean(retainer.is_default),
        sortOrder: String(retainer.sort_order || "0"),
      });
      setTenants(data.tenants || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load retainer plan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) void load(); }, [id]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/retainer-plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          description: form.description,
          currency: form.currency,
          monthlyFee: Number(form.monthlyFee || 0),
          setupFee: Number(form.setupFee || 0),
          responseSlaHours: Number(form.responseSlaHours || 24),
          includedHours: Number(form.includedHours || 0),
          overageRate: Number(form.overageRate || 0),
          features: form.features.split("\n").map((item) => item.trim()).filter(Boolean),
          isActive: form.isActive,
          isDefault: form.isDefault,
          sortOrder: Number(form.sortOrder || 0),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to update retainer plan");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to update retainer plan");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Deactivate and delete "${form.name}"?`)) return;
    const res = await fetch(`/api/retainer-plans/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error || "Failed to delete retainer plan");
      return;
    }
    router.push("/tenants/subscription-plans");
  }

  return (
    <div className="min-h-screen bg-subtle -m-6 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/tenants/subscription-plans" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to plans
        </Link>
        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-border bg-card"><Loader2 className="size-6 animate-spin text-orange-500" /></div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Retainer Details</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Edit support pricing, SLA, included hours, and custom retainer benefits.</p>
                </div>
                <button onClick={remove} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600">
                  <Trash2 className="size-4" /> Delete
                </button>
              </div>
              {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              <form onSubmit={save} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Name" value={form.name} onChange={(value) => setForm((state) => ({ ...state, name: value }))} />
                  <Input label="Code" value={form.code} onChange={(value) => setForm((state) => ({ ...state, code: value }))} />
                  <Input label="Monthly fee" type="number" value={form.monthlyFee} onChange={(value) => setForm((state) => ({ ...state, monthlyFee: value }))} />
                  <Input label="Setup fee" type="number" value={form.setupFee} onChange={(value) => setForm((state) => ({ ...state, setupFee: value }))} />
                  <Input label="Response SLA hours" type="number" value={form.responseSlaHours} onChange={(value) => setForm((state) => ({ ...state, responseSlaHours: value }))} />
                  <Input label="Included support hours" type="number" value={form.includedHours} onChange={(value) => setForm((state) => ({ ...state, includedHours: value }))} />
                  <Input label="Overage rate" type="number" value={form.overageRate} onChange={(value) => setForm((state) => ({ ...state, overageRate: value }))} />
                  <Input label="Currency" value={form.currency} onChange={(value) => setForm((state) => ({ ...state, currency: value.toUpperCase() }))} />
                  <Input label="Sort order" type="number" value={form.sortOrder} onChange={(value) => setForm((state) => ({ ...state, sortOrder: value }))} />
                  <div className="flex items-center gap-4 pt-6">
                    <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((state) => ({ ...state, isActive: event.target.checked }))} /> Active</label>
                    <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.isDefault} onChange={(event) => setForm((state) => ({ ...state, isDefault: event.target.checked }))} /> Default</label>
                  </div>
                  <label className="md:col-span-2 text-sm font-semibold">
                    Description
                    <textarea value={form.description} onChange={(event) => setForm((state) => ({ ...state, description: event.target.value }))} className="mt-1 min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  </label>
                  <label className="md:col-span-2 text-sm font-semibold">
                    Features, one per line
                    <textarea value={form.features} onChange={(event) => setForm((state) => ({ ...state, features: event.target.value }))} className="mt-1 min-h-32 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  </label>
                </div>
                <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Changes
                </button>
              </form>
            </div>
            <aside className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="font-bold text-foreground">Package Summary</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <Mini label="Monthly fee" value={money(form.currency, form.monthlyFee)} />
                  <Mini label="Setup fee" value={money(form.currency, form.setupFee)} />
                  <Mini label="SLA" value={`${form.responseSlaHours} hours`} />
                  <Mini label="Included hours" value={form.includedHours} />
                  <Mini label="Overage rate" value={`${money(form.currency, form.overageRate)}/hour`} />
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="font-bold text-foreground">Active Tenants</h2>
                <div className="mt-4 space-y-3">
                  {tenants.length === 0 && <p className="text-sm text-muted-foreground">No tenants are currently assigned to this retainer.</p>}
                  {tenants.map((tenant) => (
                    <div key={tenant.id} className="rounded-lg border border-border p-3 text-sm">
                      <p className="font-semibold text-foreground">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{tenant.slug} / {tenant.contact_email || "No billing email"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </label>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-muted/60 p-3"><p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p><p className="mt-1 font-bold text-foreground">{value}</p></div>;
}
