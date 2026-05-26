"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTenantPath } from "@/hooks/useTenantPath";
import { CalendarDays, Save } from "lucide-react";

type OptionsData = { doctors: Array<{ id: string; name: string; email: string }>; appointmentTypes: string[] };
type AppointmentData = { appointments: Array<{ id: string; doctorId?: string | null; appointmentType: string; reason: string; notes: string; scheduledAt?: string | null }> };

export default function PatientBookAppointmentPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const tenantPath = useTenantPath();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const [options, setOptions] = useState<OptionsData>({ doctors: [], appointmentTypes: [] });
  const [form, setForm] = useState({ doctorId: "", appointmentType: "Consultation", scheduledAt: "", reason: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [optionsRes, appointmentsRes] = await Promise.all([
        fetch(`/api/tenant/${slug}/patient/appointments/options`, { cache: "no-store", credentials: "include" }),
        fetch(`/api/tenant/${slug}/patient/appointments`, { cache: "no-store", credentials: "include" }),
      ]);
      const optionsData = optionsRes.ok ? await optionsRes.json() : { doctors: [], appointmentTypes: [] };
      setOptions(optionsData);
      if (appointmentId && appointmentsRes.ok) {
        const appointmentsData = (await appointmentsRes.json()) as AppointmentData;
        const existing = appointmentsData.appointments.find((item) => item.id === appointmentId);
        if (existing) {
          setForm({
            doctorId: existing.doctorId || "",
            appointmentType: existing.appointmentType || "Consultation",
            scheduledAt: existing.scheduledAt ? new Date(existing.scheduledAt).toISOString().slice(0, 16) : "",
            reason: existing.reason || "",
            notes: existing.notes || "",
          });
        }
      }
    }
    load();
  }, [appointmentId, slug]);

  async function submit() {
    if (!form.doctorId || !form.scheduledAt) return;
    setSaving(true);
    const response = await fetch(appointmentId ? `/api/tenant/${slug}/patient/appointments/${appointmentId}` : `/api/tenant/${slug}/patient/appointments`, {
      method: appointmentId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (response.ok) {
      router.push(tenantPath("/patient-portal/appointments"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Appointment Booking</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{appointmentId ? "Reschedule appointment" : "Book a new appointment"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Choose a doctor, visit type, and schedule. This writes directly to the tenant appointment ledger.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-foreground">
              <span>Doctor</span>
              <select value={form.doctorId} onChange={(e) => setForm((current) => ({ ...current, doctorId: e.target.value }))} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="">Select doctor</option>
                {options.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm text-foreground">
              <span>Appointment type</span>
              <select value={form.appointmentType} onChange={(e) => setForm((current) => ({ ...current, appointmentType: e.target.value }))} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                {options.appointmentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm text-foreground md:col-span-2">
              <span>Date and time</span>
              <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((current) => ({ ...current, scheduledAt: e.target.value }))} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </label>
            <label className="space-y-2 text-sm text-foreground md:col-span-2">
              <span>Reason</span>
              <input value={form.reason} onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" placeholder="What is this visit for?" />
            </label>
            <label className="space-y-2 text-sm text-foreground md:col-span-2">
              <span>Notes</span>
              <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} className="min-h-32 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" placeholder="Extra context for the clinic" />
            </label>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={submit} disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"><Save className="mr-2 inline h-4 w-4" />{saving ? "Saving..." : appointmentId ? "Save changes" : "Book appointment"}</button>
            <button onClick={() => router.push(tenantPath("/patient-portal/appointments"))} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Back</button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary"><CalendarDays className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Booking guidance</h2>
              <p className="text-sm text-muted-foreground">Use this form for new bookings and reschedules.</p>
            </div>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>Bookings appear in receptionist and doctor appointment workflows automatically.</li>
            <li>Rescheduling preserves the same appointment record and updates timing, doctor, and notes.</li>
            <li>Use the notes field for prep instructions or questions you want visible at check-in.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
