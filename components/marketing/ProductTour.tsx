"use client";

import { useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  MessageSquare,
  Pill,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "./SectionHeading";

type Tab = {
  id: string;
  label: string;
  icon: LucideIcon;
  blurb: string;
};

const TABS: Tab[] = [
  {
    id: "command",
    label: "Command center",
    icon: LayoutDashboard,
    blurb: "Operational clarity across every department, in one live view.",
  },
  {
    id: "clinical",
    label: "Clinical workspace",
    icon: Stethoscope,
    blurb: "The full patient story — notes, vitals, results, and prescriptions.",
  },
  {
    id: "patient",
    label: "Patient & family",
    icon: HeartPulse,
    blurb: "A calmer experience for patients and the people who care for them.",
  },
];

export function ProductTour() {
  const [active, setActive] = useState(0);
  const CurrentIcon = TABS[active].icon;

  return (
    <section id="platform" className="scroll-mt-24 bg-white py-24 sm:py-28 lg:py-32 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeading
          eyebrow="The platform"
          title={
            <>
              Built for the way healthcare <span className="text-orange-600">actually works.</span>
            </>
          }
          description="Every module is designed around a real role, a real workflow, and a real decision. Switch between the views your teams use every day."
          align="center"
        />

        <div className="mt-14 overflow-hidden rounded-[28px] border border-slate-200 bg-[#FBFAF8] shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex overflow-x-auto border-b border-slate-200 bg-white px-2 sm:px-4 dark:border-slate-800 dark:bg-slate-900" role="tablist" aria-label="Product views">
            {TABS.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = index === active;
              return (
                <button
                  key={tab.id}
                  type="button"
                  id={`tab-${tab.id}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setActive(index)}
                  className={`relative flex shrink-0 items-center gap-2.5 px-4 py-4 text-[13px] font-semibold transition-colors sm:px-6 ${
                    isActive ? "text-slate-950 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-orange-600" : "text-slate-400"}`} />
                  {tab.label}
                  {isActive && (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-orange-600 sm:inset-x-5" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-10 lg:p-10">
            <div className="flex flex-col justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                <CurrentIcon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-2xl font-semibold tracking-[-0.035em] text-slate-950 dark:text-white">
                {TABS[active].label}
              </h3>
              <p className="mt-3 text-[14px] leading-7 text-slate-600 dark:text-slate-400">{TABS[active].blurb}</p>
              <ul className="mt-6 space-y-3">
                {[
                  "Role-aware by default",
                  "Live, not batch-updated",
                  "Works across every tenant",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-[13px] text-slate-700 dark:text-slate-200">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check className="h-3 w-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="#workflow"
                className="group mt-7 inline-flex w-fit items-center gap-2 text-[13px] font-semibold text-orange-600 hover:text-orange-700"
              >
                See how it flows
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <div
              id={`panel-${TABS[active].id}`}
              role="tabpanel"
              aria-labelledby={`tab-${TABS[active].id}`}
              className="animate-fade-up"
              key={TABS[active].id}
            >
              {active === 0 && <CommandCenterPanel />}
              {active === 1 && <ClinicalPanel />}
              {active === 2 && <PatientPanel />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WindowFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-30px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-9 items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4">
        <span className="h-2 w-2 rounded-full bg-orange-400" />
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">joan / {label}</span>
        <span className="ml-auto flex items-center gap-1 text-[9px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Synced
        </span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function CommandCenterPanel() {
  const departments = [
    { name: "Emergency", value: 52, percent: 92, color: "bg-orange-500" },
    { name: "Cardiology", value: 38, percent: 72, color: "bg-sky-500" },
    { name: "Radiology", value: 28, percent: 55, color: "bg-violet-500" },
    { name: "Pediatrics", value: 22, percent: 43, color: "bg-emerald-500" },
  ];

  return (
    <WindowFrame label="command-center">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "In care today", value: "1,247", icon: Users },
          { label: "Appointments", value: "284", icon: CalendarCheck2 },
          { label: "Open claims", value: "34", icon: FileText },
          { label: "Beds occupied", value: "78%", icon: Activity },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-800/40 p-3">
              <Icon className="h-3.5 w-3.5 text-orange-500" />
              <p className="mt-2 text-[16px] font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">{item.value}</p>
              <p className="text-[9px] text-slate-500 dark:text-slate-400">{item.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">Department activity</p>
            <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-4 space-y-3">
            {departments.map((dept) => (
              <div key={dept.name}>
                <div className="mb-1.5 flex items-center justify-between text-[9.5px]">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{dept.name}</span>
                  <span className="text-slate-400">{dept.value} encounters</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${dept.color}`} style={{ width: `${dept.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">Operational alerts</p>
            <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[8px] font-semibold text-orange-700">5 new</span>
          </div>
          <div className="mt-3 space-y-2.5">
            {[
              { title: "ICU at capacity", time: "10m", color: "bg-red-500" },
              { title: "Lab QC failed — Coag", time: "1h", color: "bg-amber-500" },
              { title: "Insulin Glargine low stock", time: "4h", color: "bg-amber-500" },
              { title: "Claim approved — $42K", time: "5h", color: "bg-emerald-500" },
            ].map((alert) => (
              <div key={alert.title} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
                <span className={`h-1.5 w-1.5 rounded-full ${alert.color}`} />
                <span className="flex-1 truncate text-[9.5px] font-medium text-slate-700 dark:text-slate-200">{alert.title}</span>
                <span className="text-[8px] text-slate-400">{alert.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WindowFrame>
  );
}

function ClinicalPanel() {
  return (
    <WindowFrame label="clinical-record">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/60 p-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-[11px] font-bold text-white">
          SJ
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-slate-900 dark:text-white">Sarah Johnson</p>
          <p className="text-[9px] text-slate-500 dark:text-slate-400">MRN 0042-8819 · 42 yrs · Hypertension follow-up</p>
        </div>
        <span className="rounded-full bg-orange-50 px-2 py-1 text-[8.5px] font-semibold text-orange-700 ring-1 ring-orange-100">
          In consultation
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "Heart rate", value: "72 bpm", icon: HeartPulse },
          { label: "Blood pressure", value: "118/76", icon: Activity },
          { label: "Temperature", value: "36.8 °C", icon: ClipboardList },
          { label: "SpO₂", value: "98%", icon: FlaskConical },
        ].map((vital) => {
          const Icon = vital.icon;
          return (
            <div key={vital.label} className="rounded-xl border border-slate-200/80 dark:border-slate-700 p-3">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Icon className="h-3 w-3" />
                <span className="text-[8.5px] font-medium">{vital.label}</span>
              </div>
              <p className="mt-1.5 text-[13px] font-semibold text-slate-900 dark:text-white">{vital.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">Clinical timeline</p>
            <span className="text-[8.5px] text-slate-400">Last 30 days</span>
          </div>
          <div className="mt-4 space-y-3 border-l border-slate-200 pl-4 dark:border-slate-700">
            {[
              { title: "Consultation note", detail: "Dr. Chen · Hypertension review", color: "bg-orange-500" },
              { title: "Lab results posted", detail: "Lipid panel · Within range", color: "bg-sky-500" },
              { title: "Prescription renewed", detail: "Lisinopril 10mg · 30 days", color: "bg-emerald-500" },
            ].map((item) => (
              <div key={item.title} className="relative">
                <span className={`absolute -left-[21px] top-1 h-2 w-2 rounded-full ring-2 ring-white ${item.color}`} />
                <p className="text-[10px] font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
                <p className="text-[8.5px] text-slate-500 dark:text-slate-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-orange-600" />
            <p className="text-[10.5px] font-semibold text-orange-900">Copilot insight</p>
          </div>
          <p className="mt-2.5 text-[9.5px] leading-4 text-orange-900/75">
            BP trending down over three readings. Consider maintaining current dose and rechecking in 14 days.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[8.5px] font-semibold text-orange-700">
            Add to note <ChevronRight className="h-3 w-3" />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-700 p-3">
        <Pill className="h-3.5 w-3.5 text-violet-500" />
        <span className="flex-1 text-[9.5px] text-slate-700 dark:text-slate-200">3 active prescriptions · 1 refill awaiting review</span>
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
      </div>
    </WindowFrame>
  );
}

function PatientPanel() {
  return (
    <WindowFrame label="patient-portal">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Next appointment</p>
              <p className="mt-2 text-[15px] font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">Annual checkup</p>
              <p className="mt-1 text-[9.5px] text-slate-500 dark:text-slate-400">Dr. Smith · Cardiology · Room 204</p>
            </div>
            <span className="rounded-lg bg-orange-50 px-2 py-1 text-[9px] font-semibold text-orange-700">May 12</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
            {[
              { label: "Arrive", value: "10:30 AM" },
              { label: "Check-in", value: "Open" },
              { label: "Wait", value: "~8 min" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[8px] uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-800 dark:text-slate-100">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-[9.5px] font-semibold text-white">
            Confirm appointment <ArrowRight className="ml-auto h-3 w-3" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Your health</p>
          <div className="mt-3 space-y-2">
            {[
              { label: "New lab results", value: "2 ready", icon: FlaskConical, tone: "bg-orange-50 text-orange-600" },
              { label: "Active prescriptions", value: "3", icon: Pill, tone: "bg-violet-50 text-violet-600" },
              { label: "Vaccinations", value: "Up to date", icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-600" },
              { label: "Outstanding balance", value: "$140", icon: FileText, tone: "bg-sky-50 text-sky-600" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-2.5 rounded-lg border border-slate-100 px-2.5 py-2">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${item.tone}`}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="flex-1 text-[9.5px] font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                  <span className="text-[9px] font-semibold text-slate-900 dark:text-white">{item.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200/80 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-sky-500" />
            <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">Messages from your care team</p>
          </div>
          <span className="text-[8.5px] text-orange-600">1 unread</span>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[8px] font-bold text-white">
            DS
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-semibold text-slate-800 dark:text-slate-100">Dr. Smith</p>
            <p className="truncate text-[8.5px] text-slate-500 dark:text-slate-400">Your lipid panel came back — everything looks good.</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>
    </WindowFrame>
  );
}
