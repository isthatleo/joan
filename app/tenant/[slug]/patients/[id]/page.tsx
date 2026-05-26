"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CheckCircle2, Clock3, CreditCard, History, Phone, UserRound } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { useTenantPath } from "@/hooks/useTenantPath";

type PatientWorkspace = {
  patient: {
    id: string;
    fullName: string;
    globalPatientId?: string | null;
    dob?: string | null;
    gender?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    allergies?: string[];
    conditions?: string[];
    insurancePolicies?: Array<{ id: string; provider: string; policyNumber: string }>;
    recentVisits?: Array<{ id: string; reason: string; notes: string; createdAt: string | null }>;
  } | null;
  appointments: Array<{
    id: string;
    doctorName: string;
    department: string;
    scheduledAt: string | null;
    time: string;
    status: string;
    type: string;
  }>;
  paymentWorkspace?: {
    methods: string[];
    currency: string;
    defaultPreference: {
      paymentMethod: string;
      insuranceProvider: string | null;
      insurancePolicyNumber: string | null;
    } | null;
  };
};

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString();
}

export default function TenantPatientDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = String(params?.slug || "");
  const patientId = String(params?.id || "");
  const tenantPath = useTenantPath();

  const query = useQuery<PatientWorkspace>({
    queryKey: ["reception-patient-detail", slug, patientId],
    queryFn: async () => {
      const response = await fetch(`/api/tenant/${slug}/receptionist/appointments/patient/${patientId}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load patient");
      return payload;
    },
    enabled: Boolean(slug && patientId),
  });

  const patient = query.data?.patient || null;
  const appointments = query.data?.appointments || [];
  const recentVisits = patient?.recentVisits || [];
  const banner = searchParams.get("registered") === "true";

  const metrics = useMemo(
    () => ({
      appointments: appointments.length,
      visits: recentVisits.length,
      allergies: patient?.allergies?.length || 0,
      insurance: patient?.insurancePolicies?.length || 0,
    }),
    [appointments.length, recentVisits.length, patient?.allergies?.length, patient?.insurancePolicies?.length],
  );

  return (
    <div className="space-y-6">
      {banner ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-foreground">
          Patient registration completed. Portal access was provisioned using the captured email or phone details.
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Patient Workspace</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">{query.isLoading ? "Loading patient..." : patient?.fullName || "Patient profile"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {patient?.globalPatientId || "No patient number"} {patient?.phone ? `- ${patient.phone}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={tenantPath(`/appointments/book?patientId=${patientId}`)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Calendar className="h-4 w-4" />
            Book Appointment
          </Link>
          <Link href={tenantPath("/check-in")} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            <UserRound className="h-4 w-4" />
            Check In
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Appointments" value={metrics.appointments} subtitle="Scheduled and prior" tone="info" icon={Calendar} />
        <KPICard title="Recent Visits" value={metrics.visits} subtitle="Latest encounter history" tone="primary" icon={History} />
        <KPICard title="Allergies" value={metrics.allergies} subtitle="Safety flags" tone="warning" icon={CheckCircle2} />
        <KPICard title="Insurance Policies" value={metrics.insurance} subtitle="Coverage on file" tone="success" icon={CreditCard} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Profile</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Date of birth</p>
              <p className="mt-1 text-sm text-foreground">{formatDate(patient?.dob || null)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Gender</p>
              <p className="mt-1 text-sm capitalize text-foreground">{patient?.gender || "Not recorded"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Phone</p>
              <p className="mt-1 text-sm text-foreground">{patient?.phone || "Not provided"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="mt-1 text-sm text-foreground">{patient?.email || "Not provided"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Address</p>
              <p className="mt-1 text-sm text-foreground">{patient?.address || "Not provided"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Clinical flags</p>
              <p className="mt-1 text-sm text-foreground">
                Allergies: {(patient?.allergies || []).join(", ") || "None recorded"}.
              </p>
              <p className="mt-1 text-sm text-foreground">
                Conditions: {(patient?.conditions || []).join(", ") || "None recorded"}.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Billing Preference</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Default payment method</p>
              <p className="mt-1 font-medium text-foreground">{query.data?.paymentWorkspace?.defaultPreference?.paymentMethod || "Not set"}</p>
            </div>
            {query.data?.paymentWorkspace?.defaultPreference?.insuranceProvider ? (
              <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Insurance provider</p>
                <p className="mt-1 font-medium text-foreground">{query.data?.paymentWorkspace?.defaultPreference?.insuranceProvider}</p>
              </div>
            ) : null}
            {patient?.phone ? (
              <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground">
                <Phone className="h-4 w-4" />
                Call Patient
              </a>
            ) : null}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Visit History</h2>
          <div className="mt-4 space-y-3">
            {recentVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No visits recorded yet.</p>
            ) : (
              recentVisits.map((visit) => (
                <div key={visit.id} className="rounded-xl border border-border bg-background/70 px-4 py-3">
                  <p className="font-medium text-foreground">{visit.reason || "Consultation"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(visit.createdAt)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{visit.notes || "No notes recorded."}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Appointments</h2>
          <div className="mt-4 space-y-3">
            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments recorded.</p>
            ) : (
              appointments.map((appointment) => (
                <div key={appointment.id} className="rounded-xl border border-border bg-background/70 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{appointment.time} with {appointment.doctorName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{appointment.department} - {appointment.type}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">{appointment.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
