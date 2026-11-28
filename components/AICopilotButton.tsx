"use client";

import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";
import { CopilotPanel } from "./copilot/CopilotPanel";

export type AICopilotButtonProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  sessionKey?: string;
};

export function AICopilotButton({ sessionKey, ...drawerProps }: AICopilotButtonProps) {
  return (
    <CopilotDrawer
      {...drawerProps}
      tone="tenant"
      title="Joan Copilot"
      launcherLabel="Open AI Copilot"
      description="Chat with grounded support from records your role can access. Verify every response before acting."
      disclaimer="AI-generated support only. It can be incomplete or wrong. Open the linked source records and confirm every detail before acting."
    >
      <CopilotPanel sessionKey={sessionKey} />
    </CopilotDrawer>
  );
}
