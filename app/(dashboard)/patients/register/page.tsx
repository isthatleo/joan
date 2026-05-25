"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { toast } from "sonner";
import { PhoneNumberInput } from "@/components/forms/PhoneNumberInput";

export default function PatientRegistrationPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    address: "",
    status: "active",
  });

  const createPatientMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/doctor/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to create patient");
      return payload;
    },
    onSuccess: (patient) => {
      toast.success("Patient created");
      router.push(`/patients/${patient.id}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create patient");
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createPatientMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Topbar breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Patients", href: "/patients" }, { label: "New Patient" }]} />

      <div>
        <h1 className="text-3xl font-semibold text-foreground">New Patient</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Register a patient record for appointments, consultations, and follow-up care.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">First Name</span>
            <input
              required
              value={form.firstName}
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-foreground"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Last Name</span>
            <input
              required
              value={form.lastName}
              onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-foreground"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-foreground"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Phone</span>
            <PhoneNumberInput
              value={form.phone}
              onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
              className="h-10"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Date of Birth</span>
            <input
              type="date"
              value={form.dob}
              onChange={(event) => setForm((current) => ({ ...current, dob: event.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-foreground"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Gender</span>
            <select
              value={form.gender}
              onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-foreground"
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium text-foreground">Address</span>
            <textarea
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/patients")}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createPatientMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {createPatientMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Patient
          </button>
        </div>
      </form>
    </div>
  );
}
