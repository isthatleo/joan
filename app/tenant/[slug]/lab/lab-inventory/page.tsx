"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { withTenantPrefix } from "@/lib/tenant-routing";
import { AlertTriangle, ArrowLeft, Boxes, Loader2, Pencil, Plus, RefreshCw, Search } from "lucide-react";

export default function LabInventoryPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const path = (value: string) => withTenantPrefix(value, slug, hostname);
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, lowStock: 0, expiringSoon: 0, inStock: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [draft, setDraft] = useState<any>({ id: "", name: "", quantity: 0, expiryDate: "" });
  const [open, setOpen] = useState(false);

  const load = async (soft = false) => {
    soft ? setRefreshing(true) : setLoading(true);
    try {
      const res = await fetch(`/api/lab/inventory?slug=${slug}`, { cache: "no-store" });
      const payload = res.ok ? await res.json() : { items: [], stats: {} };
      setItems(Array.isArray(payload?.items) ? payload.items : []);
      setStats(payload?.stats || {});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [slug]);

  const submit = async () => {
    const endpoint = draft.id ? `/api/lab/inventory/${draft.id}` : `/api/lab/inventory`;
    const method = draft.id ? "PATCH" : "POST";
    const res = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, slug }) });
    if (res.ok) {
      setOpen(false);
      setDraft({ id: "", name: "", quantity: 0, expiryDate: "" });
      await load(true);
    }
  };

  const filtered = useMemo(() => items.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch = String(item.name || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || String(item.status || "") === statusFilter || String(item.expiryStatus || "") === statusFilter;
    return matchesSearch && matchesStatus;
  }), [items, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><Link href={path("/lab")} className="mb-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link><h1 className="text-3xl font-bold text-foreground">Inventory</h1><p className="mt-1 text-sm text-muted-foreground">Supply coverage, expiry watch, and direct stock updates.</p></div><div className="flex gap-2"><button onClick={() => load(true)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button><button onClick={() => { setDraft({ id: "", name: "", quantity: 0, expiryDate: "" }); setOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" />Add Item</button></div></div>
      <div className="grid gap-4 md:grid-cols-4">{[["Total Items", stats.total], ["Low Stock", stats.lowStock], ["Expiring Soon", stats.expiringSoon], ["Healthy Stock", stats.inStock]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold text-foreground">{value || 0}</p></div>)}</div>
      <div className="rounded-2xl border border-border bg-card p-4"><div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search inventory" className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm" /></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="all">All status</option><option value="ok">Healthy</option><option value="low">Low stock</option><option value="expiring">Expiring</option></select></div></div>
      {stats.lowStock > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5" /><div><p className="font-medium">Stock attention required</p><p className="text-sm opacity-80">{stats.lowStock} inventory items need replenishment planning.</p></div></div></div>}
      <div className="overflow-hidden rounded-2xl border border-border bg-card"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Reorder</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></td></tr> : filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No inventory items found.</td></tr> : filtered.map((item) => <tr key={item.id} className="border-t border-border"><td className="px-4 py-3"><p className="font-medium text-foreground">{item.name}</p><p className="text-xs text-muted-foreground">{item.location}</p></td><td className="px-4 py-3 text-foreground">{item.quantity}</td><td className="px-4 py-3 text-foreground">{item.reorderLevel}</td><td className="px-4 py-3 text-foreground">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "-"}</td><td className="px-4 py-3"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{item.expiryStatus === "expiring" ? "expiring" : item.status}</span></td><td className="px-4 py-3"><button onClick={() => { setDraft({ id: item.id, name: item.name, quantity: item.quantity, expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0,10) : "" }); setOpen(true); }} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"><Pencil className="h-3.5 w-3.5" />Update</button></td></tr>)}</tbody></table></div></div>
      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6"><h2 className="text-xl font-semibold text-foreground">{draft.id ? "Update item" : "Add inventory item"}</h2><div className="mt-4 grid gap-4"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Item name" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" /><input type="number" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} placeholder="Quantity" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" /><input type="date" value={draft.expiryDate} onChange={(e) => setDraft({ ...draft, expiryDate: e.target.value })} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" /></div><div className="mt-6 flex justify-end gap-3"><button onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button><button onClick={submit} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save</button></div></div></div>}
    </div>
  );
}
