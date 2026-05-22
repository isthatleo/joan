"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/tenant/${slug}/accountant/billing/invoices/${id}`);
      if (res.ok) setForm(await res.json());
    };
    void load();
  }, [slug, id]);

  if (!form) return <div className="flex h-full items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/tenant/${slug}/accountant/billing/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Invoice updated");
      router.push(`/tenant/${slug}/accountant/billing/invoices/${id}`);
    } else {
      toast.error("Failed to update invoice");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/tenant/${slug}/accountant/billing/invoices/${id}`} className="rounded-lg border border-border p-2 hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Edit Invoice</p>
          <h1 className="text-3xl font-bold">Update invoice</h1>
        </div>
      </div>
      <div className="grid gap-4 rounded-xl border border-border bg-card p-6 md:grid-cols-2">
        <label className="space-y-2 text-sm"><span>Patient</span><input value={form.patientName || ""} readOnly className="h-10 w-full rounded-lg border border-border bg-muted px-3" /></label>
        <label className="space-y-2 text-sm"><span>Status</span><input value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-lg border border-border px-3" /></label>
        <label className="space-y-2 text-sm"><span>Total Amount</span><input type="number" value={form.totalAmount || 0} onChange={(e) => setForm({ ...form, totalAmount: Number(e.target.value) })} className="h-10 w-full rounded-lg border border-border px-3" /></label>
        <label className="space-y-2 text-sm"><span>Due Date</span><input type="date" value={form.dueDate ? new Date(form.dueDate).toISOString().slice(0, 10) : ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="h-10 w-full rounded-lg border border-border px-3" /></label>
        <label className="space-y-2 text-sm md:col-span-2"><span>Description</span><textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-24 w-full rounded-lg border border-border px-3 py-2" /></label>
        <label className="space-y-2 text-sm md:col-span-2"><span>Notes</span><textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-24 w-full rounded-lg border border-border px-3 py-2" /></label>
      </div>
      <button onClick={save} disabled={saving} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
    </div>
  );
}
