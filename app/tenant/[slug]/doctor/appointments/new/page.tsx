"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

export default function BookAppointmentPage() {
  const router = useRouter();
  const tenantPath = useTenantPath();
  const searchParams = useSearchParams();
  const patientIdFromQuery = searchParams.get("patientId") || "";
  const [form, setForm] = useState({
    patientId: patientIdFromQuery,
    scheduledAt: "",
    status: "scheduled",
  });

  useEffect(() => {
    if (patientIdFromQuery) {
      setForm((current) => ({ ...current, patientId: patientIdFromQuery }));
    }
  }, [patientIdFromQuery]);

  const { data, isLoading } = useQuery({
    queryKey: ["doctor-patient-options"],
    queryFn: async () => {
      const response = await fetch("/api/doctor/patients");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load patients");
      return payload;
    },
  });

  const patients = data?.patients ?? [];

  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/doctor/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to create appointment");
      return payload;
    },
    onSuccess: () => {
      toast.success("Appointment created");
      router.push(tenantPath("/doctor/appointments"));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create appointment");
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createAppointmentMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">New Appointment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule a live appointment from your current patient roster.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium text-foreground">Patient</span>
            <select
              required
              value={form.patientId}
              onChange={(event) => setForm((current) => ({ ...current, patientId: event.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-foreground"
            >
              <option value="">Select a patient</option>
              {patients.map((patient: any) => (
                <option key={patient.id} value={patient.id}>
                  {patient.fullName || `${patient.firstName} ${patient.lastName}`.trim()}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Date & Time</span>
            <input
              required
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-foreground"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Status</span>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-foreground"
            >
              <option value="scheduled">Scheduled</option>
              <option value="waiting">Waiting</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(tenantPath("/doctor/appointments"))}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createAppointmentMutation.isPending || isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {(createAppointmentMutation.isPending || isLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Appointment
          </button>
        </div>
      </form>
    </div>
  );
}
