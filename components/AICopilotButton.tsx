"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { CopilotPanel } from "./copilot/CopilotPanel";

export type AICopilotButtonProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function AICopilotButton({ open: controlledOpen, onOpenChange }: AICopilotButtonProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = controlledOpen ?? uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI Copilot"
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex justify-end bg-black/50"
          onClick={() => setOpen(false)}
        >
          <aside
            onClick={(event) => event.stopPropagation()}
            className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-background p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Joan Copilot</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Grounded handoff support from your own tenant and queue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close AI Copilot"
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <CopilotPanel />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
