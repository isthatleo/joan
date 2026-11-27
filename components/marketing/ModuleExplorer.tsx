"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  ClipboardList,
  DollarSign,
  Microscope,
  Pill,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";

type ModuleFeature = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  tag: string;
  tone: string;
  summary: string;
  capabilities: string[];
  roles: string[];
  workflow: string;
};

const FEATURES: ModuleFeature[] = [
  {
    id: "front-desk",
    icon: CalendarCheck2,
    title: "Front desk flow",
    description:
      "Book appointments, register patients, manage check-ins, and watch the live queue move — all from one calm, focused screen.",
    tag: "Appointments",
    tone: "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/20",
    summary:
      "Give every arrival a clean starting point. Scheduling, registration, and queue movement stay connected so no patient disappears between steps.",
    capabilities: [
      "Calendar booking with room and clinician awareness",
      "Patient registration and identity matching",
      "Arrival check-in, walk-ins, and live queue status",
      "Front-desk handoff into consultation without re-keying",
    ],
    roles: ["Receptionist", "Hospital admin", "Doctor"],
    workflow: "Register → check in → assign to queue → consult",
  },
  {
    id: "clinical-command",
    icon: ClipboardList,
    title: "Clinical command",
    description:
      "Consultations, notes, diagnoses, vitals, and results live together in a medical timeline that makes the whole picture obvious.",
    tag: "EMR / EHR",
    tone:
      "bg-orange-50 text-orange-600 ring-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/20",
    summary:
      "A clinician-first workspace where the patient story is assembled in one place. Notes, observations, and decisions stay attached to the encounter.",
    capabilities: [
      "Consultation notes with structured diagnoses",
      "Vitals and clinical observations over time",
      "Patient history, allergies, and conditions in context",
      "Grounded AI copilot with source-linked suggestions",
    ],
    roles: ["Doctor", "Nurse", "Hospital admin"],
    workflow: "Queue → consult → document → order → review",
  },
  {
    id: "diagnostic-pipeline",
    icon: Microscope,
    title: "Diagnostic pipeline",
    description:
      "Track lab orders from request to result, with clear priorities, quality signals, and sign-off workflows for technicians and doctors.",
    tag: "Laboratory",
    tone:
      "bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/20",
    summary:
      "Make every order visible from collection to signed result. Priorities, status changes, and review duties are explicit at each step.",
    capabilities: [
      "Order creation with routine, urgent, and STAT priority",
      "Sample status tracking and technician worklists",
      "Result entry with abnormal-value signals",
      "Doctor review and patient-facing release controls",
    ],
    roles: ["Lab technician", "Doctor", "Nurse"],
    workflow: "Order → collect → analyze → verify → release",
  },
  {
    id: "dispense-hub",
    icon: Pill,
    title: "Dispense hub",
    description:
      "Manage medications, prescriptions, stock levels, and interaction alerts with a pharmacy workspace built around patient safety.",
    tag: "Pharmacy",
    tone:
      "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20",
    summary:
      "Connect prescribing to dispensing with inventory and safety checks in the same flow, so the right medicine reaches the right patient.",
    capabilities: [
      "Prescription validation and dispensing queue",
      "Medication inventory and low-stock visibility",
      "Interaction and allergy alerts before dispense",
      "Patient instructions and refill tracking",
    ],
    roles: ["Pharmacist", "Doctor", "Nurse"],
    workflow: "Prescribe → validate → dispense → counsel → record",
  },
  {
    id: "finance-grid",
    icon: DollarSign,
    title: "Finance grid",
    description:
      "Issue invoices, reconcile payments, and follow insurance claims from submission to settlement without leaving the platform.",
    tag: "Billing",
    tone:
      "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20",
    summary:
      "Close the loop on every encounter. Charges, payments, and claims stay linked to the visit that created them.",
    capabilities: [
      "Encounter-based invoicing and payment recording",
      "Insurance claim preparation and tracking",
      "Reconciliation views for finance teams",
      "Role-scoped financial reporting",
    ],
    roles: ["Accountant", "Hospital admin", "Super admin"],
    workflow: "Encounter → invoice → payment → claim → settlement",
  },
  {
    id: "intelligence-layer",
    icon: Sparkles,
    title: "Intelligence layer",
    description:
      "An AI copilot and role-aware analytics turn the noise of daily operations into summaries, signals, and better decisions.",
    tag: "AI & analytics",
    tone:
      "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/20",
    summary:
      "Ask questions in plain language and get answers grounded in the records you are allowed to see, with sources you can verify.",
    capabilities: [
      "Tenant- and permission-scoped clinical answers",
      "Source-linked summaries for clinician review",
      "Operational dashboards for each role",
      "Local-only note insertion — no silent record writes",
    ],
    roles: ["Doctor", "Nurse", "Hospital admin"],
    workflow: "Ask → ground → cite → review → decide",
  },
];

export function ModuleExplorer() {
  const [active, setActive] = useState<ModuleFeature | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const ActiveIcon = active?.icon;

  useEffect(() => {
    if (!active) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [active]);

  return (
    <>
      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <button
              key={feature.id}
              type="button"
              onClick={() => setActive(feature)}
              aria-label={`Explore ${feature.title} module details`}
              className="group relative overflow-hidden rounded-[22px] border border-slate-200 bg-white p-7 text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-orange-200 hover:shadow-[0_24px_60px_-35px_rgba(15,23,42,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-500/40 dark:focus-visible:ring-offset-slate-950"
            >
              <span
                aria-hidden
                className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-orange-50/0 blur-2xl transition-colors duration-500 group-hover:bg-orange-50/80 dark:group-hover:bg-orange-500/10"
              />
              <span className="relative block">
                <span className="flex items-start justify-between">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${feature.tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-[10px] font-medium text-slate-300 dark:text-slate-600">
                    0{index + 1}
                  </span>
                </span>
                <span className="mt-6 block text-[9.5px] font-semibold uppercase tracking-[0.18em] text-orange-600">
                  {feature.tag}
                </span>
                <span className="mt-2 block text-[19px] font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
                  {feature.title}
                </span>
                <span className="mt-3 block text-[13px] leading-6 text-slate-600 dark:text-slate-400">
                  {feature.description}
                </span>
                <span className="mt-6 flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 transition-colors group-hover:text-orange-600 dark:text-slate-400">
                  Explore module <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActive(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="module-dialog-title"
            aria-describedby="module-dialog-description"
            className="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[26px] border border-slate-200 bg-white p-7 shadow-2xl sm:p-9 dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={() => setActive(null)}
              aria-label="Close module details"
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 pr-12">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${active.tone}`}>
                {ActiveIcon ? <ActiveIcon className="h-5 w-5" /> : null}
              </span>
              <div>
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-orange-600">
                  {active.tag}
                </p>
                <h2
                  id="module-dialog-title"
                  className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white"
                >
                  {active.title}
                </h2>
              </div>
            </div>

            <p id="module-dialog-description" className="mt-5 text-[14px] leading-7 text-slate-600 dark:text-slate-300">
              {active.summary}
            </p>

            <div className="mt-7 rounded-2xl border border-slate-200 bg-[#FBFAF8] p-5 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                What it does
              </p>
              <ul className="mt-4 space-y-3">
                {active.capabilities.map((capability) => (
                  <li key={capability} className="flex items-start gap-3 text-[13px] leading-6 text-slate-700 dark:text-slate-300">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    {capability}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Built for
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {active.roles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Where it fits
                </p>
                <p className="mt-3 text-[12.5px] leading-6 text-slate-600 dark:text-slate-300">
                  {active.workflow}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center dark:border-slate-800">
              <Link
                href="#workflow"
                onClick={() => setActive(null)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500"
              >
                See the workflow <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/docs"
                onClick={() => setActive(null)}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 text-[12.5px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Read the docs
              </Link>
              <a
                href="mailto:support@joan.health?subject=Joan%20module%20demo"
                onClick={() => setActive(null)}
                className="inline-flex items-center justify-center text-[12.5px] font-semibold text-orange-600 hover:text-orange-700"
              >
                Book a walkthrough
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
