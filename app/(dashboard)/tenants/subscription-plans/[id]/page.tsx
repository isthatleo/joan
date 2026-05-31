"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { emptyPlan, normalizePlanPayload, PlanForm, type PlanFormValue } from "../plan-form";

type Invoice = { id: string; invoiceNumber: string; status: string; total: string; dueAt: string };

function toForm(plan: any): PlanFormValue {
  return {
    ...emptyPlan,
    name: plan.name || "",
    code: plan.code || "",
    description: plan.description || "",
    currency: plan.currency || "USD",
    monthlyPrice: String(plan.monthlyPrice || "0"),
    yearlyPrice: String(plan.yearlyPrice || "0"),
    staffLimit: String(plan.staffLimit || "0"),
    clientLimit: String(plan.clientLimit || "0"),
    storageGb: String(plan.storageGb || "0"),
    supportLevel: plan.supportLevel || "standard",
    billingCycle: plan.billingCycle || "monthly",
    isActive: Boolean(plan.isActive),
    isDefault: Boolean(plan.isDefault),
    features: Array.isArray(plan.features) ? plan.features : [],
    modules: Array.isArray(plan.modules) ? plan.modules : [],
  };
}

export default function SubscriptionPlanDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [form, setForm] = useState<PlanFormValue>(emptyPlan);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/subscription-plans/${id}`, { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load plan");
      setForm(toForm(data.plan));
      setInvoices(data.invoices || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load plan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) void load(); }, [id]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/subscription-plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(normalizePlanPayload(form)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to update plan");
      setForm(toForm(data.plan));
    } catch (err: any) {
      setError(err?.message || "Failed to update plan");
    } finally {
      setSubmitting(false);
    }
  }

  async function deletePlan() {
    if (!confirm(`Deactivate and delete "${form.name}"? Existing invoices remain for audit history.`)) return;
    const res = await fetch(`/api/subscription-plans/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error || "Failed to delete plan");
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
                  <h1 className="text-2xl font-bold text-foreground">Plan Details</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Edit pricing, entitlements, limits, and provisioning behavior.</p>
                </div>
                <button onClick={deletePlan} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600">
                  <Trash2 className="size-4" /> Delete
                </button>
              </div>
              {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              <form onSubmit={submit}>
                <PlanForm value={form} onChange={setForm} submitting={submitting} submitLabel="Save Changes" />
              </form>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-bold text-foreground">Recent Plan Invoices</h2>
              <div className="mt-4 space-y-3">
                {invoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices generated for this plan yet.</p>}
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="rounded-lg border border-border p-3 text-sm">
                    <p className="font-semibold text-foreground">{invoice.invoiceNumber}</p>
                    <p className="text-muted-foreground">{invoice.status} · {invoice.total} · due {new Date(invoice.dueAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
