"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/KPICard";
import { Topbar } from "@/components/Topbar";

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export default function PatientDetailPage() {
  const params = useParams();
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

  return (
    <div className="space-y-6">
      <Topbar breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Patients", href: "/patients" }, { label: patient?.fullName || "Patient" }]} />

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
                ID: {patient?.globalPatientId || patient?.id || "—"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/appointments/book?patientId=${id}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Book Appointment
              </Link>
              <Link href="/patients" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground">
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
                      <p className="text-sm font-medium text-foreground">{formatDate(appointment.scheduledAt)}</p>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">{appointment.status || "scheduled"}</p>
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
