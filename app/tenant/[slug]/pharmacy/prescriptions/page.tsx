"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, RefreshCw, Search, ShieldAlert, XCircle } from "lucide-react";
type PatientOption = { id: string; fullName: string; phone?: string | null; mrn?: string | null };
type InventoryOption = { id: string; name: string; genericName: string; dosage: string; stock: number; unitPrice: number };
type Prescription = { id: string; patientName: string; doctorName: string; patientId: string; status: string; priority: string; createdAt: string; billing?: { invoiceId: string; totalAmount: number; amountDue: number; paidAmount: number; currency: string; status: string; clearedForTakeHomeDispense: boolean } | null; medications: Array<{ medicationId: string; name: string; dosage: string; quantity: number; instructions: string }> };

type PrescriptionPayload = { prescriptions: Prescription[]; stats: { total: number; pending: number; dispensing: number; filled: number; partiallyFilled: number; urgent: number } };

export default function PharmacyPrescriptionsPage() {
  const [data, setData] = useState<PrescriptionPayload | null>(null);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [inventory, setInventory] = useState<InventoryOption[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ patientId: "", prescribedBy: "", priority: "routine", notes: "", medicationId: "", quantity: 1, instructions: "" });

  const fetchPage = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const [rxRes, patientsRes, medsRes] = await Promise.all([
        fetch(`/api/pharmacy/prescriptions?search=${encodeURIComponent(search)}&status=${status}&priority=${priority}`, { cache: "no-store" }),
        fetch("/api/pharmacy/patients", { cache: "no-store" }),
        fetch("/api/pharmacy/medications", { cache: "no-store" }),
      ]);
      if (rxRes.ok) setData(await rxRes.json());
      if (patientsRes.ok) setPatients((await patientsRes.json()).patients || []);
      if (medsRes.ok) setInventory(await medsRes.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPage();
  }, [status, priority]);

  const selectedMedication = useMemo(() => inventory.find((item) => item.id === form.medicationId) || null, [inventory, form.medicationId]);
  const formatCurrency = (value: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value || 0);

  const filteredPrescriptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.prescriptions || []).filter((item) =>
      !term ||
      item.patientName.toLowerCase().includes(term) ||
      item.doctorName.toLowerCase().includes(term) ||
      item.id.toLowerCase().includes(term) ||
      item.medications.some((med) => med.name.toLowerCase().includes(term))
    );
  }, [data, search]);

  const handleCreate = async () => {
    if (!form.patientId || !selectedMedication) return;
    setSubmitting(true);
    try {
      await fetch("/api/pharmacy/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: form.patientId,
          prescribedBy: form.prescribedBy || "Pharmacy intake",
          priority: form.priority,
          notes: form.notes,
          medications: [{
            medicationId: selectedMedication.id,
            name: selectedMedication.name,
            genericName: selectedMedication.genericName,
            dosage: selectedMedication.dosage,
            quantity: form.quantity,
            instructions: form.instructions,
          }],
        }),
      });
      setShowComposer(false);
      setForm({ patientId: "", prescribedBy: "", priority: "routine", notes: "", medicationId: "", quantity: 1, instructions: "" });
      await fetchPage(true);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, action: string) => {
    await fetch(`/api/pharmacy/prescriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await fetchPage(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Pharmacy Queue</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Prescriptions</h1>
          <p className="mt-2 text-sm text-muted-foreground">Validate, prioritise, and fulfil medication orders against live stock.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchPage(true)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
          <button onClick={() => setShowComposer((value) => !value)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" />New Prescription</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Total", data?.stats.total ?? 0],
          ["Pending", data?.stats.pending ?? 0],
          ["Dispensing", data?.stats.dispensing ?? 0],
          ["Urgent", data?.stats.urgent ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-border bg-card p-4 shadow-sm"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-semibold text-foreground">{value}</p></div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient, doctor, prescription, medication" className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none" />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"><option value="all">All statuses</option><option value="pending">Pending</option><option value="dispensing">Dispensing</option><option value="filled">Filled</option><option value="partially-filled">Partially filled</option><option value="cancelled">Cancelled</option></select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"><option value="all">All priorities</option><option value="routine">Routine</option><option value="urgent">Urgent</option></select>
        </div>
      </div>

      {showComposer && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <select value={form.patientId} onChange={(e) => setForm((s) => ({ ...s, patientId: e.target.value }))} className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"><option value="">Select patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName}</option>)}</select>
            <input value={form.prescribedBy} onChange={(e) => setForm((s) => ({ ...s, prescribedBy: e.target.value }))} placeholder="Prescriber name" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none" />
            <select value={form.medicationId} onChange={(e) => setForm((s) => ({ ...s, medicationId: e.target.value }))} className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"><option value="">Select medication</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.stock} in stock)</option>)}</select>
            <input type="number" min={1} value={form.quantity} onChange={(e) => setForm((s) => ({ ...s, quantity: Number(e.target.value) || 1 }))} className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none" />
            <select value={form.priority} onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))} className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"><option value="routine">Routine</option><option value="urgent">Urgent</option></select>
            <input value={form.instructions} onChange={(e) => setForm((s) => ({ ...s, instructions: e.target.value }))} placeholder="Instructions" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none md:col-span-2" />
            <input value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Pharmacy notes" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none md:col-span-2 xl:col-span-4" />
          </div>
          <div className="mt-4 flex justify-end gap-2"><button onClick={() => setShowComposer(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground">Close</button><button disabled={submitting || !form.patientId || !form.medicationId} onClick={handleCreate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{submitting ? "Saving..." : "Create"}</button></div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <tr><th className="px-4 py-3">Prescription</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Medications</th><th className="px-4 py-3">Billing</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></td></tr> : null}
              {!loading && filteredPrescriptions.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="px-4 py-4"><p className="font-medium text-foreground">#{item.id.slice(-6)}</p><p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p></td>
                  <td className="px-4 py-4"><p className="font-medium text-foreground">{item.patientName}</p><p className="text-xs text-muted-foreground">{item.doctorName}</p></td>
                  <td className="px-4 py-4"><div className="space-y-1">{item.medications.slice(0, 2).map((med) => <p key={med.medicationId} className="text-xs text-muted-foreground">{med.name} - {med.quantity} units</p>)}</div></td>
                  <td className="px-4 py-4"><div className="space-y-1 text-xs"><p className="font-medium text-foreground">Due {formatCurrency(item.billing?.amountDue ?? 0, item.billing?.currency || "USD")}</p><p className={`font-medium ${item.billing?.clearedForTakeHomeDispense ? "text-green-600" : "text-amber-600"}`}>{item.billing?.clearedForTakeHomeDispense ? "Cleared for take-home dispense" : "Checkout pending"}</p></div></td><td className="px-4 py-4"><div className="space-y-2"><span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">{item.status}</span>{item.priority === "urgent" ? <div className="flex items-center gap-1 text-xs text-red-500"><ShieldAlert className="h-3.5 w-3.5" />Urgent</div> : null}</div></td>
                  <td className="px-4 py-4"><div className="flex flex-wrap gap-2"><button onClick={() => updateStatus(item.id, "start-dispensing")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">Start</button><button disabled={!item.billing?.clearedForTakeHomeDispense} onClick={() => updateStatus(item.id, "fill")} className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-700 disabled:opacity-50 dark:text-green-300"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Fill</button><button onClick={() => updateStatus(item.id, "cancel")} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300"><XCircle className="mr-1 inline h-3.5 w-3.5" />Cancel</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
