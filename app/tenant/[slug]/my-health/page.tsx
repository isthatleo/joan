"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Activity, Flag, HeartPulse, PlusCircle, RefreshCw, ShieldAlert, ThermometerSun } from "lucide-react";

type HealthData = {
  latestVitals: { temperature?: string | null; bloodPressure?: string | null; heartRate?: string | null; respiratoryRate?: string | null; oxygenSaturation?: string | null; painScore?: number | null; recordedAt?: string | null; notes?: string | null } | null;
  vitalsHistory: Array<{ id: string; temperature?: string | null; bloodPressure?: string | null; heartRate?: string | null; oxygenSaturation?: string | null; recordedAt?: string | null }>;
  metrics: Array<{ key: string; label: string; value: string; unit: string; status: string }>;
  goals: Array<{ id: string; title: string; target: string; unit: string; current: string; deadline?: string | null; status: string }>;
  symptoms: Array<{ id: string; symptom: string; severity: number; notes?: string | null; recordedAt: string }>;
  allergies: string[];
  conditions: string[];
  currency: string;
};

export default function MyHealthPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: "", target: "", unit: "", current: "0", deadline: "" });
  const [symptomForm, setSymptomForm] = useState({ symptom: "", severity: 3, notes: "" });

  async function loadData(showSpinner = true) {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/patient/health`, { cache: "no-store", credentials: "include" });
      if (!response.ok) throw new Error("Failed to load health data");
      setData(await response.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
    const timer = window.setInterval(() => loadData(false), 20000);
    return () => window.clearInterval(timer);
  }, [slug]);

  async function addGoal() {
    if (!goalForm.title || !goalForm.target || !goalForm.unit) return;
    await fetch(`/api/tenant/${slug}/patient/health/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(goalForm),
    });
    setGoalForm({ title: "", target: "", unit: "", current: "0", deadline: "" });
    await loadData(false);
  }

  async function addSymptom() {
    if (!symptomForm.symptom) return;
    await fetch(`/api/tenant/${slug}/patient/health/symptoms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(symptomForm),
    });
    setSymptomForm({ symptom: "", severity: 3, notes: "" });
    await loadData(false);
  }

  const latest = data?.latestVitals;
  const cards = useMemo(() => [
    { label: "Temperature", value: latest?.temperature || "--", icon: ThermometerSun },
    { label: "Blood Pressure", value: latest?.bloodPressure || "--", icon: Activity },
    { label: "Heart Rate", value: latest?.heartRate || "--", icon: HeartPulse },
    { label: "Oxygen Saturation", value: latest?.oxygenSaturation || "--", icon: ShieldAlert },
  ], [latest]);

  if (loading || !data) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading health workspace...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">My Health</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Vitals, goals, and symptom tracking</h1>
          <p className="mt-2 text-sm text-muted-foreground">Updates here are fed from nurse-recorded vitals and your own health tracking entries.</p>
        </div>
        <button onClick={() => loadData()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
              </div>
              <div className="rounded-2xl bg-primary/10 p-3 text-primary"><card.icon className="h-5 w-5" /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Vital sign history</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground"><tr><th className="py-2">Recorded</th><th>Temperature</th><th>Blood Pressure</th><th>Heart Rate</th><th>SpO2</th></tr></thead>
                <tbody>
                  {data.vitalsHistory.map((vital) => (
                    <tr key={vital.id} className="border-t border-border">
                      <td className="py-3 text-foreground">{vital.recordedAt ? new Date(vital.recordedAt).toLocaleString() : "-"}</td>
                      <td>{vital.temperature || "-"}</td>
                      <td>{vital.bloodPressure || "-"}</td>
                      <td>{vital.heartRate || "-"}</td>
                      <td>{vital.oxygenSaturation || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Health goals</h2>
              <Flag className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input value={goalForm.title} onChange={(e) => setGoalForm((current) => ({ ...current, title: e.target.value }))} placeholder="Goal title" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
              <input value={goalForm.target} onChange={(e) => setGoalForm((current) => ({ ...current, target: e.target.value }))} placeholder="Target" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
              <input value={goalForm.unit} onChange={(e) => setGoalForm((current) => ({ ...current, unit: e.target.value }))} placeholder="Unit" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
              <input type="date" value={goalForm.deadline} onChange={(e) => setGoalForm((current) => ({ ...current, deadline: e.target.value }))} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </div>
            <button onClick={addGoal} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"><PlusCircle className="h-4 w-4" />Add goal</button>
            <div className="mt-4 space-y-3">
              {data.goals.length === 0 ? <p className="text-sm text-muted-foreground">No goals logged yet.</p> : data.goals.map((goal) => (
                <div key={goal.id} className="rounded-2xl border border-border bg-background p-4">
                  <p className="font-medium text-foreground">{goal.title}</p>
                  <p className="text-sm text-muted-foreground">Target: {goal.target} {goal.unit}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{goal.status}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Symptom log</h2>
            <div className="mt-4 space-y-3">
              <input value={symptomForm.symptom} onChange={(e) => setSymptomForm((current) => ({ ...current, symptom: e.target.value }))} placeholder="Symptom" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
              <select value={symptomForm.severity} onChange={(e) => setSymptomForm((current) => ({ ...current, severity: Number(e.target.value) }))} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                {[1,2,3,4,5].map((value) => <option key={value} value={value}>Severity {value}</option>)}
              </select>
              <textarea value={symptomForm.notes} onChange={(e) => setSymptomForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Notes" className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
              <button onClick={addSymptom} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Log symptom</button>
            </div>
            <div className="mt-4 space-y-3">
              {data.symptoms.length === 0 ? <p className="text-sm text-muted-foreground">No symptoms logged.</p> : data.symptoms.map((symptom) => (
                <div key={symptom.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{symptom.symptom}</p>
                    <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">Severity {symptom.severity}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{symptom.notes || "No notes added"}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{new Date(symptom.recordedAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Recorded risks</h2>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="font-medium text-foreground">Conditions</p>
                <p className="text-muted-foreground">{data.conditions.join(", ") || "No conditions recorded"}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Allergies</p>
                <p className="text-muted-foreground">{data.allergies.join(", ") || "No allergies recorded"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
