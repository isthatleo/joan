"use client";

import { UserSettingsWorkspace } from "@/components/settings/UserSettingsWorkspace";

const nurseLandingOptions = [
  { value: "dashboard", label: "Nurse Dashboard" },
  { value: "patients", label: "Patients" },
  { value: "vitals", label: "Vitals" },
  { value: "medications", label: "Medications" },
  { value: "care-plans", label: "Care Plans" },
  { value: "beds", label: "Beds" },
  { value: "queue", label: "Queue" },
  { value: "reports", label: "Reports" },
  { value: "messages", label: "Messages" },
];

export default function NurseScopedSettingsPage() {
  return (
    <UserSettingsWorkspace
      heading="Nurse Settings"
      subtitle="Manage your nursing workspace, bedside notifications, privacy, communication defaults, and security preferences without changing hospital-wide administration."
      scopeLabel="Nurse Workspace"
      landingPageOptions={nurseLandingOptions}
    />
  );
}
