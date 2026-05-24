"use client";

import { UserSettingsWorkspace } from "@/components/settings/UserSettingsWorkspace";

const doctorLandingOptions = [
  { value: "dashboard", label: "Doctor Dashboard" },
  { value: "patients", label: "Patients" },
  { value: "appointments", label: "Appointments" },
  { value: "queue", label: "Queue" },
  { value: "lab-orders", label: "Lab Orders" },
  { value: "prescriptions", label: "Prescriptions" },
  { value: "patient-history", label: "Patient History" },
  { value: "messages", label: "Messages" },
];

export default function DoctorScopedSettingsPage() {
  return (
    <UserSettingsWorkspace
      heading="Doctor Settings"
      subtitle="Manage your consultation workspace, notifications, privacy, communication defaults, and security preferences without changing hospital-wide administration."
      scopeLabel="Doctor Workspace"
      landingPageOptions={doctorLandingOptions}
    />
  );
}
