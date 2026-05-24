"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, History, Mail, Phone } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { useTenantPath } from "@/hooks/useTenantPath";

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

export default function PatientDetailPage() {
  const params = useParams();
  const tenantPath = useTenantPath();
  const id = params.id as string;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["doctor-patient-detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/doctor/patients/${id}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load patient");
      return payload;
    },
    enabled: !!id,
  });

  const patient = data?.patient;
  const stats = data?.stats ?? {};
  const recentAppointments = data?.recentAppointments ?? [];
  const contactComplete = Boolean(patient?.phone && patient?.email);
  const latestAppointment = recentAppointments[0] ?? null;
  const bookAppointmentPath = tenantPath(`/doctor/appointments/new?patientId=${id}`);
  const patientHistoryPath = tenantPath(`/doctor/analytics/my-patients/${id}`);

  return (
    <div className="space-y-6">
      {isError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load patient details.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">
                {isLoading ? "Loading patient..." : patient?.fullName || "Patient"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                ID: {patient?.globalPatientId || patient?.id || "-"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={bookAppointmentPath} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Book Appointment
              </Link>
              <Link href={patientHistoryPath} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground">
                View History
              </Link>
              <Link href={tenantPath("/doctor/patients")} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground">
                Back to Patients
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KPICard title="Appointments" value={stats.appointments ?? 0} tone="info" />
            <KPICard title="Visits" value={stats.visits ?? 0} tone="primary" />
            <KPICard title="Lab Orders" value={stats.labOrders ?? 0} tone="warning" />
            <KPICard title="Prescriptions" value={stats.prescriptions ?? 0} tone="success" />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm xl:col-span-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Clinical Snapshot</p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">Patient readiness and continuity</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep consultation, ordering, and follow-up actions anchored to the current patient context.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Profile Integrity</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{contactComplete ? "Complete" : "Needs Update"}</p>
                </div>
                <div className="rounded-xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Last Appointment</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{latestAppointment ? formatDate(latestAppointment.scheduledAt) : "None"}</p>
                </div>
                <div className="rounded-xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Status</p>
                  <p className="mt-2 text-lg font-semibold capitalize text-foreground">{patient?.status || "active"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">Workflow Actions</h2>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <Link href={bookAppointmentPath} className="flex items-center justify-between rounded-lg border border-border bg-background/70 px-4 py-3 text-foreground">
                  <span className="inline-flex items-center gap-2"><ClipboardList className="h-4 w-4 text-muted-foreground" />Book a follow-up appointment</span>
                  <span className="text-xs text-muted-foreground">Schedule</span>
                </Link>
                <Link href={patientHistoryPath} className="flex items-center justify-between rounded-lg border border-border bg-background/70 px-4 py-3 text-foreground">
                  <span className="inline-flex items-center gap-2"><History className="h-4 w-4 text-muted-foreground" />Open longitudinal history</span>
                  <span className="text-xs text-muted-foreground">Review</span>
                </Link>
                <div className="rounded-lg border border-border bg-background/70 px-4 py-3">
                  <p className="font-medium text-foreground">Patient outreach</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {patient?.phone && (
                      <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        Call
                      </a>
                    )}
                    {patient?.email && (
                      <a href={`mailto:${patient.email}`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </a>
                    )}
                    {!patient?.phone && !patient?.email && (
                      <p className="text-xs text-muted-foreground">No direct contact details on file.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm xl:col-span-2">
              <h2 className="text-lg font-semibold text-foreground">Patient Profile</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                  <p className="mt-1 text-sm text-foreground">{patient?.email || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Phone</p>
                  <p className="mt-1 text-sm text-foreground">{patient?.phone || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Date of Birth</p>
                  <p className="mt-1 text-sm text-foreground">{formatDate(patient?.dob)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Gender</p>
                  <p className="mt-1 text-sm capitalize text-foreground">{patient?.gender || "Not specified"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Address</p>
                  <p className="mt-1 text-sm text-foreground">{patient?.address || "Not provided"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Recent Appointments</h2>
              <div className="mt-4 space-y-3">
                {recentAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No appointments recorded.</p>
                ) : (
                  recentAppointments.map((appointment: any) => (
                    <div key={appointment.id} className="rounded-lg border border-border px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{formatDate(appointment.scheduledAt)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {appointment.reason || appointment.notes || "Scheduled consultation"}
                          </p>
                        </div>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-foreground">
                          {appointment.status || "scheduled"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={bookAppointmentPath} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">
                          Rebook
                        </Link>
                        <Link href={tenantPath(`/doctor/appointments?patientId=${id}`)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">
                          All Appointments
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
