"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Calendar, CheckCircle2, Clock3, Loader2, RefreshCw, Save, Search, UserRound } from "lucide-react";
import { useTenantPath } from "@/hooks/useTenantPath";

type BookingProvider = {
  id: string;
  name: string;
  specialty: string;
  email?: string | null;
  phone?: string | null;
};

type AppointmentType = {
  id: string;
  name: string;
  duration: number;
  description: string;
};

type PatientResult = {
  id: string;
  fullName: string;
  medicalRecordNumber: string;
  phone: string;
  email: string;
};

type ExistingAppointment = {
  id: string;
  patientId: string;
  patientName: string;
  doctorId?: string | null;
  doctorName: string;
  scheduledAt: string | null;
  status: string;
  type: string;
  reason?: string | null;
  notes?: string | null;
};

export default function ReceptionBookAppointmentPage() {
  const { slug } = useParams();
  const tenantSlug = String(slug || "");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantPath = useTenantPath();
  const appointmentId = searchParams.get("appointmentId");
  const patientIdFromQuery = searchParams.get("patientId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [providers, setProviders] = useState<BookingProvider[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [existingAppointment, setExistingAppointment] = useState<ExistingAppointment | null>(null);
  const [form, setForm] = useState({
    appointmentType: "consultation",
    doctorId: "",
    date: "",
    time: "",
    reason: "",
    notes: "",
  });

  const isReschedule = Boolean(appointmentId);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const optionsRes = await fetch(`/api/tenant/${tenantSlug}/receptionist/appointments/options`, { cache: "no-store" });
        const optionsPayload = await optionsRes.json().catch(() => null);
        if (optionsRes.ok && optionsPayload) {
          setProviders(Array.isArray(optionsPayload.providers) ? optionsPayload.providers : []);
          setAppointmentTypes(Array.isArray(optionsPayload.appointmentTypes) ? optionsPayload.appointmentTypes : []);
        }

        if (appointmentId) {
          const appointmentsRes = await fetch(`/api/tenant/${tenantSlug}/receptionist/appointments`, { cache: "no-store" });
          const appointmentsPayload = await appointmentsRes.json().catch(() => []);
          const match = Array.isArray(appointmentsPayload)
            ? appointmentsPayload.find((item: ExistingAppointment) => item.id === appointmentId)
            : null;

          if (match) {
            setExistingAppointment(match);
            setSelectedPatient({
              id: match.patientId,
              fullName: match.patientName,
              medicalRecordNumber: "",
              phone: "",
              email: "",
            });
            const when = match.scheduledAt ? new Date(match.scheduledAt) : null;
            setForm({
              appointmentType: match.type || "consultation",
              doctorId: match.doctorId || "",
              date: when ? when.toISOString().slice(0, 10) : "",
              time: when ? when.toTimeString().slice(0, 5) : "",
              reason: match.reason || "",
              notes: match.notes || "",
            });
          }
        } else if (patientIdFromQuery) {
          const profileRes = await fetch(`/api/tenant/${tenantSlug}/receptionist/appointments/patient/${patientIdFromQuery}`, { cache: "no-store" });
          const profilePayload = await profileRes.json().catch(() => null);
          if (profileRes.ok && profilePayload?.patient) {
            setSelectedPatient({
              id: profilePayload.patient.id,
              fullName: profilePayload.patient.fullName,
              medicalRecordNumber: profilePayload.patient.globalPatientId || profilePayload.patient.medicalRecordNumber || "",
              phone: profilePayload.patient.phone || "",
              email: profilePayload.patient.email || "",
            });
          }
        }
      } finally {
        setLoading(false);
      }
    };

    if (tenantSlug) {
      void load();
    }
  }, [tenantSlug, appointmentId, patientIdFromQuery]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!patientSearch.trim() || patientSearch.trim().length < 2 || isReschedule) {
        setPatientResults([]);
        return;
      }
      const response = await fetch(`/api/tenant/${tenantSlug}/receptionist/patients/search?q=${encodeURIComponent(patientSearch.trim())}`, { cache: "no-store" });
      const payload = await response.json().catch(() => []);
      setPatientResults(Array.isArray(payload) ? payload : []);
    }, 250);

    return () => clearTimeout(timer);
  }, [patientSearch, tenantSlug, isReschedule]);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === form.doctorId) || null,
    [providers, form.doctorId],
  );

  const submit = async () => {
    if (!selectedPatient || !form.date || !form.time) {
      window.alert("Patient, date, and time are required.");
      return;
    }

    try {
      setSaving(true);
      const scheduledAt = new Date(`${form.date}T${form.time}:00`);
      const payload = {
        patientId: selectedPatient.id,
        doctorId: form.doctorId || null,
        scheduledAt: scheduledAt.toISOString(),
        appointmentType: form.appointmentType,
        reason: form.reason,
        notes: form.notes,
        status: "scheduled",
      };

      const response = await fetch(
        isReschedule
          ? `/api/tenant/${tenantSlug}/receptionist/appointments/${appointmentId}`
          : `/api/tenant/${tenantSlug}/receptionist/appointments`,
        {
          method: isReschedule ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to save appointment");
      }

      router.push(tenantPath("/appointments"));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to save appointment");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Front Desk Scheduling</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">{isReschedule ? "Reschedule Appointment" : "Schedule Appointment"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create or update a patient booking using the tenant receptionist workflow.</p>
        </div>
        <div className="flex gap-2">
          <Link href={tenantPath("/appointments")} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            Back to Appointments
          </Link>
          <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            <RefreshCw className="h-4 w-4" />
            Reload
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          {!isReschedule ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Patient</h2>
                <p className="text-sm text-muted-foreground">Search for the patient before scheduling the appointment.</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={patientSearch}
                  onChange={(event) => setPatientSearch(event.target.value)}
                  placeholder="Search by patient name, MRN, or phone"
                  className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground"
                />
              </div>
              <div className="space-y-2">
                {selectedPatient ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
                    <p className="font-medium text-foreground">{selectedPatient.fullName}</p>
                    <p className="text-xs text-muted-foreground">{selectedPatient.medicalRecordNumber || selectedPatient.phone || selectedPatient.email || "No contact details"}</p>
                  </div>
                ) : null}
                {patientResults.map((patient) => (
                  <button key={patient.id} onClick={() => { setSelectedPatient(patient); setPatientResults([]); setPatientSearch(patient.fullName); }} className="w-full rounded-xl border border-border bg-background/70 px-4 py-3 text-left hover:bg-muted/40">
                    <p className="font-medium text-foreground">{patient.fullName}</p>
                    <p className="text-xs text-muted-foreground">{patient.medicalRecordNumber || patient.phone || patient.email || "No contact details"}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Existing booking</p>
              <p className="mt-1 font-medium text-foreground">{selectedPatient?.fullName || existingAppointment?.patientName}</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Appointment Type</label>
              <select value={form.appointmentType} onChange={(event) => setForm((current) => ({ ...current, appointmentType: event.target.value }))} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                {appointmentTypes.map((type) => (
                  <option key={type.id} value={type.name}>{type.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Doctor</label>
              <select value={form.doctorId} onChange={(event) => setForm((current) => ({ ...current, doctorId: event.target.value }))} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                <option value="">Unassigned / front desk hold</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Date</label>
              <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Time</label>
              <input type="time" value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-foreground">Reason</label>
              <input value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Reason for this appointment" className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-foreground">Notes</label>
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional front desk notes" className="min-h-28 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isReschedule ? "Save Reschedule" : "Schedule Appointment"}
            </button>
            {selectedPatient ? (
              <Link href={tenantPath(`/patients/${selectedPatient.id}`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground">
                <UserRound className="h-4 w-4" />
                Open Patient
              </Link>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Booking Summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Patient</p>
                <p className="mt-1 font-medium text-foreground">{selectedPatient?.fullName || "Select patient"}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Doctor</p>
                <p className="mt-1 font-medium text-foreground">{selectedProvider?.name || "Unassigned"}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Schedule</p>
                <p className="mt-1 font-medium text-foreground">{form.date && form.time ? `${form.date} at ${form.time}` : "Pick a date and time"}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p>
                <p className="mt-1 font-medium text-foreground">{form.appointmentType || "Select type"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Workflow Notes</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p className="rounded-lg border border-border bg-background/70 px-4 py-3">Use this page for both new bookings and reschedules from the receptionist worklist.</p>
              <p className="rounded-lg border border-border bg-background/70 px-4 py-3">If a doctor is not chosen yet, save the booking as unassigned and route it later.</p>
              <p className="rounded-lg border border-border bg-background/70 px-4 py-3">Reason and notes are preserved for front-desk review and downstream handoff.</p>
            </div>
          </div>

          {isReschedule && existingAppointment ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-amber-600" />
                <div className="text-sm text-foreground">
                  <p className="font-medium">Rescheduling existing booking</p>
                  <p className="mt-1 text-muted-foreground">Current status: {existingAppointment.status}</p>
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
