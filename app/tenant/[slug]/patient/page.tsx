"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardGreeting } from "@/components/DashboardGreeting";
import { ProfileModeToggle } from "@/components/ProfileModeToggle";
import { useTenantPath } from "@/hooks/useTenantPath";
import { Activity, Calendar, CreditCard, HeartPulse, Microscope, Pill, RefreshCw, ShieldAlert, UserRound } from "lucide-react";

type DashboardData = {
  patient: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    mrn: string | null;
    dob: string | null;
    gender: string | null;
    address: string | null;
    allergies?: string[];
    conditions?: string[];
  };
  stats: {
    upcomingAppointments: number;
    activePrescriptions: number;
    outstandingInvoices: number;
    completedLabResults: number;
  };
  latestVitals: Array<{
    id: string;
    temperature?: string | null;
    bloodPressure?: string | null;
    heartRate?: string | null;
    oxygenSaturation?: string | null;
    recordedAt?: string | null;
  }>;
  latestVisit: { id: string; reason?: string | null; notes?: string | null; date?: string | null } | null;
  upcomingAppointments: Array<{ id: string; scheduledAt?: string | null; status: string; doctorName: string }>;
  activePrescriptions: Array<{ id: string; medication?: string | null; dosage?: string | null; frequency?: string | null; status?: string | null; prescribedAt?: string | null; prescribedBy?: string | null }>;
  recentLabResults: Array<{ id: string; testName?: string | null; status?: string | null; orderedAt?: string | null; hasResult: boolean }>;
  billing: { outstandingAmount: number; hasPaymentClearance: boolean; openInvoices: Array<{ id: string; description?: string | null; amountDue: number; dueDate?: string | null; status?: string | null }> };
  currency: string;
  hasGuardianRole?: boolean;
};

const currencyFormatter = (currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 });

export default function PatientDashboardPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const tenantPath = useTenantPath();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard(showSpinner = true) {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/patient/dashboard`, { cache: "no-store", credentials: "include" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to load patient dashboard");
      }
      setError(null);
      setData(await response.json());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load patient dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    const timer = window.setInterval(() => loadDashboard(false), 15000);
    return () => window.clearInterval(timer);
  }, [slug]);

  const money = useMemo(() => currencyFormatter(data?.currency || "USD"), [data?.currency]);

  function exportSummary() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `patient-dashboard-${slug}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading patient dashboard...</div>;
  }
  if (!data) {
    return <div className="flex h-full items-center justify-center text-sm text-destructive">{error || "Failed to load patient dashboard"}</div>;
  }

  const latestVitals = data.latestVitals[0];
  const stats = [
    { label: "Upcoming Visits", value: data.stats.upcomingAppointments, icon: Calendar, tone: "text-blue-600 bg-blue-500/10" },
    { label: "Active Medications", value: data.stats.activePrescriptions, icon: Pill, tone: "text-emerald-600 bg-emerald-500/10" },
    { label: "Outstanding Bills", value: data.stats.outstandingInvoices, icon: CreditCard, tone: "text-amber-600 bg-amber-500/10" },
    { label: "Lab Results Ready", value: data.stats.completedLabResults, icon: Microscope, tone: "text-violet-600 bg-violet-500/10" },
  ];

  return (
    <div className="space-y-6">
      <DashboardGreeting roleLabel={data.patient.name || "Patient"} />
      <ProfileModeToggle currentMode="patient" hasPatientRole hasGuardianRole={data.hasGuardianRole} />

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Patient Dashboard</p>
          <h1 className="text-3xl font-semibold text-foreground">Your Care Snapshot</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">This view refreshes from clinical, pharmacy, lab, and billing updates across the hospital.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportSummary} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">Export Summary</button>
          <button onClick={() => loadDashboard()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{stat.value}</p>
              </div>
              <div className={`rounded-2xl p-3 ${stat.tone}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Live Clinical Snapshot</h2>
                <p className="text-sm text-muted-foreground">Latest vital signs from nursing and current clinical context.</p>
              </div>
              <Link href={tenantPath("/my-health")} className="text-sm font-medium text-primary">Open My Health</Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground">Blood Pressure</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{latestVitals?.bloodPressure || "--"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground">Heart Rate</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{latestVitals?.heartRate || "--"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground">Temperature</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{latestVitals?.temperature || "--"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground">Oxygen Saturation</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{latestVitals?.oxygenSaturation || "--"}</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
              Latest visit: <span className="font-medium text-foreground">{data.latestVisit?.reason || "No recent visit recorded"}</span>
              {data.latestVisit?.date ? ` on ${new Date(data.latestVisit.date).toLocaleString()}` : ""}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Upcoming Appointments</h2>
                <Link href={tenantPath("/patient-portal/appointments")} className="text-sm font-medium text-primary">Manage</Link>
              </div>
              <div className="mt-4 space-y-3">
                {data.upcomingAppointments.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming appointments.</p> : data.upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="rounded-2xl border border-border bg-background p-4">
                    <p className="font-medium text-foreground">{appointment.doctorName}</p>
                    <p className="text-sm text-muted-foreground">{appointment.scheduledAt ? new Date(appointment.scheduledAt).toLocaleString() : "Pending schedule"}</p>
                    <p className="mt-2 inline-flex rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium capitalize text-blue-700 dark:text-blue-300">{appointment.status}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Medication Updates</h2>
                <Link href={tenantPath("/patient-portal/prescriptions")} className="text-sm font-medium text-primary">Open prescriptions</Link>
              </div>
              <div className="mt-4 space-y-3">
                {data.activePrescriptions.length === 0 ? <p className="text-sm text-muted-foreground">No active medications on file.</p> : data.activePrescriptions.map((prescription) => (
                  <div key={prescription.id} className="rounded-2xl border border-border bg-background p-4">
                    <p className="font-medium text-foreground">{prescription.medication || "Medication"}</p>
                    <p className="text-sm text-muted-foreground">{[prescription.dosage, prescription.frequency].filter(Boolean).join(" | ") || "Schedule not set"}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Prescribed by {prescription.prescribedBy || "Care team"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary"><UserRound className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Profile Summary</h2>
                <p className="text-sm text-muted-foreground">MRN {data.patient.mrn || "Pending"}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">Name:</span> {data.patient.name}</p>
              <p><span className="font-medium text-foreground">Email:</span> {data.patient.email || "Not provided"}</p>
              <p><span className="font-medium text-foreground">Phone:</span> {data.patient.phone || "Not provided"}</p>
              <p><span className="font-medium text-foreground">Conditions:</span> {data.patient.conditions?.join(", ") || "None recorded"}</p>
              <p><span className="font-medium text-foreground">Allergies:</span> {data.patient.allergies?.join(", ") || "None recorded"}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Billing and Lab Access</h2>
              <Link href={tenantPath("/patient-portal/billing")} className="text-sm font-medium text-primary">Go to billing</Link>
            </div>
            <p className="mt-2 text-3xl font-semibold text-foreground">{money.format(data.billing.outstandingAmount)}</p>
            <p className="mt-1 text-sm text-muted-foreground">Outstanding amount across current invoices.</p>
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-background p-4 text-sm">
              {data.billing.hasPaymentClearance ? (
                <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-300"><HeartPulse className="h-4 w-4" />Lab result download is enabled.</span>
              ) : (
                <span className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-300"><ShieldAlert className="h-4 w-4" />Some result downloads require cleared payment.</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-4 grid gap-3">
              <Link href={tenantPath("/patient-portal/appointments/book")} className="rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted">Book appointment</Link>
              <Link href={tenantPath("/patient-portal/results")} className="rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted">View lab results</Link>
              <Link href={tenantPath("/messages")} className="rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted">Message care team</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
