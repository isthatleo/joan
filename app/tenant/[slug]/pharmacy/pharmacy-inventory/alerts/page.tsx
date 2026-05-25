"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2, RefreshCw, ShoppingCart, XCircle } from "lucide-react";

type AlertItem = { id: string; medicationName: string; supplier: string; type: string; severity: string; status: string; stock: number; minStock: number; expiryDate: string | null; daysToExpiry: number | null };
type AlertPayload = { alerts: AlertItem[]; stats: { total: number; open: number; reorderRequested: number; critical: number } };

export default function PharmacyStockAlertsPage() {
  const [data, setData] = useState<AlertPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch("/api/pharmacy/alerts", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load alerts");
      setData(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const act = async (itemId: string, action: string) => {
    await fetch("/api/pharmacy/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, action }) });
    await fetchAlerts(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Inventory Risk</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Stock Alerts</h1>
          <p className="mt-2 text-sm text-muted-foreground">Monitor low stock, expiry exposure, and reorder follow-up from live inventory data.</p>
        </div>
        <button onClick={() => fetchAlerts(true)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[["Total alerts", data?.stats.total ?? 0], ["Open", data?.stats.open ?? 0], ["Reorder requested", data?.stats.reorderRequested ?? 0], ["Critical", data?.stats.critical ?? 0]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-border bg-card p-4 shadow-sm"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-semibold text-foreground">{value}</p></div>)}
      </div>

      <div className="space-y-4">
        {loading ? <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></div> : data?.alerts.map((alert) => (
          <div key={alert.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><BellRing className="h-4 w-4 text-primary" /><p className="font-medium text-foreground">{alert.medicationName}</p></div>
                <p className="mt-1 text-xs text-muted-foreground">Supplier: {alert.supplier}</p>
                <p className="mt-1 text-xs text-muted-foreground">Type: {alert.type} - severity: {alert.severity}</p>
              </div>
              <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">{alert.status}</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3 text-xs text-muted-foreground"><div>Stock: {alert.stock}</div><div>Minimum target: {alert.minStock}</div><div>{alert.daysToExpiry !== null ? `Expires in ${alert.daysToExpiry} days` : alert.expiryDate ? `Expiry ${alert.expiryDate}` : "No expiry recorded"}</div></div>
            <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => act(alert.id, "reorder")} className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300"><ShoppingCart className="mr-1 inline h-3.5 w-3.5" />Reorder</button><button onClick={() => act(alert.id, "dismiss")} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300"><XCircle className="mr-1 inline h-3.5 w-3.5" />Dismiss</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}
