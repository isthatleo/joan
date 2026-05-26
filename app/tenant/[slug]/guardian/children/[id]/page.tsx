"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CalendarDays, FileText, FlaskConical, Phone, Save, Shield, Syringe, Trash2 } from "lucide-react";

type ChildDetail = {
  child: {
    id: string;
    fullName: string;
    age: number;
    gender: string;
    email: string;
    phone: string;
    address: string;
    allergies: string[];
    conditions: string[];
    healthStatus: string;
    outstandingAmount: number;
  };
  permissions: {
    canViewRecords: boolean;
    canSchedule: boolean;
    emergencyContact: boolean;
  };
  latestVisit?: { reason?: string | null; notes?: string | null; createdAt?: string | null } | null;
  latestVitals?: { temperature?: string | null; bloodPressure?: string | null; heartRate?: string | null; recordedAt?: string | null } | null;
  upcomingAppointments: Array<{ id: string; scheduledAt?: string | null; status: string }>;
  prescriptions: Array<{ id: string; medication?: string | null; dosage?: string | null; status?: string | null }>;
  labOrders: Array<{ id: string; testName?: string | null; status?: string | null }>;
};

export default function GuardianChildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const id = params?.id as string;
  const [data, setData] = useState<ChildDetail | null>(null);
  const [permissions, setPermissions] = useState({ canViewRecords: true, canSchedule: true, emergencyContact: false });
  const [saving, setSaving] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    const response = await fetch(`/api/tenant/${slug}/guardian/children/${id}`, { cache: "no-store", credentials: "include" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || "Failed to load child profile");
    setData(payload);
    setPermissions(payload.permissions);
  }

  useEffect(() => {
    loadProfile().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Failed to load child profile"));
  }, [id, slug]);

  async function savePermissions() {
    setSaving(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/guardian/children/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(permissions),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to update permissions");
      setMessage("Child permissions updated");
      setError(null);
      await loadProfile();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update permissions");
    } finally {
      setSaving(false);
    }
  }

  async function unlinkChild() {
    if (!window.confirm("Unlink this child profile from the guardian dashboard?")) return;
    setUnlinking(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/guardian/children/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to unlink child");
      router.push(`/tenant/${slug}/guardian/children`);
      router.refresh();
    } catch (unlinkError) {
      setError(unlinkError instanceof Error ? unlinkError.message : "Failed to unlink child");
    } finally {
      setUnlinking(false);
    }
  }

  if (!data && !error) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading child profile...</div>;
  if (!data) return <div className="flex h-full items-center justify-center text-sm text-destructive">{error || "Failed to load child profile"}</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <Link href={`/tenant/${slug}/guardian/children`} className="text-sm font-medium text-muted-foreground hover:text-foreground">Back to children</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">{data.child.fullName}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{data.child.gender} - Age {data.child.age} - {data.child.healthStatus}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/tenant/${slug}/guardian/book?child=${id}`} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <CalendarDays className="mr-2 inline h-4 w-4" />
              Book Appointment
            </Link>
            <Link href={`/tenant/${slug}/guardian/records?childId=${id}`} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
              <FileText className="mr-2 inline h-4 w-4" />
              Records
            </Link>
            <Link href={`/tenant/${slug}/guardian/lab-results?childId=${id}`} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
              <FlaskConical className="mr-2 inline h-4 w-4" />
              Results
            </Link>
            <Link href={`/tenant/${slug}/guardian/vaccinations?childId=${id}`} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
              <Syringe className="mr-2 inline h-4 w-4" />
              Vaccinations
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Outstanding</p><p className="mt-2 text-2xl font-semibold text-foreground">{data.child.outstandingAmount.toFixed(2)}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Allergies</p><p className="mt-2 text-2xl font-semibold text-foreground">{data.child.allergies.length}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Prescriptions</p><p className="mt-2 text-2xl font-semibold text-foreground">{data.prescriptions.length}</p></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Lab orders</p><p className="mt-2 text-2xl font-semibold text-foreground">{data.labOrders.length}</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Latest visit</h2>
              <p className="mt-3 text-sm text-foreground">{data.latestVisit?.reason || "No recorded visit"}</p>
              <p className="mt-2 text-sm text-muted-foreground">{data.latestVisit?.notes || "No notes"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Latest vitals</h2>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>Temperature: {data.latestVitals?.temperature || "-"}</p>
                <p>Blood Pressure: {data.latestVitals?.bloodPressure || "-"}</p>
                <p>Heart Rate: {data.latestVitals?.heartRate || "-"}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Upcoming appointments</h2>
              <div className="mt-3 space-y-3">
                {data.upcomingAppointments.length ? data.upcomingAppointments.map((item) => (
                  <Link key={item.id} href={`/tenant/${slug}/guardian/appointments`} className="block rounded-xl border border-border bg-background p-3 text-sm text-foreground hover:bg-muted/60">
                    {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "Pending"} - {item.status}
                  </Link>
                )) : <p className="text-sm text-muted-foreground">No upcoming appointments.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Prescriptions</h2>
              <div className="mt-3 space-y-3">
                {data.prescriptions.length ? data.prescriptions.map((item) => (
                  <Link key={item.id} href={`/tenant/${slug}/guardian/records?childId=${id}`} className="block rounded-xl border border-border bg-background p-3 text-sm text-foreground hover:bg-muted/60">
                    {item.medication || "Medication"} - {item.dosage || ""}
                  </Link>
                )) : <p className="text-sm text-muted-foreground">No prescriptions.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Lab orders</h2>
              <div className="mt-3 space-y-3">
                {data.labOrders.length ? data.labOrders.map((item) => (
                  <Link key={item.id} href={`/tenant/${slug}/guardian/lab-results`} className="block rounded-xl border border-border bg-background p-3 text-sm text-foreground hover:bg-muted/60">
                    {item.testName || "Lab order"} - {item.status || "pending"}
                  </Link>
                )) : <p className="text-sm text-muted-foreground">No lab orders.</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Guardian permissions</h2>
            </div>
            <div className="mt-4 space-y-4">
              <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
                <input type="checkbox" checked={permissions.canViewRecords} onChange={(event) => setPermissions((current) => ({ ...current, canViewRecords: event.target.checked }))} className="mt-1" />
                <div><p className="font-medium text-foreground">View records</p><p className="text-sm text-muted-foreground">Access clinical history, results, and prescriptions.</p></div>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
                <input type="checkbox" checked={permissions.canSchedule} onChange={(event) => setPermissions((current) => ({ ...current, canSchedule: event.target.checked }))} className="mt-1" />
                <div><p className="font-medium text-foreground">Manage appointments</p><p className="text-sm text-muted-foreground">Book and reschedule visits for this child.</p></div>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
                <input type="checkbox" checked={permissions.emergencyContact} onChange={(event) => setPermissions((current) => ({ ...current, emergencyContact: event.target.checked }))} className="mt-1" />
                <div><p className="font-medium text-foreground">Emergency contact</p><p className="text-sm text-muted-foreground">Use this guardian as emergency contact for this child.</p></div>
              </label>
            </div>
            {message ? <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{message}</p> : null}
            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
            <button onClick={savePermissions} disabled={saving} className="mt-6 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
              <Save className="mr-2 inline h-4 w-4" />
              {saving ? "Saving..." : "Save permissions"}
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Contact details</h2>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>Email: {data.child.email || "-"}</p>
              <p>Phone: {data.child.phone || "-"}</p>
              <p>Address: {data.child.address || "-"}</p>
            </div>
            <div className="mt-4 flex gap-2">
              {data.child.phone ? <a href={`tel:${data.child.phone}`} className="flex-1 rounded-xl border border-border px-3 py-2 text-center text-sm font-medium text-foreground hover:bg-muted"><Phone className="mr-2 inline h-4 w-4" />Call</a> : null}
              {data.child.email ? <a href={`mailto:${data.child.email}`} className="flex-1 rounded-xl border border-border px-3 py-2 text-center text-sm font-medium text-foreground hover:bg-muted">Email</a> : null}
            </div>
            <button onClick={unlinkChild} disabled={unlinking} className="mt-4 w-full rounded-xl border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50">
              <Trash2 className="mr-2 inline h-4 w-4" />
              {unlinking ? "Removing..." : "Remove child from guardian profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
