"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

type Supplier = { id: string; name: string; email?: string | null; phone?: string | null; contactPerson?: string | null; address?: string | null; rating?: number | null; inventoryItems?: number; active?: boolean };
type SupplierPayload = { suppliers: Supplier[]; stats: { total: number; active: number; ratedHigh: number } };

export default function PharmacySuppliersPage() {
  const [data, setData] = useState<SupplierPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", contactPerson: "", email: "", phone: "", address: "", rating: 4, notes: "" });

  const fetchSuppliers = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch("/api/pharmacy/suppliers", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load suppliers");
      setData(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const createSupplier = async () => {
    await fetch("/api/pharmacy/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false);
    setForm({ name: "", contactPerson: "", email: "", phone: "", address: "", rating: 4, notes: "" });
    await fetchSuppliers(true);
  };

  const remove = async (id: string) => {
    await fetch("/api/pharmacy/suppliers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await fetchSuppliers(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Procurement</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Suppliers</h1>
          <p className="mt-2 text-sm text-muted-foreground">Maintain the vendor roster that supports replenishment, stock alerts, and sourcing decisions.</p>
        </div>
        <div className="flex gap-2"><button onClick={() => fetchSuppliers(true)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button><button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" />Add Supplier</button></div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[["Total suppliers", data?.stats.total ?? 0], ["Active suppliers", data?.stats.active ?? 0], ["Highly rated", data?.stats.ratedHigh ?? 0]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-border bg-card p-4 shadow-sm"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-semibold text-foreground">{value}</p></div>)}
      </div>

      {showForm ? <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Supplier name" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none" /><input value={form.contactPerson} onChange={(e) => setForm((s) => ({ ...s, contactPerson: e.target.value }))} placeholder="Contact person" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none" /><input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} placeholder="Email" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none" /><input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} placeholder="Phone" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none" /><input value={form.address} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} placeholder="Address" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none md:col-span-2" /><input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm((s) => ({ ...s, rating: Number(e.target.value) || 4 }))} className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none" /></div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground">Close</button><button onClick={createSupplier} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save supplier</button></div></div> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {loading ? <div className="col-span-full py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></div> : data?.suppliers.map((supplier) => (
          <div key={supplier.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><p className="font-medium text-foreground">{supplier.name}</p></div><p className="mt-1 text-xs text-muted-foreground">{supplier.contactPerson || "No contact recorded"}</p></div><button onClick={() => remove(supplier.id)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Delete</button></div>
            <div className="mt-4 grid gap-2 text-xs text-muted-foreground"><div>Email: {supplier.email || "-"}</div><div>Phone: {supplier.phone || "-"}</div><div>Inventory items linked: {supplier.inventoryItems || 0}</div><div>Rating: {supplier.rating || "-"}/5</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
