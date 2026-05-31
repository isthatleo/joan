"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

type InventoryItem = { id: string; name: string; genericName: string; category: string; dosage: string; stock: number; minStock: number; maxStock: number; supplier: string; supplierId?: string | null; unitPrice: number; expiryDate: string | null; batchNumber: string; location: string; status: string };
type Supplier = { id: string; name: string };

type InventoryPayload = { items: InventoryItem[]; stats: { total: number; lowStock: number; outOfStock: number; expired: number; inventoryValue: number }; suppliers: Supplier[] };

const initialForm = { id: "", name: "", genericName: "", category: "General", dosage: "Standard", stock: 0, minStock: 10, maxStock: 50, supplierId: "", supplier: "", unitPrice: 0, expiryDate: "", batchNumber: "", location: "Main pharmacy store", reorderLevel: 10, notes: "" };

export default function PharmacyInventoryPage() {
  const [data, setData] = useState<InventoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const fetchInventory = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch(`/api/pharmacy/inventory?search=${encodeURIComponent(search)}&status=${status}&category=${encodeURIComponent(category)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load inventory");
      setData(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchInventory(); }, [status, category]);

  const categories = useMemo(() => Array.from(new Set((data?.items || []).map((item) => item.category))), [data]);

  const submitForm = async () => {
    setSaving(true);
    try {
      const method = form.id ? "PATCH" : "POST";
      const url = form.id ? `/api/pharmacy/inventory/${form.id}` : "/api/pharmacy/inventory";
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setShowForm(false);
      setForm(initialForm);
      await fetchInventory(true);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/pharmacy/inventory/${id}`, { method: "DELETE" });
    await fetchInventory(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Inventory Control</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Pharmacy Inventory</h1>
          <p className="mt-2 text-sm text-muted-foreground">Live stock, expiry risk, supplier attribution, and fast item maintenance.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchInventory(true)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
          <button onClick={() => { setForm(initialForm); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" />Add Medication</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {[
          ["Total items", data?.stats.total ?? 0],
          ["Low stock", data?.stats.lowStock ?? 0],
          ["Out of stock", data?.stats.outOfStock ?? 0],
          ["Expired", data?.stats.expired ?? 0],
          ["Inventory value", `$${(data?.stats.inventoryValue ?? 0).toFixed(2)}`],
        ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-border bg-card p-4 shadow-sm"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-semibold text-foreground">{value}</p></div>)}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medication" className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none" /></label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"><option value="all">All status</option><option value="in-stock">In stock</option><option value="low-stock">Low stock</option><option value="out-of-stock">Out of stock</option><option value="expired">Expired</option></select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        </div>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["name", "Medication name"], ["genericName", "Generic name"], ["category", "Category"], ["dosage", "Dosage"], ["batchNumber", "Batch number"], ["location", "Location"], ["supplier", "Supplier name"], ["expiryDate", "Expiry date"],
            ].map(([key, label]) => <input key={String(key)} type={key === "expiryDate" ? "date" : "text"} value={(form as any)[key]} onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))} placeholder={String(label)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none" />)}
            {["stock", "minStock", "maxStock", "unitPrice", "reorderLevel"].map((key) => <input key={key} type="number" value={(form as any)[key]} onChange={(e) => setForm((s) => ({ ...s, [key]: Number(e.target.value) || 0 }))} placeholder={key} className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none" />)}
          </div>
          <div className="mt-4 flex justify-end gap-2"><button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground">Close</button><button disabled={saving || !form.name} onClick={submitForm} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{saving ? "Saving..." : form.id ? "Update" : "Create"}</button></div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground"><tr><th className="px-4 py-3">Medication</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-border">
              {loading ? <tr><td colSpan={5} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></td></tr> : null}
              {!loading && data?.items.filter((item) => !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.genericName.toLowerCase().includes(search.toLowerCase())).map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4"><p className="font-medium text-foreground">{item.name}</p><p className="text-xs text-muted-foreground">{item.genericName} - {item.category}</p></td>
                  <td className="px-4 py-4"><p className="font-medium text-foreground">{item.stock}</p><p className="text-xs text-muted-foreground">Min {item.minStock} / Max {item.maxStock}</p></td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{item.supplier}</td>
                  <td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${item.status === "low-stock" || item.status === "out-of-stock" ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" : item.status === "expired" ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" : "border-border text-muted-foreground"}`}>{item.status}</span></td>
                  <td className="px-4 py-4"><div className="flex flex-wrap gap-2"><button onClick={() => { setForm({ ...initialForm, ...item, supplierId: item.supplierId || "", expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : "" }); setShowForm(true); }} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground"><Pencil className="mr-1 inline h-3.5 w-3.5" />Edit</button><button onClick={() => deleteItem(item.id)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Delete</button>{item.status !== "in-stock" ? <span className="inline-flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="h-3.5 w-3.5" />Needs attention</span> : null}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
