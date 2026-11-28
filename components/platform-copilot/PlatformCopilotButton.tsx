"use client";

import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";
import { PlatformCopilotPanel } from "./PlatformCopilotPanel";

export type PlatformCopilotButtonProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  sessionKey?: string;
};

export function PlatformCopilotButton({ sessionKey, ...drawerProps }: PlatformCopilotButtonProps) {
  return (
    <CopilotDrawer
      {...drawerProps}
      tone="platform"
      title="Platform Copilot"
      launcherLabel="Open Platform Copilot"
      description="Read-only platform operations summaries. No patient details and no actions."
      disclaimer="Platform-only metadata. No patient details, note text, or write actions. Verify operational details in the relevant admin page."
    >
      <PlatformCopilotPanel sessionKey={sessionKey} />
    </CopilotDrawer>
  );
}
