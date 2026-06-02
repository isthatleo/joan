"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Plus, Search, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";

type Patient = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  globalPatientId?: string | null;
};

type Medication = {
  id: string;
  name: string;
  genericName?: string | null;
  strength?: string | null;
  stockInfo: {
    totalQuantity: number;
    minStockLevel: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
    status: "in_stock" | "low_stock" | "out_of_stock";
  };
};

type PrescriptionItemState = {
  medicationId: string;
  drugName: string;
  genericName: string;
  strength: string;
  stockStatus: "" | "in_stock" | "low_stock" | "out_of_stock";
  availableQuantity: number;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
  refills: number;
  route: string;
  isPrn: boolean;
};

function emptyItem(): PrescriptionItemState {
  return {
    medicationId: "",
    drugName: "",
    genericName: "",
    strength: "",
    stockStatus: "",
    availableQuantity: 0,
    dosage: "",
    frequency: "",
    duration: "",
    quantity: 1,
    instructions: "",
    refills: 0,
    route: "oral",
    isPrn: false,
  };
}

function stockTone(status?: string) {
  if (status === "out_of_stock") return "text-destructive";
  if (status === "low_stock") return "text-warning-soft-foreground";
  return "text-success-soft-foreground";
}

export default function NewPrescriptionPage() {
  const router = useRouter();
  const tenantPath = useTenantPath();
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("normal");
  const [pharmacy, setPharmacy] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [items, setItems] = useState<PrescriptionItemState[]>([emptyItem()]);
  const [searchTerms, setSearchTerms] = useState<string[]>([""]);
  const [activeSearchRow, setActiveSearchRow] = useState<number | null>(0);
  const [medicationResults, setMedicationResults] = useState<Medication[]>([]);
  const [loadingMedications, setLoadingMedications] = useState(false);

  const patientsQuery = useQuery({
    queryKey: ["doctor-patients-for-prescriptions", patientSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ status: "active" });
      if (patientSearch) params.set("search", patientSearch);
      const response = await fetch(`/api/doctor/patients?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load patients");
      return payload.patients ?? [];
    },
  });

  const filteredPatients = patientsQuery.data ?? [];
  const selectedPatient = useMemo(
    () => filteredPatients.find((patient: Patient) => patient.id === selectedPatientId) ?? null,
    [filteredPatients, selectedPatientId]
  );

  useEffect(() => {
    if (activeSearchRow === null) {
      setMedicationResults([]);
      return;
    }

    const term = searchTerms[activeSearchRow] || "";
    if (term.trim().length < 2) {
      setMedicationResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingMedications(true);
      try {
        const response = await fetch(`/api/doctor/prescriptions/medications?search=${encodeURIComponent(term)}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed to search medications");
        setMedicationResults(payload.medications ?? []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to search medications");
      } finally {
        setLoadingMedications(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [activeSearchRow, searchTerms]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/doctor/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatientId,
          diagnosis,
          notes,
          priority,
          pharmacy,
          validUntil,
          isEmergency,
          items,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to create prescription");
      return payload;
    },
    onSuccess: (payload) => {
      toast.success("Prescription created");
      router.push(tenantPath(`/doctor/prescriptions/${payload.prescription.id}`));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create prescription");
    },
  });

  function updateItem(index: number, patch: Partial<PrescriptionItemState>) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function selectMedication(index: number, medication: Medication) {
    updateItem(index, {
      medicationId: medication.id,
      drugName: medication.name,
      genericName: medication.genericName || "",
      strength: medication.strength || "",
      stockStatus: medication.stockInfo.status,
      availableQuantity: medication.stockInfo.totalQuantity,
    });
    setSearchTerms((current) => current.map((value, itemIndex) => (itemIndex === index ? medication.name : value)));
    setActiveSearchRow(null);
    setMedicationResults([]);
  }

  function addItem() {
    setItems((current) => [...current, emptyItem()]);
    setSearchTerms((current) => [...current, ""]);
    setActiveSearchRow(items.length);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setSearchTerms((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setActiveSearchRow(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPatientId) {
      toast.error("Select a patient before writing a prescription");
      return;
    }

    const invalidItem = items.find((item) => !item.drugName || !item.dosage || !item.frequency || !item.duration);
    if (invalidItem) {
      toast.error("Each medication row requires name, dosage, frequency, and duration");
      return;
    }

    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link href={tenantPath("/doctor/prescriptions")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted/40">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Write Prescription</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search live inventory, compose the regimen, and dispatch the order to pharmacy.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Patient and order details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Find patient</label>
              <input
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
                placeholder="Search by patient name, email, phone, or patient ID"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select patient</label>
              <select
                value={selectedPatientId}
                onChange={(event) => setSelectedPatientId(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="">Select a patient</option>
                {filteredPatients.map((patient: Patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName} {patient.globalPatientId ? `(${patient.globalPatientId})` : ""}
                  </option>
                ))}
              </select>
              {selectedPatient && (
                <p className="text-xs text-muted-foreground">
                  {selectedPatient.email || selectedPatient.phone || "No contact details"}
                  {selectedPatient.globalPatientId ? ` · ${selectedPatient.globalPatientId}` : ""}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Diagnosis</label>
              <input
                value={diagnosis}
                onChange={(event) => setDiagnosis(event.target.value)}
                placeholder="Primary diagnosis or indication"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Priority</label>
                <select value={priority} onChange={(event) => setPriority(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Valid until</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(event) => setValidUntil(event.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Preferred pharmacy</label>
                <input
                  value={pharmacy}
                  onChange={(event) => setPharmacy(event.target.value)}
                  placeholder="Main dispensary"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Clinical notes</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Counselling notes, follow-up instructions, or medication-specific guidance"
                className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>
          <label className="mt-4 inline-flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={isEmergency} onChange={(event) => setIsEmergency(event.target.checked)} />
            Mark this prescription as urgent / emergency
          </label>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Medications</h2>
              <p className="text-sm text-muted-foreground">Search live inventory and build the prescription line by line.</p>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40"
            >
              <Plus className="h-4 w-4" />
              Add Medication
            </button>
          </div>

          <div className="mt-4 space-y-5">
            {items.map((item, index) => (
              <div key={index} className="rounded-xl border border-border bg-background/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Medication {index + 1}</p>
                    <p className="text-xs text-muted-foreground">Choose from stocked inventory or enter a medication manually.</p>
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/40 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="xl:col-span-2">
                    <label className="text-sm font-medium text-foreground">Search stocked medications</label>
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={searchTerms[index] || ""}
                        onFocus={() => setActiveSearchRow(index)}
                        onChange={(event) => {
                          setActiveSearchRow(index);
                          setSearchTerms((current) => current.map((value, itemIndex) => (itemIndex === index ? event.target.value : value)));
                        }}
                        placeholder="Search by medication name"
                        className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground"
                      />
                      {activeSearchRow === index && (loadingMedications || medicationResults.length > 0) && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-border bg-popover shadow-lg">
                          {loadingMedications ? (
                            <div className="px-4 py-3 text-sm text-muted-foreground">Searching inventory...</div>
                          ) : (
                            medicationResults.map((medication) => (
                              <button
                                key={medication.id}
                                type="button"
                                onClick={() => selectMedication(index, medication)}
                                className="flex w-full items-start justify-between gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-muted/40"
                              >
                                <div>
                                  <p className="text-sm font-medium text-foreground">{medication.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {medication.genericName || "No generic metadata"}
                                    {medication.strength ? ` · ${medication.strength}` : ""}
                                  </p>
                                </div>
                                <div className={`text-xs font-medium ${stockTone(medication.stockInfo.status)}`}>
                                  {medication.stockInfo.totalQuantity} in stock
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Drug name</label>
                    <input
                      value={item.drugName}
                      onChange={(event) => updateItem(index, { drugName: event.target.value })}
                      placeholder="Medication name"
                      className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Dosage</label>
                    <input
                      value={item.dosage}
                      onChange={(event) => updateItem(index, { dosage: event.target.value })}
                      placeholder="1 tablet"
                      className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Frequency</label>
                    <input
                      value={item.frequency}
                      onChange={(event) => updateItem(index, { frequency: event.target.value })}
                      placeholder="Twice daily"
                      className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Duration</label>
                    <input
                      value={item.duration}
                      onChange={(event) => updateItem(index, { duration: event.target.value })}
                      placeholder="7 days"
                      className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) => updateItem(index, { quantity: Number(event.target.value || 1) })}
                      className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Refills</label>
                    <input
                      type="number"
                      min={0}
                      value={item.refills}
                      onChange={(event) => updateItem(index, { refills: Number(event.target.value || 0) })}
                      className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Route</label>
                    <select
                      value={item.route}
                      onChange={(event) => updateItem(index, { route: event.target.value })}
                      className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    >
                      <option value="oral">Oral</option>
                      <option value="iv">IV</option>
                      <option value="injection">Injection</option>
                      <option value="im">IM</option>
                      <option value="subcutaneous">Subcutaneous</option>
                      <option value="topical">Topical</option>
                      <option value="inhaled">Inhaled</option>
                    </select>
                  </div>
                  <div className="xl:col-span-4">
                    <label className="text-sm font-medium text-foreground">Instructions</label>
                    <textarea
                      value={item.instructions}
                      onChange={(event) => updateItem(index, { instructions: event.target.value })}
                      placeholder="Take with food, avoid alcohol, return if symptoms worsen..."
                      className="mt-2 min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  {item.medicationId && (
                    <>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
                        {item.genericName || item.drugName}
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
                        {item.strength || "Strength not set"}
                      </span>
                    </>
                  )}
                  {item.medicationId && (
                    <span className={`inline-flex items-center gap-1 ${stockTone(item.stockStatus)}`}>
                      {item.stockStatus === "out_of_stock" ? (
                        <XCircle className="h-3.5 w-3.5" />
                      ) : item.stockStatus === "low_stock" ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      {item.availableQuantity} units available
                    </span>
                  )}
                  <label className="inline-flex items-center gap-2 text-foreground">
                    <input
                      type="checkbox"
                      checked={item.isPrn}
                      onChange={(event) => updateItem(index, { isPrn: event.target.checked })}
                    />
                    PRN / as needed
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
            <Link href={tenantPath("/doctor/prescriptions")} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/40">
              Cancel
            </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Prescription
          </button>
        </div>
      </form>
    </div>
  );
}
