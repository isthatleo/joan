"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

type Patient = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  globalPatientId: string | null;
};

const categories = ["General", "Hematology", "Chemistry", "Microbiology", "Imaging"];
const priorities = ["routine", "urgent", "critical"];

export default function NewLabOrderPage() {
  const router = useRouter();
  const tenantPath = useTenantPath();
  const searchParams = useSearchParams();
  const prefilledPatientId = searchParams?.get("patientId") || "";
  const prefilledTest = searchParams?.get("testName") || "";

  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    patientId: prefilledPatientId,
    testName: prefilledTest,
    testCode: "",
    category: "General",
    priority: "routine",
    labLocation: "Main Lab",
    dueDate: "",
    notes: "",
  });

  const patientsQuery = useQuery<{ patients: Patient[] }>({
    queryKey: ["doctor-lab-order-patients"],
    queryFn: async () => {
      const response = await fetch("/api/doctor/patients?status=active");
      if (!response.ok) throw new Error("Failed to load patients");
      return response.json();
    },
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/doctor/lab-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to create lab order");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Lab order created.");
      router.push(tenantPath("/doctor/lab-orders"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filteredPatients = useMemo(() => {
    const patients = patientsQuery.data?.patients ?? [];
    if (!search.trim()) return patients;
    const term = search.toLowerCase();
    return patients.filter((patient) =>
      [patient.fullName, patient.email, patient.phone, patient.globalPatientId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [patientsQuery.data?.patients, search]);

  const selectedPatient =
    (patientsQuery.data?.patients ?? []).find((patient) => patient.id === form.patientId) || null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await createOrder.mutateAsync();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(tenantPath("/doctor/lab-orders"))}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">New Lab Order</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create a real lab request and push it to the lab team.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Patient Selection</h2>
            <p className="text-sm text-muted-foreground">Find the patient to attach this order to.</p>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by patient name, phone, email, or patient number"
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
          />
          <div className="max-h-[26rem] space-y-2 overflow-y-auto rounded-xl border border-border p-3">
            {patientsQuery.isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading patients...</div>
            ) : filteredPatients.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No active patients match this search.</div>
            ) : (
              filteredPatients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, patientId: patient.id }))}
                  className={`flex w-full items-start justify-between rounded-xl border px-4 py-3 text-left ${form.patientId === patient.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"}`}
                >
                  <div>
                    <p className="font-medium text-foreground">{patient.fullName}</p>
                    <p className="text-xs text-muted-foreground">{patient.globalPatientId || "No patient number"}</p>
                    <p className="text-xs text-muted-foreground">{patient.phone || patient.email || "No contact"}</p>
                  </div>
                  {form.patientId === patient.id && <span className="text-xs font-medium text-primary">Selected</span>}
                </button>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Order Details</h2>
            <p className="text-sm text-muted-foreground">Define the requested test, urgency, and lab instructions.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Patient</label>
              <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                {selectedPatient ? selectedPatient.fullName : "Select a patient from the left"}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Patient ID</label>
              <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                {selectedPatient?.globalPatientId || "-"}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Test Name</label>
              <input
                required
                value={form.testName}
                onChange={(event) => setForm((current) => ({ ...current, testName: event.target.value }))}
                placeholder="Complete Blood Count"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Test Code</label>
              <input
                value={form.testCode}
                onChange={(event) => setForm((current) => ({ ...current, testCode: event.target.value }))}
                placeholder="CBC-001"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Category</label>
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
              >
                {categories.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Priority</label>
              <select
                value={form.priority}
                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
              >
                {priorities.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Lab Location</label>
              <input
                value={form.labLocation}
                onChange={(event) => setForm((current) => ({ ...current, labLocation: event.target.value }))}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Due Date</label>
              <input
                type="datetime-local"
                value={form.dueDate}
                onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Clinical Notes / Instructions</label>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={6}
              placeholder="Clinical context, collection instructions, urgency, or specimen guidance"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => router.push(tenantPath("/doctor/lab-orders"))}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.patientId || !form.testName.trim() || createOrder.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createOrder.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Lab Order
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
