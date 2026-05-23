"use client";

import { UserSettingsWorkspace } from "@/components/settings/UserSettingsWorkspace";

export default function AccountantSettingsPage() {
  return (
    <UserSettingsWorkspace
      heading="User Settings"
      subtitle="Manage your personal accountant workspace settings here. Hospital configuration, branding, modules, and organization-wide controls remain restricted to hospital admins."
      scopeLabel="Accountant Workspace"
    />
  );
}
