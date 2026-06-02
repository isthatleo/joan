"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, Loader2, Plus, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";

type InteractionRule = { id: string; medicationA: string; medicationB: string; severity: string; effect: string; recommendation: string; active?: boolean };
type InteractionPayload = { interactions: InteractionRule[]; activeRisks: Array<{ id: string; patientName: string; severity: string; effect: string; recommendation: string; medications: string[] }>; stats: { configuredRules: number; criticalRules: number; activeRisks: number; severeActiveRisks: number } };

export default function PharmacyDrugInteractionsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<InteractionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ medicationA: "", medicationB: "", severity: "moderate", effect: "", recommendation: "", source: "" });
  const [error, setError] = useState<string | null>(null); // Add state for error message

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError(null); // Clear previous errors
    try {
      const res = await fetch(`/api/tenant/${slug}/pharmacy/drug-interactions`, { cache: "no-store" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to load interactions");
      }
      setData(await res.json());
    } catch (fetchError: any) { // Catch the error and set it
      setError(fetchError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { if (slug) fetchData(); }, [slug]);

  const submit = async () => {
    await fetch(`/api/tenant/${slug}/pharmacy/drug-interactions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false);
    setForm({ medicationA: "", medicationB: "", severity: "moderate", effect: "", recommendation: "", source: "" });
    await fetchData(true);
  };

  const remove = async (id: string) => {
    await fetch(`/api/tenant/${slug}/pharmacy/drug-interactions`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await fetchData(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Medication Safety</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Drug Interactions</h1>
          <p className="mt-2 text-sm text-muted-foreground">Maintain the tenant interaction ruleset and review live risks against active prescriptions.</p>
        </div>
        <div className="flex gap-2"><button onClick={() => fetchData(true)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button><button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" />Add Rule</button></div>
      </div>

      {error && ( // Display API errors here
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {[["Configured", data?.stats.configuredRules ?? 0], ["Critical rules", data?.stats.criticalRules ?? 0], ["Active risks", data?.stats.activeRisks ?? 0], ["Severe risks", data?.stats.severeActiveRisks ?? 0]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-border bg-card p-4 shadow-sm"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-semibold text-foreground">{value}</p></div>)}
      </div>

      {showForm ? <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><input value={form.medicationA} onChange={(e) => setForm((s) => ({ ...s, medicationA: e.target.value }))} placeholder="Medication A" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none" /><input value={form.medicationB} onChange={(e) => setForm((s) => ({ ...s, medicationB: e.target.value }))} placeholder="Medication B" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none" /><select value={form.severity} onChange={(e) => setForm((s) => ({ ...s, severity: e.target.value }))} className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"><option value="minor">Minor</option><option value="moderate">Moderate</option><option value="major">Major</option><option value="contraindicated">Contraindicated</option></select><input value={form.effect} onChange={(e) => setForm((s) => ({ ...s, effect: e.target.value }))} placeholder="Clinical effect" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none md:col-span-2" /><input value={form.recommendation} onChange={(e) => setForm((s) => ({ ...s, recommendation: e.target.value }))} placeholder="Recommendation" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none md:col-span-2 xl:col-span-3" /></div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground">Close</button><button onClick={submit} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save rule</button></div></div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold text-foreground">Configured Rules</h2></div><div className="mt-4 space-y-3">{loading ? <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></div> : data?.interactions.map((item) => <div key={item.id} className="rounded-xl border border-border bg-background p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-foreground">{item.medicationA} + {item.medicationB}</p><p className="mt-1 text-xs text-muted-foreground">{item.effect}</p><p className="mt-2 text-xs text-muted-foreground">{item.recommendation}</p></div><button onClick={() => remove(item.id)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Delete</button></div></div>)}</div></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold text-foreground">Live Risk Matches</h2></div><div className="mt-4 space-y-3">{loading ? <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></div> : data?.activeRisks.length ? data.activeRisks.map((risk) => <div key={risk.id} className="rounded-xl border border-border bg-background p-4"><p className="font-medium text-foreground">{risk.patientName}</p><p className="mt-1 text-xs text-muted-foreground">{risk.medications.join(" + ")}</p><p className="mt-2 text-sm text-foreground">{risk.effect}</p><p className="mt-2 text-xs text-muted-foreground">{risk.recommendation}</p></div>) : <p className="text-sm text-muted-foreground">No active interaction matches.</p>}</div></div>
      </div>
    </div>
  );
}