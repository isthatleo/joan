"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, CheckCircle2, Clock3, Loader2, Phone, RefreshCw, Search, UserCheck, UserPlus } from "lucide-react";
import { useTenantPath } from "@/hooks/useTenantPath";

type SearchPatient = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string | null;
  phone: string;
  email: string;
  address: string;
  medicalRecordNumber: string;
  lastVisit: string | null;
  visitCount: number;
  status: string;
};

type PatientProfile = SearchPatient & {
  allergies?: string[];
  conditions?: string[];
  insurancePolicies?: Array<{ id: string; provider: string; policyNumber: string }>;
  recentVisits?: { id: string; reason: string; notes: string; createdAt: string | null }[];
};

type Appointment = {
  id: string;
  patientId: string;
  doctorId: string | null;
  doctorName: string;
  department: string;
  scheduledAt: string | null;
  time: string;
  status: string;
  type: string;
};

type Provider = {
  id: string;
  name: string;
  specialty?: string | null;
  email?: string | null;
  phone?: string | null;
};

type CheckInResult = {
  patient: { id: string; fullName: string; medicalRecordNumber: string; phone: string; email: string };
  appointment: { id: string; type: string; doctorName: string; scheduledAt: string | null };
  checkInTime: string;
  estimatedWaitTime: string;
  queuePosition: number;
  queueNumber: string | null;
  payment?: { method: string | null; insuranceProvider: string | null; insurancePolicyNumber: string | null };
};

type PaymentWorkspace = {
  methods: string[];
  currency: string;
  insuranceProviders: string[];
  defaultPreference: {
    paymentMethod: string;
    insuranceProvider: string | null;
    insurancePolicyNumber: string | null;
  } | null;
  insurancePolicies: Array<{ id: string; provider: string; policyNumber: string }>;
};

export default function CheckInPage() {
  const { slug } = useParams();
  const tenantSlug = String(slug || "");
  const toTenantPath = useTenantPath();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [results, setResults] = useState<SearchPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("walk-in");
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [paymentWorkspace, setPaymentWorkspace] = useState<PaymentWorkspace | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  const selectedAppointment = useMemo(
    () => appointments.find((item) => item.id === selectedAppointmentId) || null,
    [appointments, selectedAppointmentId],
  );
  const effectiveDoctorId = selectedDoctorId || selectedAppointment?.doctorId || "";

  const searchPatients = async (term: string) => {
    setLoading(true);
    try {
      // If term is empty, fetch all patients by not including the 'q' parameter
      // Otherwise, include the 'q' parameter for searching
      const queryParam = term.trim() ? `?q=${encodeURIComponent(term.trim())}` : '';
      const response = await fetch(`/api/tenant/${tenantSlug}/receptionist/patients/search${queryParam}`, { cache: "no-store" });
      const payload = await response.json().catch(() => []);
      if (response.ok) {
        setResults(Array.isArray(payload) ? payload : []);
      }
    } catch (error) {
      console.error("Failed to fetch patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientWorkspace = async (patientId: string) => {
    try {
      setRefreshing(true);
      setWorkspaceLoading(true);
      const response = await fetch(`/api/tenant/${tenantSlug}/receptionist/appointments/patient/${patientId}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (payload?.patient) {
        setSelectedPatient(payload.patient || null);
        setAppointments(Array.isArray(payload.appointments) ? payload.appointments : []);
        setPaymentWorkspace(payload.paymentWorkspace || null);
        const nextAppointment = Array.isArray(payload.appointments)
          ? payload.appointments.find((item: Appointment) => item.status === "scheduled")
          : null;
        setSelectedAppointmentId(nextAppointment?.id || "walk-in");
        setSelectedDoctorId(nextAppointment?.doctorId || providers[0]?.id || "");
        setCheckInError(null);
        const defaultPreference = payload.paymentWorkspace?.defaultPreference;
        setPaymentMethod(defaultPreference?.paymentMethod || payload.paymentWorkspace?.methods?.[0] || "cash");
        setInsuranceProvider(defaultPreference?.insuranceProvider || payload.paymentWorkspace?.insurancePolicies?.[0]?.provider || "");
        setInsurancePolicyNumber(defaultPreference?.insurancePolicyNumber || payload.paymentWorkspace?.insurancePolicies?.[0]?.policyNumber || "");
        setSaveAsDefault(false);
      }
    } catch (error) {
      console.error("Failed to load patient check-in data:", error);
    } finally {
      setRefreshing(false);
      setWorkspaceLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPatients(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, tenantSlug]);

  useEffect(() => {
    let cancelled = false;

    async function loadProviders() {
      try {
        const response = await fetch(`/api/tenant/${tenantSlug}/receptionist/appointments/options`, { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!cancelled && response.ok) {
          const nextProviders = Array.isArray(payload?.providers) ? payload.providers : [];
          setProviders(nextProviders);
          setSelectedDoctorId((current) => current || nextProviders[0]?.id || "");
        }
      } catch (error) {
        console.error("Failed to load doctors:", error);
      }
    }

    if (tenantSlug) void loadProviders();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  const handleCheckIn = async () => {
    if (!selectedPatient) return;
    if (paymentMethod === "insurance" && (!insuranceProvider || !insurancePolicyNumber)) {
      setCheckInError("Insurance provider and policy number are required for insurance check-out.");
      return;
    }
    if (!effectiveDoctorId) {
      setCheckInError("Select a doctor before sending this patient to the doctor's queue.");
      return;
    }

    try {
      setCheckingIn(true);
      setCheckInError(null);
      const response = await fetch(`/api/tenant/${tenantSlug}/receptionist/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          appointmentId: selectedAppointmentId === "walk-in" ? null : selectedAppointmentId,
          doctorId: effectiveDoctorId,
          paymentMethod,
          insuranceProvider: paymentMethod === "insurance" ? insuranceProvider : null,
          insurancePolicyNumber: paymentMethod === "insurance" ? insurancePolicyNumber : null,
          saveAsDefault,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (response.ok) {
        setCheckInResult(payload);
        loadPatientWorkspace(selectedPatient.id);
      } else {
        setCheckInError(payload?.error || "Failed to complete patient check-in.");
      }
    } catch (error) {
      console.error("Failed to complete patient check-in:", error);
      setCheckInError(error instanceof Error ? error.message : "Failed to complete patient check-in.");
    } finally {
      setCheckingIn(false);
    }
  };

  const resetDesk = () => {
    setSearchTerm("");
    setResults([]);
    setSelectedPatient(null);
    setAppointments([]);
    setSelectedAppointmentId("walk-in");
    setCheckInResult(null);
    setPaymentWorkspace(null);
    setSelectedDoctorId(providers[0]?.id || "");
    setCheckInError(null);
    setPaymentMethod("cash");
    setInsuranceProvider("");
    setInsurancePolicyNumber("");
    setSaveAsDefault(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Patient Arrival Desk</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Check-in Station</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search existing patients, review visit history, and move walk-ins or scheduled visits into the live queue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={toTenantPath("/patients/register")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <UserPlus className="h-4 w-4" />
            Register Patient
          </Link>
          <button onClick={resetDesk} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            <RefreshCw className="h-4 w-4" />
            Reset Desk
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by patient name, MRN, or registered phone number"
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground"
            />
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 rounded-xl border border-border px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {searchTerm ? "Searching patients..." : "Loading all patients..."}
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                {searchTerm ? "No patients found matching your search." : "No patients registered yet."}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Patient Name</th>
                      <th className="px-4 py-3 font-medium">MRN</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Last Visit</th>
                      <th className="px-4 py-3 font-medium">Visits</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {results.map((patient) => (
                      <tr key={patient.id}>
                        <td className="px-4 py-3 font-medium text-foreground">{patient.fullName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{patient.medicalRecordNumber || "N/A"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{patient.phone || "N/A"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : "Never"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{patient.visitCount}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              setSelectedPatient({
                                ...patient,
                                allergies: [],
                                conditions: [],
                                insurancePolicies: [],
                                recentVisits: [],
                              });
                              setAppointments([]);
                              setCheckInResult(null);
                              setPaymentWorkspace(null);
                              setSelectedAppointmentId("walk-in");
                              setSelectedDoctorId((current) => current || providers[0]?.id || "");
                              setCheckInError(null);
                              void loadPatientWorkspace(patient.id);
                            }}
                            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          {!selectedPatient ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Select a patient to review appointments, visit history, and complete check-in.
            </div>
          ) : (
            <div className="space-y-5">
              {workspaceLoading ? (
                <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
                  Loading patient visit and appointment workspace...
                </div>
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Selected Patient</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">{selectedPatient.fullName}</h2>
                  <p className="text-sm text-muted-foreground">{selectedPatient.medicalRecordNumber || "No MRN"} {selectedPatient.phone ? `- ${selectedPatient.phone}` : ""}</p>
                </div>
                <Link href={toTenantPath(`/patients/${selectedPatient.id}`)} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground">
                  Open Profile
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-background/70 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent Visits</p>
                  <div className="mt-3 space-y-2">
                    {(selectedPatient.recentVisits || []).slice(0, 3).map((visit) => (
                      <div key={visit.id} className="rounded-lg border border-border px-3 py-2">
                        <p className="text-sm font-medium text-foreground">{visit.reason}</p>
                        <p className="text-xs text-muted-foreground">{visit.createdAt ? new Date(visit.createdAt).toLocaleString() : "Unknown date"}</p>
                      </div>
                    ))}
                    {(selectedPatient.recentVisits || []).length === 0 ? <p className="text-sm text-muted-foreground">No prior visits recorded.</p> : null}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-background/70 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Clinical Flags</p>
                  <div className="mt-3 space-y-2 text-sm text-foreground">
                    <p><span className="font-medium">Allergies:</span> {(selectedPatient.allergies || []).join(", ") || "None recorded"}</p>
                    <p><span className="font-medium">Conditions:</span> {(selectedPatient.conditions || []).join(", ") || "None recorded"}</p>
                    <p><span className="font-medium">Email:</span> {selectedPatient.email || "Not provided"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">Visit Selection</h3>
                    <p className="text-sm text-muted-foreground">Choose a scheduled appointment or check the patient in as a walk-in.</p>
                  </div>
                  <button onClick={() => loadPatientWorkspace(selectedPatient.id)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground">
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
                    <input
                      type="radio"
                      checked={selectedAppointmentId === "walk-in"}
                      onChange={() => {
                        setSelectedAppointmentId("walk-in");
                        setSelectedDoctorId((current) => current || providers[0]?.id || "");
                      }}
                    />
                    <div>
                      <p className="font-medium text-foreground">Walk-in Visit</p>
                      <p className="text-sm text-muted-foreground">Creates a same-day consultation entry and places the patient directly in queue.</p>
                    </div>
                  </label>
                  {appointments.map((appointment) => (
                    <label key={appointment.id} className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
                      <input
                        type="radio"
                        checked={selectedAppointmentId === appointment.id}
                        onChange={() => {
                          setSelectedAppointmentId(appointment.id);
                          setSelectedDoctorId(appointment.doctorId || providers[0]?.id || "");
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-foreground">{appointment.time} with {appointment.doctorName}</p>
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">{appointment.status}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{appointment.department} - {appointment.type}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="mt-4 rounded-lg border border-border bg-background/70 p-3">
                  <label className="block text-sm font-semibold text-foreground">
                    Assign doctor
                    <select
                      value={effectiveDoctorId}
                      onChange={(event) => setSelectedDoctorId(event.target.value)}
                      className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    >
                      <option value="">Select doctor</option>
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}{provider.specialty ? ` - ${provider.specialty}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Reception can assign or reassign the doctor before sending the patient into that doctor's live queue.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <h3 className="font-semibold text-foreground">Payment Method for This Visit</h3>
                <p className="mt-1 text-sm text-muted-foreground">Ask the patient how they will settle this visit today. The saved default is only reused when they confirm it.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                    {(paymentWorkspace?.methods || ["cash", "card", "insurance", "bank_transfer"]).map((method) => (
                      <option key={method} value={method}>{method.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                    <input type="checkbox" checked={saveAsDefault} onChange={(event) => setSaveAsDefault(event.target.checked)} />
                    Save as default for future visits
                  </label>
                </div>
                {paymentMethod === "insurance" ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {Array.from(new Set([...(paymentWorkspace?.insuranceProviders || []), ...(paymentWorkspace?.insurancePolicies || []).map((policy) => policy.provider)])).length > 0 ? (
                      <select value={insuranceProvider} onChange={(event) => setInsuranceProvider(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                        <option value="">Select insurance provider</option>
                        {Array.from(new Set([...(paymentWorkspace?.insuranceProviders || []), ...(paymentWorkspace?.insurancePolicies || []).map((policy) => policy.provider)])).map((provider) => (
                          <option key={provider} value={provider}>{provider}</option>
                        ))}
                      </select>
                    ) : (
                      <input value={insuranceProvider} onChange={(event) => setInsuranceProvider(event.target.value)} placeholder="Insurance provider" className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
                    )}
                    <input value={insurancePolicyNumber} onChange={(event) => setInsurancePolicyNumber(event.target.value)} placeholder="Policy number" className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedPatient.phone ? (
                  <a href={`tel:${selectedPatient.phone}`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground">
                    <Phone className="h-4 w-4" />
                    Call Patient
                  </a>
                ) : null}
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn || !effectiveDoctorId}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                  Send to Doctor
                </button>
              </div>
              {checkInError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {checkInError}
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>

      {checkInResult ? (
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Check-in complete</h2>
              <div className="grid gap-2 text-sm text-foreground md:grid-cols-2 xl:grid-cols-4">
                <p><span className="font-medium">Patient:</span> {checkInResult.patient.fullName}</p>
                <p><span className="font-medium">Queue:</span> {checkInResult.queueNumber || `Position ${checkInResult.queuePosition}`}</p>
                <p><span className="font-medium">Estimated wait:</span> {checkInResult.estimatedWaitTime}</p>
                <p><span className="font-medium">Doctor:</span> {checkInResult.appointment.doctorName}</p>
                <p><span className="font-medium">Payment:</span> {checkInResult.payment?.method || "Not recorded"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={toTenantPath("/queue")} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
                  <Clock3 className="h-4 w-4" />
                  Open Queue
                </Link>
                <Link href={toTenantPath("/reception/waiting")} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
                  <Calendar className="h-4 w-4" />
                  Waiting Room
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
