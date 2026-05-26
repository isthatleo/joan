"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Pill, RefreshCw, RotateCcw } from "lucide-react";

type PrescriptionData = {
  prescriptions: Array<{
    id: string;
    medication?: string | null;
    genericName?: string | null;
    strength?: string | null;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    instructions?: string | null;
    status: string;
    diagnosis?: string | null;
    prescribedBy?: string | null;
    prescribedAt?: string | null;
    filledAt?: string | null;
    validUntil?: string | null;
    refillsRemaining: number;
    pharmacy?: string | null;
    notes?: string | null;
    items: Array<{ id: string; name?: string | null; strength?: string | null; dosage?: string | null; frequency?: string | null }>;
    administrations: Array<{ id: string; status: string; scheduledAt?: string | null; administeredAt?: string | null; notes?: string | null }>;
    refillRequest?: { status: string } | null;
  }>;
};

export default function PatientPrescriptionsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<PrescriptionData | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData(showSpinner = true) {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/patient/prescriptions`, { cache: "no-store", credentials: "include" });
      if (!response.ok) throw new Error("Failed to load prescriptions");
      setData(await response.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [slug]);

  async function requestRefill(id: string) {
    await fetch(`/api/tenant/${slug}/patient/prescriptions/${id}/refill`, { method: "POST", credentials: "include" });
    await loadData(false);
  }

  const prescriptions = useMemo(() => {
    const all = data?.prescriptions || [];
    return all.filter((item) =>
      tab === "active"
        ? !["completed", "discontinued", "expired"].includes(item.status)
        : ["completed", "discontinued", "expired"].includes(item.status)
    );
  }, [data?.prescriptions, tab]);

  if (loading || !data) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading prescriptions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Prescriptions</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Medication plan and refill tracking</h1>
          <p className="mt-2 text-sm text-muted-foreground">Doctor prescriptions, nurse administrations, and pharmacy updates flow through here.</p>
        </div>
        <button onClick={() => loadData()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <RefreshCw className={`mr-2 inline h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {(["active", "history"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${tab === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            {value === "active" ? "Active" : "History"}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {prescriptions.map((prescription) => (
          <div key={prescription.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <Pill className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{prescription.medication || "Medication"}</h2>
                    <p className="text-sm text-muted-foreground">{[prescription.dosage, prescription.frequency, prescription.duration].filter(Boolean).join(" | ") || "Schedule pending"}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  <p><span className="font-medium text-foreground">Prescriber:</span> {prescription.prescribedBy || "Doctor"}</p>
                  <p><span className="font-medium text-foreground">Diagnosis:</span> {prescription.diagnosis || "Not recorded"}</p>
                  <p><span className="font-medium text-foreground">Pharmacy:</span> {prescription.pharmacy || "Hospital pharmacy"}</p>
                  <p><span className="font-medium text-foreground">Refills left:</span> {prescription.refillsRemaining}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium capitalize text-primary">{prescription.status}</span>
                <button
                  onClick={() => requestRefill(prescription.id)}
                  disabled={prescription.refillRequest?.status === "pending" || prescription.refillsRemaining <= 0}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="mr-2 inline h-4 w-4" />
                  {prescription.refillRequest?.status === "pending" ? "Refill pending" : "Request refill"}
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-medium text-foreground">Medication items</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {(prescription.items.length
                    ? prescription.items
                    : [{ id: prescription.id, name: prescription.medication, strength: prescription.strength, dosage: prescription.dosage, frequency: prescription.frequency }]
                  ).map((item) => (
                    <div key={item.id} className="rounded-xl border border-border px-3 py-2">
                      {[item.name, item.strength, item.dosage, item.frequency].filter(Boolean).join(" | ")}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-medium text-foreground">Administration updates</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {prescription.administrations.length === 0 ? (
                    <p>No nursing administration updates logged yet.</p>
                  ) : (
                    prescription.administrations.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-border px-3 py-2">
                        <p className="font-medium capitalize text-foreground">{entry.status}</p>
                        <p>{entry.administeredAt ? new Date(entry.administeredAt).toLocaleString() : entry.scheduledAt ? `Scheduled ${new Date(entry.scheduledAt).toLocaleString()}` : "Timing unavailable"}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {prescriptions.length === 0 ? <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No prescriptions in this view.</div> : null}
      </div>
    </div>
  );
}
