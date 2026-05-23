"use client";

import { UserSettingsWorkspace } from "@/components/settings/UserSettingsWorkspace";

export default function ProfileSettingsPage() {
  return (
    <UserSettingsWorkspace
      heading="User Settings"
      subtitle="Manage your personal workspace behavior, notifications, privacy, communication defaults, and security preferences. Hospital-wide administration stays with hospital admins."
      scopeLabel="Personal Account"
    />
  );
}
