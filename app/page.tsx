import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Baby,
  BarChart3,
  BedDouble,
  Braces,
  Building2,
  CalendarCheck2,
  Check,
  ChevronRight,
  CreditCard,
  DollarSign,
  FileCheck2,
  FlaskConical,
  HeartPulse,
  KeyRound,
  Mail,
  MessageSquare,
  Microscope,
  Pill,
  Radio,
  Receipt,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Faq } from "@/components/marketing/Faq";
import { Hero } from "@/components/marketing/Hero";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { ModuleExplorer } from "@/components/marketing/ModuleExplorer";
import { Pricing } from "@/components/marketing/Pricing";
import { ProductTour } from "@/components/marketing/ProductTour";
import { SectionHeading } from "@/components/marketing/SectionHeading";

export const metadata: Metadata = {
  metadataBase: new URL("https://joan.health"),
  title: "Joan — Healthcare OS for connected care",
  description:
    "Joan unifies appointments, clinical records, labs, pharmacy, and finance in one multi-tenant healthcare operating system for hospitals, clinics, and networks.",
  openGraph: {
    title: "Joan — One operating system for every moment of care",
    description:
      "From the front desk to the final claim, Joan brings every department into one role-aware, multi-tenant workspace.",
    type: "website",
    url: "https://joan.health",
    siteName: "Joan Healthcare OS",
  },
  twitter: {
    card: "summary_large_image",
    title: "Joan — Healthcare OS for connected care",
    description: "One operating system for every moment of care.",
  },
};

const CONTINUUM = [
  { label: "Front desk", icon: CalendarCheck2 },
  { label: "Clinical care", icon: Stethoscope },
  { label: "Lab & pharmacy", icon: FlaskConical },
  { label: "Finance & claims", icon: Receipt },
];

const STEPS = [
  {
    icon: UserCheck,
    title: "Register & check in",
    description: "Create a global patient identity and move them into the live queue in seconds.",
  },
  {
    icon: Stethoscope,
    title: "Consult & document",
    description: "Capture notes, vitals, diagnoses, and prescriptions inside a unified clinical record.",
  },
  {
    icon: FlaskConical,
    title: "Test & dispense",
    description: "Route lab orders and prescriptions to the right team with status you can actually see.",
  },
  {
    icon: FileCheck2,
    title: "Bill & reconcile",
    description: "Turn the encounter into an invoice or insurance claim, then track it through settlement.",
  },
];

const ROLES: Array<{ label: string; description: string; icon: LucideIcon; tone: string }> = [
  { label: "Super Admin", description: "Global platform control", icon: ShieldCheck, tone: "bg-slate-900 text-white" },
  { label: "Hospital Admin", description: "Full facility oversight", icon: Building2, tone: "bg-indigo-50 text-indigo-600" },
  { label: "Doctor", description: "Consultations & records", icon: Stethoscope, tone: "bg-sky-50 text-sky-600" },
  { label: "Nurse", description: "Care & vital statistics", icon: HeartPulse, tone: "bg-rose-50 text-rose-600" },
  { label: "Lab Technician", description: "Tests & results", icon: Microscope, tone: "bg-violet-50 text-violet-600" },
  { label: "Pharmacist", description: "Medications & inventory", icon: Pill, tone: "bg-emerald-50 text-emerald-600" },
  { label: "Accountant", description: "Billing & financial control", icon: DollarSign, tone: "bg-amber-50 text-amber-600" },
  { label: "Receptionist", description: "Scheduling & admissions", icon: UserCheck, tone: "bg-cyan-50 text-cyan-600" },
  { label: "Patient", description: "Records & appointments", icon: Users, tone: "bg-teal-50 text-teal-600" },
  { label: "Guardian", description: "Dependent care", icon: Baby, tone: "bg-pink-50 text-pink-600" },
];

const GUARDRAILS = [
  { icon: KeyRound, title: "Role-based access", description: "Every workspace is scoped to what that role is allowed to see and do." },
  { icon: Building2, title: "Tenant isolation", description: "Each hospital or group operates in its own bounded workspace." },
  { icon: Activity, title: "Audit trails", description: "Operational events are recorded so actions can be traced and reviewed." },
  { icon: BarChart3, title: "Module controls", description: "Turn capabilities on or off to match the way your organization works." },
];

const INTEGRATIONS: Array<{ label: string; detail: string; icon: LucideIcon }> = [
  { label: "OpenAI", detail: "Clinical copilot", icon: Sparkles },
  { label: "Socket.IO", detail: "Real-time updates", icon: Radio },
  { label: "Twilio", detail: "SMS notifications", icon: MessageSquare },
  { label: "Resend", detail: "Email delivery", icon: Mail },
  { label: "Stripe", detail: "Payment tooling", icon: CreditCard },
  { label: "REST APIs", detail: "Connect your stack", icon: Braces },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FBFAF8] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <MarketingNav />

      <main>
        <Hero />

        {/* Continuum strip */}
        <section className="border-y border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              One continuous workflow
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-4">
              {CONTINUUM.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#FBFAF8] px-3.5 py-2 text-[12px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <Icon className="h-3.5 w-3.5 text-orange-500" />
                      {item.label}
                    </span>
                    {index < CONTINUUM.length - 1 && (
                      <ChevronRight className="hidden h-4 w-4 text-slate-300 sm:block" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="bg-[#FBFAF8] py-24 sm:py-28 lg:py-32 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <SectionHeading
                eyebrow="Everything connected"
                title={
                  <>
                    One platform. <span className="text-orange-600">No handoff gaps.</span>
                  </>
                }
                description="Joan replaces the patchwork of disconnected tools with a single system that follows the patient — and the people caring for them — from start to finish."
              />
              <Link
                href="#platform"
                className="group inline-flex shrink-0 items-center gap-2 text-[13px] font-semibold text-orange-600 hover:text-orange-700"
              >
                Take the product tour
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <ModuleExplorer />
          </div>
        </section>

        <ProductTour />

        {/* Workflow */}
        <section id="workflow" className="scroll-mt-24 bg-white py-24 sm:py-28 lg:py-32 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <SectionHeading
              eyebrow="How it works"
              title={
                <>
                  From first hello to <span className="text-orange-600">final claim.</span>
                </>
              }
              description="A single patient journey, visible to every team that touches it. No re-keying. No lost context. No guessing what happened upstream."
              align="center"
            />

            <div className="relative mt-16 grid grid-cols-1 gap-8 md:grid-cols-4 md:gap-5">
              <div
                aria-hidden
                className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-gradient-to-r from-orange-200 via-slate-200 to-emerald-200 dark:via-slate-700 md:block"
              />
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="relative text-center">
                    <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_-14px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-800">
                      <Icon className="h-5 w-5 text-orange-600" />
                      <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-[9px] font-bold text-white">
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="mt-6 text-[16px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">{step.title}</h3>
                    <p className="mx-auto mt-3 max-w-[240px] text-[12.5px] leading-6 text-slate-600 dark:text-slate-400">{step.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-14 flex flex-col items-center justify-between gap-5 rounded-[22px] border border-slate-200 bg-[#FBFAF8] px-7 py-6 sm:flex-row dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <Activity className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-slate-900">Updates travel with the patient</p>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400">Every handoff keeps the full clinical and operational context.</p>
                </div>
              </div>
              <Link
                href="/docs"
                className="group inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-orange-600"
              >
                See the architecture <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="scroll-mt-24 bg-[#FBFAF8] py-24 sm:py-28 lg:py-32 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <SectionHeading
                eyebrow="Built around people"
                title={
                  <>
                    Ten roles. <span className="text-orange-600">One shared truth.</span>
                  </>
                }
                description="Joan gives every person in the building a workspace designed around their responsibilities — with the context they need and nothing they don't."
              />
              <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Permissions built in from day one
              </div>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {ROLES.map((role) => {
                const Icon = role.icon;
                return (
                  <div
                    key={role.label}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-500/40"
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${role.tone}`}>
                      <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                    </span>
                    <p className="mt-4 text-[13px] font-semibold text-slate-900">{role.label}</p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{role.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Security / trust */}
        <section className="bg-[#FBFAF8] pb-24 sm:pb-28 lg:pb-32 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[32px] bg-slate-950 px-6 py-14 shadow-[0_40px_90px_-50px_rgba(15,23,42,0.8)] sm:px-10 lg:px-16 lg:py-20">
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.22),transparent_68%)]" />
                <div className="absolute -bottom-32 -left-24 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(0,164,130,0.18),transparent_68%)]" />
                <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px]" />
              </div>

              <div className="relative grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
                <div>
                  <SectionHeading
                    eyebrow="Built with guardrails"
                    title={
                      <>
                        Serious software for <span className="text-orange-400">serious environments.</span>
                      </>
                    }
                    description="Healthcare operations need structure. Joan is organized around explicit roles, bounded tenants, and visible activity from the first login to the last audit entry."
                    light
                  />
                  <div className="mt-8 flex flex-wrap gap-2">
                    {["Multi-tenant", "Role-aware", "Audit-ready", "Configurable"].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10.5px] font-medium text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {GUARDRAILS.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm transition-colors hover:border-orange-400/30 hover:bg-white/[0.07]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="font-mono text-[10px] text-white/25">0{index + 1}</span>
                        </div>
                        <p className="mt-4 text-[13.5px] font-semibold text-white">{item.title}</p>
                        <p className="mt-2 text-[11.5px] leading-5 text-slate-400">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section className="bg-white py-24 sm:py-28 lg:py-32 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <SectionHeading
              eyebrow="Connected by design"
              title={
                <>
                  Works with the tools <span className="text-orange-600">you already rely on.</span>
                </>
              }
              description="Real-time transport, messaging, payments, and intelligence are part of the platform — not an afterthought bolted on later."
              align="center"
            />

            <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {INTEGRATIONS.map((integration) => {
                const Icon = integration.icon;
                return (
                  <div
                    key={integration.label}
                    className="group rounded-2xl border border-slate-200 bg-[#FBFAF8] px-4 py-6 text-center transition-all hover:-translate-y-1 hover:border-orange-200 hover:bg-white hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                  >
                    <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors group-hover:text-orange-600 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="mt-3.5 text-[12px] font-semibold text-slate-900">{integration.label}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{integration.detail}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-[#FBFAF8] px-6 py-5 sm:flex-row dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <Braces className="h-4 w-4 text-orange-600" />
                <p className="text-[13px] text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-950 dark:text-white">API-first underneath.</span> Extend workflows and connect your own systems.
                </p>
              </div>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-orange-600 hover:text-orange-700"
              >
                Read API docs <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <Pricing />
        <Faq />

        {/* Final CTA */}
        <section className="relative overflow-hidden bg-slate-950 py-24 sm:py-28 lg:py-32">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(249,115,22,0.2),transparent_66%)]" />
            <div className="absolute bottom-[-180px] right-[-100px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(0,164,130,0.16),transparent_68%)]" />
          </div>
          <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-300">
              <Sparkles className="h-3.5 w-3.5" />
              Ready when you are
            </span>
            <h2 className="mt-7 text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
              Bring your operations into <span className="text-orange-400">focus.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-8 text-slate-300">
              Give every department the same clear view of care. Talk to us about bringing Joan to your organization.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-3.5 text-[13.5px] font-semibold text-white shadow-[0_14px_34px_-14px_rgba(249,115,22,0.9)] transition-all hover:-translate-y-0.5 hover:bg-orange-700"
              >
                Contact us
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-[13.5px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10"
              >
                Explore documentation
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Role-specific workspaces</span>
              <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Multi-tenant by design</span>
              <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Support: support@joan.health</span>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
