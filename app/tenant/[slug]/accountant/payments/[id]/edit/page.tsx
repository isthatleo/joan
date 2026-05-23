"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

export default function EditPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const tenantPath = useTenantPath();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/tenant/${slug}/accountant/payments/${id}`);
      if (res.ok) setForm(await res.json());
    };
    void load();
  }, [slug, id]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(form.amount || 0),
          method: form.method,
          status: form.status,
          transactionId: form.transactionId,
          notes: form.notes,
          fee: Number(form.fee || 0),
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update payment");
      }

      toast.success("Payment updated");
      router.push(tenantPath(`/accountant/payments/${id}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update payment");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <div className="flex h-full items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={tenantPath(`/accountant/payments/${id}`)} className="rounded-lg border border-border p-2 hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Edit Payment</p>
          <h1 className="text-3xl font-bold">Update payment</h1>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-border bg-card p-6 md:grid-cols-2">
        <label className="space-y-2 text-sm"><span>Patient</span><input value={form.patientName || ""} readOnly className="h-10 w-full rounded-lg border border-border bg-muted px-3" /></label>
        <label className="space-y-2 text-sm"><span>Invoice</span><input value={form.invoiceNumber || form.invoiceId || ""} readOnly className="h-10 w-full rounded-lg border border-border bg-muted px-3" /></label>
        <label className="space-y-2 text-sm"><span>Amount</span><input type="number" step="0.01" value={form.amount || 0} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-10 w-full rounded-lg border border-border px-3" /></label>
        <label className="space-y-2 text-sm"><span>Fee</span><input type="number" step="0.01" value={form.fee || 0} onChange={(e) => setForm({ ...form, fee: e.target.value })} className="h-10 w-full rounded-lg border border-border px-3" /></label>
        <label className="space-y-2 text-sm"><span>Method</span><select value={form.method || "credit_card"} onChange={(e) => setForm({ ...form, method: e.target.value })} className="h-10 w-full rounded-lg border border-border px-3"><option value="credit_card">Credit Card</option><option value="bank_transfer">Bank Transfer</option><option value="cash">Cash</option><option value="insurance">Insurance</option><option value="check">Check</option><option value="mobile_money">Mobile Money</option><option value="other">Other</option></select></label>
        <label className="space-y-2 text-sm"><span>Status</span><select value={form.status || "pending"} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-lg border border-border px-3"><option value="pending">Pending</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select></label>
        <label className="space-y-2 text-sm md:col-span-2"><span>Transaction ID</span><input value={form.transactionId || ""} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} className="h-10 w-full rounded-lg border border-border px-3" /></label>
        <label className="space-y-2 text-sm md:col-span-2"><span>Notes</span><textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-24 w-full rounded-lg border border-border px-3 py-2" /></label>
      </div>

      <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save Changes
      </button>
    </div>
  );
}
