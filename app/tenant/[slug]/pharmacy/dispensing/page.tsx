"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, Search, Truck, XCircle } from "lucide-react";

type QueueItem = { id: string; prescriptionId: string; patientName: string; doctorName: string; status: string; priority: string; createdAt: string; billing?: { invoiceId: string; totalAmount: number; amountDue: number; paidAmount: number; currency: string; status: string; clearedForTakeHomeDispense: boolean } | null; medications: Array<{ medicationId: string; name: string; quantity: number; dispensed: number; dosage: string }> };
type QueuePayload = { queue: QueueItem[]; stats: { pending: number; inProgress: number; partial: number; dispensedToday: number } };

export default function PharmacyDispensingPage() {
  const [data, setData] = useState<QueuePayload | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueue = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch(`/api/pharmacy/dispensing?status=${status}&search=${encodeURIComponent(search)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load queue");
      setData(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchQueue(); }, [status]);

  const filteredQueue = (data?.queue || []).filter((item) => {
    const term = search.trim().toLowerCase();
    return !term || item.patientName.toLowerCase().includes(term) || item.prescriptionId.toLowerCase().includes(term);
  });
  const formatCurrency = (value: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value || 0);

  const act = async (prescriptionId: string, action: string) => {
    await fetch("/api/pharmacy/dispensing", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prescriptionId, action }) });
    await fetchQueue(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Fulfilment</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Dispensing Queue</h1>
          <p className="mt-2 text-sm text-muted-foreground">Start, complete, or partially dispense queued medication orders with stock-aware actions.</p>
        </div>
        <button onClick={() => fetchQueue(true)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[["Pending", data?.stats.pending ?? 0], ["In progress", data?.stats.inProgress ?? 0], ["Partial", data?.stats.partial ?? 0], ["Dispensed today", data?.stats.dispensedToday ?? 0]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-border bg-card p-4 shadow-sm"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-semibold text-foreground">{value}</p></div>)}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
          <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient or prescription" className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none" /></label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"><option value="all">All status</option><option value="pending">Pending</option><option value="dispensing">Dispensing</option><option value="partially-filled">Partial</option><option value="dispensed">Dispensed</option></select>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {loading ? <div className="col-span-full flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : null}
        {!loading && filteredQueue.map((item) => (
          <div key={item.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{item.patientName}</p>
                <p className="text-xs text-muted-foreground">Rx #{item.prescriptionId.slice(-6)} - {item.doctorName}</p>
              </div>
              <div className="flex items-center gap-2"><span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">{item.status}</span><span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">{item.priority}</span></div>
            </div>
            <div className="mt-4 space-y-3">
              {item.medications.map((med) => (
                <div key={med.medicationId} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-foreground">{med.name}</p><span className="text-xs text-muted-foreground">{med.dispensed}/{med.quantity} units</span></div>
                  <p className="mt-1 text-xs text-muted-foreground">{med.dosage}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-border bg-background p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Checkout</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {item.billing?.clearedForTakeHomeDispense ? "Cleared for take-home dispense" : `Outstanding ${formatCurrency(item.billing?.amountDue ?? 0, item.billing?.currency || "USD")}`}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => act(item.prescriptionId, "start")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">Start</button>
              <button disabled={!item.billing?.clearedForTakeHomeDispense} onClick={() => act(item.prescriptionId, "partial")} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 disabled:opacity-50 dark:text-amber-300"><Truck className="mr-1 inline h-3.5 w-3.5" />Partial</button>
              <button disabled={!item.billing?.clearedForTakeHomeDispense} onClick={() => act(item.prescriptionId, "complete")} className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-700 disabled:opacity-50 dark:text-green-300"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Complete</button>
              <button onClick={() => act(item.prescriptionId, "reject")} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300"><XCircle className="mr-1 inline h-3.5 w-3.5" />Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
