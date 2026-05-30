"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, Clock3, FileText, Loader2, User } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { useTenantPath } from "@/hooks/useTenantPath";

type AppointmentDetail = {
  id: string;
  patientId: string;
  patientName: string;
  medicalRecordNumber: string | null;
  patientPhone: string | null;
  patientEmail?: string | null;
  doctorId?: string | null;
  doctorName: string;
  department: string;
  scheduledAt: string | null;
  time: string;
  status: string;
  type: string;
  duration?: number;
  reason?: string | null;
  notes?: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleString();
}

function statusTone(status?: string | null) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (normalized === "checked-in") return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
  if (normalized === "cancelled" || normalized === "no-show" || normalized === "no_show") return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

export default function TenantAppointmentDetailPage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const appointmentId = String(params?.appointmentId || "");
  const tenantPath = useTenantPath();
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !appointmentId) return;

    const loadAppointment = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/tenant/${slug}/appointments/${appointmentId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Failed to load appointment");
        setAppointment(payload?.appointment || null);
      } catch (fetchError: any) {
        console.error("Failed to load appointment:", fetchError);
        setError(fetchError?.message || "Failed to load appointment");
      } finally {
        setLoading(false);
      }
    };

    void loadAppointment();
  }, [slug, appointmentId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Appointment Details</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">
            {loading ? "Loading appointment..." : appointment?.patientName || "Appointment"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin read-only appointment record. Operational changes are handled by receptionist workflows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={tenantPath("/appointments")} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Appointments
          </Link>
          {appointment?.patientId ? (
            <Link href={tenantPath(`/patients/${appointment.patientId}`)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              <User className="h-4 w-4" />
              Patient Details
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : appointment ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KPICard title="Status" value={appointment.status || "scheduled"} subtitle="Current workflow state" tone="info" icon={Clock3} />
            <KPICard title="Scheduled" value={appointment.time || "N/A"} subtitle={formatDateTime(appointment.scheduledAt)} tone="primary" icon={Calendar} />
            <KPICard title="Type" value={appointment.type || "Consultation"} subtitle={`${appointment.duration || 30} minute slot`} tone="warning" icon={FileText} />
            <KPICard title="Provider" value={appointment.doctorName || "Unassigned"} subtitle={appointment.department || "General"} tone="success" icon={User} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">Appointment Record</h2>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone(appointment.status)}`}>
                  {appointment.status || "scheduled"}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Appointment ID</p>
                  <p className="mt-1 break-all font-mono text-xs text-foreground">{appointment.id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Scheduled At</p>
                  <p className="mt-1 text-sm text-foreground">{formatDateTime(appointment.scheduledAt)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Reason</p>
                  <p className="mt-1 text-sm text-foreground">{appointment.reason || "No reason recorded"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="mt-1 text-sm text-foreground">{appointment.notes || "No notes recorded"}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Patient Linkage</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Patient</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{appointment.patientName || "Unknown patient"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">MRN</p>
                  <p className="mt-1 text-sm text-foreground">{appointment.medicalRecordNumber || "No MRN"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Contact</p>
                  <p className="mt-1 text-sm text-foreground">{appointment.patientPhone || appointment.patientEmail || "No contact details"}</p>
                </div>
                {appointment.patientId ? (
                  <Link href={tenantPath(`/patients/${appointment.patientId}`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                    <User className="h-4 w-4" />
                    Open Patient Details
                  </Link>
                ) : null}
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Appointment not found.
        </div>
      )}
    </div>
  );
}
