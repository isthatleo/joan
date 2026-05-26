"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, Heart, Loader2, Phone, Save, ShieldCheck, User } from "lucide-react";
import { PhoneNumberInput } from "@/components/forms/PhoneNumberInput";
import { useTenantPath } from "@/hooks/useTenantPath";

type PatientFormData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance: {
    paymentMethod: string;
    provider: string;
    policyNumber: string;
    groupNumber: string;
    primaryInsured: string;
    saveAsDefault: boolean;
  };
  medicalHistory: {
    allergies: string;
    medications: string;
    conditions: string;
    surgeries: string;
  };
  preferences: {
    language: string;
    communicationMethod: string;
  };
};

const defaultForm: PatientFormData = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  phone: "",
  email: "",
  address: { street: "", city: "", state: "", zipCode: "" },
  emergencyContact: { name: "", relationship: "", phone: "" },
  insurance: { paymentMethod: "cash", provider: "", policyNumber: "", groupNumber: "", primaryInsured: "", saveAsDefault: false },
  medicalHistory: { allergies: "", medications: "", conditions: "", surgeries: "" },
  preferences: { language: "English", communicationMethod: "phone" },
};

const steps = [
  { id: 1, title: "Basic Information", icon: User },
  { id: 2, title: "Contact Details", icon: Phone },
  { id: 3, title: "Billing & Coverage", icon: ShieldCheck },
  { id: 4, title: "Medical History", icon: Heart },
  { id: 5, title: "Review & Submit", icon: CheckCircle2 },
];

export default function PatientRegistrationPage() {
  const { slug } = useParams();
  const tenantSlug = String(slug || "");
  const router = useRouter();
  const toTenantPath = useTenantPath();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [photoName, setPhotoName] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [formData, setFormData] = useState<PatientFormData>(defaultForm);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["cash", "card", "insurance", "bank_transfer"]);
  const [insuranceProviders, setInsuranceProviders] = useState<string[]>([]);

  useEffect(() => {
    if (!tenantSlug) return;
    fetch(`/api/tenant/${tenantSlug}/receptionist/payment-options`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (Array.isArray(payload?.methods) && payload.methods.length) {
          setPaymentMethods(payload.methods);
          setFormData((current) => ({
            ...current,
            insurance: {
              ...current.insurance,
              paymentMethod: current.insurance.paymentMethod || payload.methods[0],
            },
          }));
        }
        if (Array.isArray(payload?.insuranceProviders)) {
          setInsuranceProviders(payload.insuranceProviders);
        }
      })
      .catch(() => null);
  }, [tenantSlug]);

  const setRootField = (field: "firstName" | "lastName" | "dateOfBirth" | "gender" | "phone" | "email", value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const setNestedField = <T extends keyof PatientFormData>(section: T, field: keyof PatientFormData[T], value: unknown) => {
    setFormData((current) => ({
      ...current,
      [section]: {
        ...(current[section] as Record<string, unknown>),
        [field]: value,
      },
    }));
  };

  const validateStep = (step: number) => {
    if (step === 1) return Boolean(formData.firstName && formData.lastName && formData.dateOfBirth && formData.gender);
    if (step === 2) return Boolean(formData.phone && formData.email && formData.address.street && formData.address.city);
    if (step === 3) {
      if (!formData.insurance.paymentMethod) return false;
      if (formData.insurance.paymentMethod !== "insurance") return true;
      return Boolean(formData.insurance.provider && formData.insurance.policyNumber);
    }
    return true;
  };

  const summary = useMemo(
    () => [
      { label: "Patient", value: `${formData.firstName} ${formData.lastName}`.trim() || "Not entered" },
      { label: "DOB", value: formData.dateOfBirth || "Not entered" },
      { label: "Phone", value: formData.phone || "Not entered" },
      { label: "Payment", value: formData.insurance.paymentMethod || "Not selected" },
      { label: "Insurance", value: formData.insurance.paymentMethod === "insurance" ? formData.insurance.provider || "Not entered" : "Not applicable" },
      { label: "Allergies", value: formData.medicalHistory.allergies || "None recorded" },
      { label: "Contact Preference", value: formData.preferences.communicationMethod || "phone" },
    ],
    [formData],
  );

  const handlePhotoSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenant/${tenantSlug}/receptionist/patients/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          paymentPreference: {
            paymentMethod: formData.insurance.paymentMethod,
            saveAsDefault: formData.insurance.saveAsDefault,
          },
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.patientId) {
        throw new Error("Failed to register patient");
      }
      if (payload?.access?.delivery) {
        const notice =
          payload.access.delivery === "email"
            ? "Patient portal access was sent by email."
            : payload.access.delivery === "sms"
              ? "Patient portal access was sent by SMS."
              : `Patient portal login created. Login ID: ${payload.access.loginIdentifier}`;
        window.alert(notice);
      }
      router.push(toTenantPath(`/patients/${payload.patientId}?registered=true`));
    } catch (error) {
      console.error("Registration failed:", error);
      alert("Failed to register patient. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Front Desk Intake</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">New Patient Registration</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Capture demographic, contact, insurance, and clinical context before the patient enters the visit workflow.
          </p>
        </div>
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-5">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`rounded-xl border px-4 py-4 text-left transition-colors ${
                currentStep === step.id ? "border-primary bg-primary/10" : "border-border bg-background/70 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <step.icon className={`h-5 w-5 ${currentStep === step.id ? "text-primary" : "text-muted-foreground"}`} />
                {currentStep > step.id ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null}
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{step.title}</p>
              <p className="text-xs text-muted-foreground">Step {step.id}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {currentStep === 1 ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Basic Information</h2>
                <p className="text-sm text-muted-foreground">Record the patient identity that all downstream workflows rely on.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input value={formData.firstName} onChange={(event) => setRootField("firstName", event.target.value)} placeholder="First name" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
                <input value={formData.lastName} onChange={(event) => setRootField("lastName", event.target.value)} placeholder="Last name" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
                <input value={formData.dateOfBirth} onChange={(event) => setRootField("dateOfBirth", event.target.value)} type="date" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
                <select value={formData.gender} onChange={(event) => setRootField("gender", event.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
              <div className="rounded-2xl border border-dashed border-border bg-background/70 p-5 text-center">
                {photoPreview ? <img src={photoPreview} alt="Patient preview" className="mx-auto h-24 w-24 rounded-full object-cover" /> : <Camera className="mx-auto h-10 w-10 text-muted-foreground" />}
                <p className="mt-3 text-sm font-medium text-foreground">{photoName || "Patient photo is optional"}</p>
                <p className="text-xs text-muted-foreground">Local upload only. This supports identity confirmation at check-in.</p>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelected} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground">
                  Choose File
                </button>
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Contact Details</h2>
                <p className="text-sm text-muted-foreground">Front desk, billing, and clinical staff use this information for communication and follow-up.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <PhoneNumberInput value={formData.phone} onChange={(value) => setRootField("phone", value || "")} placeholder="Patient phone number" />
                </div>
                <input value={formData.email} onChange={(event) => setRootField("email", event.target.value)} placeholder="Email address" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground md:col-span-2" />
                <input value={formData.address.street} onChange={(event) => setNestedField("address", "street", event.target.value)} placeholder="Street address" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground md:col-span-2" />
                <input value={formData.address.city} onChange={(event) => setNestedField("address", "city", event.target.value)} placeholder="City" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
                <input value={formData.address.state} onChange={(event) => setNestedField("address", "state", event.target.value)} placeholder="State" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
                <input value={formData.address.zipCode} onChange={(event) => setNestedField("address", "zipCode", event.target.value)} placeholder="Postal code" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <h3 className="font-semibold text-foreground">Emergency Contact</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <input value={formData.emergencyContact.name} onChange={(event) => setNestedField("emergencyContact", "name", event.target.value)} placeholder="Contact name" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
                  <input value={formData.emergencyContact.relationship} onChange={(event) => setNestedField("emergencyContact", "relationship", event.target.value)} placeholder="Relationship" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
                  <PhoneNumberInput value={formData.emergencyContact.phone} onChange={(value) => setNestedField("emergencyContact", "phone", value || "")} placeholder="Emergency phone number" />
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Insurance</h2>
                <p className="text-sm text-muted-foreground">Collect payer details early so the accountant and billing teams do not have to backfill missing information.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <select value={formData.insurance.paymentMethod} onChange={(event) => setNestedField("insurance", "paymentMethod", event.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground md:col-span-2">
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>{method.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}</option>
                  ))}
                </select>
                {formData.insurance.paymentMethod === "insurance" ? (
                  <>
                    {insuranceProviders.length > 0 ? (
                      <select value={formData.insurance.provider} onChange={(event) => setNestedField("insurance", "provider", event.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                        <option value="">Select insurance provider</option>
                        {insuranceProviders.map((provider) => (
                          <option key={provider} value={provider}>{provider}</option>
                        ))}
                      </select>
                    ) : (
                      <input value={formData.insurance.provider} onChange={(event) => setNestedField("insurance", "provider", event.target.value)} placeholder="Insurance provider" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
                    )}
                    <input value={formData.insurance.policyNumber} onChange={(event) => setNestedField("insurance", "policyNumber", event.target.value)} placeholder="Policy number" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
                    <input value={formData.insurance.groupNumber} onChange={(event) => setNestedField("insurance", "groupNumber", event.target.value)} placeholder="Group number" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
                    <input value={formData.insurance.primaryInsured} onChange={(event) => setNestedField("insurance", "primaryInsured", event.target.value)} placeholder="Primary insured" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
                  </>
                ) : (
                  <div className="md:col-span-2 rounded-xl border border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                    This patient will check out using {formData.insurance.paymentMethod.replace(/_/g, " ")} unless reception changes it for a specific visit.
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={formData.insurance.saveAsDefault} onChange={(event) => setNestedField("insurance", "saveAsDefault", event.target.checked)} />
                Save this as the patient's default payment preference
              </label>
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Medical History Snapshot</h2>
                <p className="text-sm text-muted-foreground">Capture safety-critical information that should be visible before the clinician starts care.</p>
              </div>
              <div className="grid gap-4">
                <textarea value={formData.medicalHistory.allergies} onChange={(event) => setNestedField("medicalHistory", "allergies", event.target.value)} placeholder="Allergies (comma separated)" className="min-h-24 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" />
                <textarea value={formData.medicalHistory.medications} onChange={(event) => setNestedField("medicalHistory", "medications", event.target.value)} placeholder="Current medications" className="min-h-24 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" />
                <textarea value={formData.medicalHistory.conditions} onChange={(event) => setNestedField("medicalHistory", "conditions", event.target.value)} placeholder="Known conditions (comma separated)" className="min-h-24 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" />
                <textarea value={formData.medicalHistory.surgeries} onChange={(event) => setNestedField("medicalHistory", "surgeries", event.target.value)} placeholder="Relevant surgeries or procedures" className="min-h-24 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" />
              </div>
            </div>
          ) : null}

          {currentStep === 5 ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Review & Submit</h2>
                <p className="text-sm text-muted-foreground">Confirm the intake data before creating the patient record.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {summary.map((item) => (
                  <div key={item.label} className="rounded-xl border border-border bg-background/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                  <p className="text-sm text-foreground">
                    Submitting this intake creates the patient record immediately. Insurance and medical history details can still be expanded later from the patient profile.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">Registration Guidance</h3>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>Use the exact legal identity shown on the patient document where possible.</p>
              <p>Phone and email should match the preferred communication channel used for reminders and follow-up.</p>
              <p>Allergies and critical conditions should be entered even if the full history is not yet available.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">Current Step</h3>
            <p className="mt-3 text-sm text-muted-foreground">{steps.find((step) => step.id === currentStep)?.title}</p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                onClick={() => setCurrentStep((value) => Math.max(1, value - 1))}
                disabled={currentStep === 1}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
              >
                Previous
              </button>
              {currentStep < 5 ? (
                <button
                  onClick={() => setCurrentStep((value) => Math.min(5, value + 1))}
                  disabled={!validateStep(currentStep)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Complete Registration
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
