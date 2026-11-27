"use client";

import { useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { TenantSignInLink } from "./TenantSignInLink";

type Plan = {
  name: string;
  description: string;
  monthly: number;
  yearly: number;
  staff: number;
  patients: number;
  storage: number;
  support: string;
  features: string[];
  badge?: string;
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Starter Clinic",
    description: "Core patient and appointment workflows for a small practice.",
    monthly: 99,
    yearly: 990,
    staff: 8,
    patients: 500,
    storage: 25,
    support: "Email support",
    features: ["Patient registry", "Appointments", "Basic billing", "Email support"],
  },
  {
    name: "Growth Practice",
    description: "Pharmacy, lab, and finance for a growing hospital.",
    monthly: 249,
    yearly: 2490,
    staff: 35,
    patients: 2500,
    storage: 100,
    support: "Priority support",
    features: ["Pharmacy", "Laboratory", "Insurance claims", "Role permissions"],
    badge: "Most popular",
    featured: true,
  },
  {
    name: "Regional Hospital",
    description: "Multi-department operations with deeper analytics.",
    monthly: 599,
    yearly: 5990,
    staff: 120,
    patients: 10000,
    storage: 500,
    support: "Priority support",
    features: ["Department analytics", "Advanced audit logs", "Broadcasts", "Integrations"],
  },
  {
    name: "Enterprise Network",
    description: "High staff volume and deep compliance needs.",
    monthly: 1299,
    yearly: 12990,
    staff: 400,
    patients: 50000,
    storage: 2000,
    support: "Enterprise support",
    features: ["Unlimited departments", "Compliance exports", "Dedicated support", "Custom integrations"],
  },
  {
    name: "Teaching Hospital",
    description: "Training, research reporting, and expanded analytics.",
    monthly: 1799,
    yearly: 17990,
    staff: 650,
    patients: 80000,
    storage: 3500,
    support: "Enterprise support",
    features: ["Research reports", "Training departments", "Advanced scheduling", "Dedicated onboarding"],
  },
  {
    name: "National Health System",
    description: "National-scale limits with white-glove support.",
    monthly: 3499,
    yearly: 34990,
    staff: 1500,
    patients: 250000,
    storage: 10000,
    support: "White-glove support",
    features: ["National scale limits", "White-glove support", "Custom SLA", "Strategic reporting"],
    badge: "National scale",
  },
];

const number = (value: number) => value.toLocaleString("en-US");

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="scroll-mt-24 bg-[#FBFAF8] py-24 sm:py-28 lg:py-32 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow="Plans & pricing"
            title={
              <>
                A tier for every <span className="text-orange-600">scale of care.</span>
              </>
            }
            description="Start with the workflows you need and grow into the full platform. Every tenant can be configured with its own modules, roles, and limits."
          />

          <div className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              aria-pressed={!annual}
              className={`rounded-full px-4 py-2 text-[12px] font-semibold transition-all ${
                !annual ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              aria-pressed={annual}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-all ${
                annual ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
              }`}
            >
              Annually
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${annual ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-700"}`}>
                2 months free
              </span>
            </button>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`group relative flex flex-col rounded-[22px] border p-6 transition-all duration-300 hover:-translate-y-1 sm:p-7 ${
                plan.featured
                  ? "border-orange-300 bg-white shadow-[0_24px_70px_-35px_rgba(234,88,12,0.55)] dark:border-orange-500/40 dark:bg-slate-900"
                  : "border-slate-200 bg-white shadow-[0_12px_40px_-30px_rgba(15,23,42,0.35)] hover:border-slate-300 hover:shadow-[0_24px_60px_-35px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
                  {plan.featured && <Sparkles className="h-3 w-3" />}
                  {plan.badge}
                </span>
              )}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[18px] font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">{plan.name}</h3>
                  <p className="mt-1.5 min-h-[42px] text-[12px] leading-5 text-slate-500 dark:text-slate-400">{plan.description}</p>
                </div>
              </div>

              <div className="mt-5 flex items-end gap-1.5">
                <span className="text-[36px] font-semibold leading-none tracking-[-0.05em] text-slate-950 dark:text-white">
                  ${number(annual ? plan.yearly : plan.monthly)}
                </span>
                <span className="pb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  / {annual ? "year" : "month"}
                </span>
              </div>
              {annual && (
                <p className="mt-1.5 text-[10px] font-medium text-emerald-700">
                  Billed annually · save ${number(plan.monthly * 2)}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[9.5px] font-medium dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {number(plan.staff)} staff
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[9.5px] font-medium dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {number(plan.patients)} patients
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[9.5px] font-medium dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {number(plan.storage)} GB
                </span>
              </div>

              <div className="my-6 h-px bg-slate-100 dark:bg-slate-800" />

              <ul className="flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-[12px] text-slate-700 dark:text-slate-200">
                    <span
                      className={`flex items-center justify-center rounded-full ${
                        plan.featured ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"
                      }`}
                      style={{ height: 18, width: 18 }}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <TenantSignInLink
                className={`group/cta mt-7 flex items-center justify-center gap-2 rounded-full px-4 py-3 text-[12.5px] font-semibold transition-all ${
                  plan.featured
                    ? "bg-orange-600 text-white hover:bg-orange-700"
                    : "border border-slate-200 bg-white text-slate-900 dark:text-white hover:border-slate-900 hover:bg-slate-950 hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:hover:border-orange-500 dark:hover:bg-orange-600"
                }`}
              >
                Access platform
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/cta:translate-x-1" />
              </TenantSignInLink>
              <p className="mt-2.5 text-center text-[9.5px] text-slate-400">{plan.support} · Accounts provisioned by an admin</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 sm:flex-row dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[13px] text-slate-600 dark:text-slate-400">
            Need a custom deployment, integration, or SLA? Let&apos;s design it together.
          </p>
          <a
            href="mailto:support@joan.health?subject=Joan%20custom%20deployment"
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-orange-600 hover:text-orange-700"
          >
            Contact the team <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
