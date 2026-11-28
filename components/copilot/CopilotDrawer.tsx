"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, ShieldCheck, Sparkles, X } from "lucide-react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export type CopilotDrawerProps = {
  children: React.ReactNode;
  title: string;
  description: string;
  disclaimer: string;
  launcherLabel: string;
  tone?: "tenant" | "platform";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CopilotDrawer({
  children,
  title,
  description,
  disclaimer,
  launcherLabel,
  tone = "tenant",
  open: controlledOpen,
  onOpenChange,
}: CopilotDrawerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = controlledOpen ?? uncontrolledOpen;
  const launcherRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const disclaimerId = useId();
  const isPlatform = tone === "platform";
  const Icon = isPlatform ? ShieldCheck : Sparkles;

  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const setOpenRef = useRef(setOpen);
  setOpenRef.current = setOpen;

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpenRef.current(false);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const restoreTarget = launcherRef.current ?? previouslyFocused;
      restoreTarget?.focus();
    };
  }, [isOpen]);

  const launcherClass = isPlatform
    ? "bg-gradient-to-br from-slate-700 to-slate-900 text-white hover:from-slate-800 hover:to-black focus-visible:outline-slate-700"
    : "bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:scale-105 hover:shadow-xl focus-visible:outline-orange-500";
  const iconClass = isPlatform
    ? "text-slate-700 dark:text-slate-200"
    : "text-orange-600 dark:text-orange-300";

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={launcherLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${launcherClass}`}
      >
        <Icon className="h-6 w-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60]">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={`${descriptionId} ${disclaimerId}`}
            tabIndex={-1}
            className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl outline-none"
          >
            <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${iconClass}`} />
                  <h2 id={titleId} className="text-xl font-semibold text-foreground">
                    {title}
                  </h2>
                </div>
                <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label={`Close ${title}`}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              <div
                id={disclaimerId}
                className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-[11px] leading-4 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{disclaimer}</span>
              </div>
              {children}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
