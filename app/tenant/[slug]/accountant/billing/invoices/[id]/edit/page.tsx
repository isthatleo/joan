"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

type InvoiceItem = { description: string; quantity?: number; unitPrice?: number; amount?: number; category?: string };

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const tenantPath = useTenantPath();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/tenant/${slug}/accountant/billing/invoices/${id}`);
      if (res.ok) {
        const data = await res.json();
        setForm(data);
        setItems(data.items?.length ? data.items : [{ description: data.description || "", quantity: 1, unitPrice: data.totalAmount || 0, category: "service" }]);
      }
    };
    void load();
  }, [slug, id]);

  const updateItem = (index: number, key: keyof InvoiceItem, value: string) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: key === "quantity" || key === "unitPrice" ? Number(value) : value } : item));
  };
  const addItem = () => setItems((current) => [...current, { description: "", quantity: 1, unitPrice: 0, category: "service" }]);
  const removeItem = (index: number) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const totalAmount = items.reduce((sum, item) => sum + Number(item.quantity || 1) * Number(item.unitPrice || item.amount || 0), 0);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/accountant/billing/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAmount,
          amountDue: Math.max(0, totalAmount - Number(form.paidAmount || 0)),
          status: form.status,
          dueDate: form.dueDate,
          description: form.description,
          notes: form.notes,
          paymentTerms: form.paymentTerms,
          items: items.filter((item) => item.description.trim() !== "").map((item) => ({
            ...item,
            amount: (Number(item.quantity || 1) * Number(item.unitPrice || item.amount || 0)).toFixed(2),
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to update invoice");
      toast.success("Invoice updated");
      router.push(tenantPath(`/accountant/billing/invoices/${id}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update invoice");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <div className="flex h-full items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={tenantPath(`/accountant/billing/invoices/${id}`)} className="rounded-lg border border-border p-2 hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Edit Invoice</p>
          <h1 className="text-3xl font-bold">Update invoice</h1>
        </div>
      </div>
      <div className="space-y-6 rounded-xl border border-border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm"><span>Patient</span><input value={form.patientName || ""} readOnly className="h-10 w-full rounded-lg border border-border bg-muted px-3" /></label>
          <label className="space-y-2 text-sm"><span>Status</span><select value={form.status || "draft"} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-lg border border-border px-3"><option value="draft">Draft</option><option value="sent">Sent</option><option value="viewed">Viewed</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select></label>
          <label className="space-y-2 text-sm"><span>Due Date</span><input type="date" value={form.dueDate ? new Date(form.dueDate).toISOString().slice(0, 10) : ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="h-10 w-full rounded-lg border border-border px-3" /></label>
          <label className="space-y-2 text-sm"><span>Payment Terms</span><input value={form.paymentTerms || ""} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} className="h-10 w-full rounded-lg border border-border px-3" /></label>
          <label className="space-y-2 text-sm md:col-span-2"><span>Description</span><textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-20 w-full rounded-lg border border-border px-3 py-2" /></label>
          <label className="space-y-2 text-sm md:col-span-2"><span>Notes</span><textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-20 w-full rounded-lg border border-border px-3 py-2" /></label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Invoice Items</h2><button type="button" onClick={addItem} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"><Plus className="size-4" />Add Item</button></div>
          {items.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-[2fr_100px_140px_140px_auto]">
              <input value={item.description || ""} onChange={(e) => updateItem(index, "description", e.target.value)} placeholder="Description" className="h-10 rounded-lg border border-border px-3" />
              <input type="number" min="1" value={item.quantity || 1} onChange={(e) => updateItem(index, "quantity", e.target.value)} className="h-10 rounded-lg border border-border px-3" />
              <input type="number" step="0.01" min="0" value={item.unitPrice || 0} onChange={(e) => updateItem(index, "unitPrice", e.target.value)} className="h-10 rounded-lg border border-border px-3" />
              <div className="flex items-center rounded-lg border border-border bg-muted px-3 text-sm font-semibold">${(Number(item.quantity || 1) * Number(item.unitPrice || 0)).toFixed(2)}</div>
              <button type="button" onClick={() => removeItem(index)} disabled={items.length === 1} className="rounded-lg border border-border p-2 hover:bg-muted disabled:opacity-50"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div className="text-sm text-muted-foreground">Updated invoice total</div>
        <div className="text-xl font-bold">${totalAmount.toFixed(2)}</div>
      </div>
      <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save Changes</button>
    </div>
  );
}
