"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

const FAQS = [
  {
    question: "Is Joan built for multiple hospitals or a single facility?",
    answer:
      "Joan is multi-tenant by design. Each hospital, clinic, lab, or network gets its own workspace with its own users, roles, branding, and module configuration, while platform administrators retain a global view.",
  },
  {
    question: "Which roles does the platform support?",
    answer:
      "There are ten role-specific workspaces: Super Admin, Hospital Admin, Doctor, Nurse, Lab Technician, Pharmacist, Accountant, Receptionist, Patient, and Guardian. Each role sees the tools and data it needs to do its job.",
  },
  {
    question: "Can we choose which modules are active?",
    answer:
      "Yes. Plans define available modules such as appointments, patients, billing, pharmacy, laboratory, analytics, compliance, and integrations, and tenant settings let administrators tailor the experience further.",
  },
  {
    question: "How does billing work?",
    answer:
      "Plans are billed monthly or annually, with annual billing equivalent to two months free. Platform invoices, subscription plans, and retainers are managed inside Joan by platform administrators.",
  },
  {
    question: "Can patients or staff sign themselves up?",
    answer:
      "Accounts are provisioned by a Super Admin or Hospital Admin from inside the platform. Public sign-up is used only to bootstrap the very first administrator on a fresh deployment.",
  },
  {
    question: "Is there an API and documentation?",
    answer:
      "Yes. Joan exposes a broad set of route handlers for its modules, and the in-app documentation covers architecture, core modules, roles, API integration, and getting started.",
  },
  {
    question: "How do staff at a hospital access their workspace?",
    answer:
      "Existing teams use the role selector at /login, or open their organization's own tenant URL to reach its role selector. There is no shared default workspace — each hospital uses its own slug or subdomain.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 bg-white py-24 sm:py-28 lg:py-32 dark:bg-slate-900">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20 lg:px-8">
        <div>
          <SectionHeading
            eyebrow="Questions"
            title={
              <>
                The details, <span className="text-orange-600">answered.</span>
              </>
            }
            description="Everything you need to know about deploying Joan across a hospital, a clinic group, or a national network."
          />
          <div className="mt-8 rounded-2xl border border-slate-200 bg-[#FBFAF8] p-6 dark:border-slate-800 dark:bg-slate-800/40">
            <p className="text-[13px] font-semibold text-slate-900 dark:text-white">Still have a question?</p>
            <p className="mt-2 text-[12px] leading-6 text-slate-600 dark:text-slate-400">
              Our team can walk through your workflows, plan structure, and integration requirements.
            </p>
            <a
              href="mailto:support@joan.health?subject=Joan%20platform%20question"
              className="group mt-4 inline-flex items-center gap-2 text-[12.5px] font-semibold text-orange-600 hover:text-orange-700"
            >
              Email support@joan.health
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
          <Link
            href="/docs"
            className="group mt-4 inline-flex items-center gap-2 text-[12.5px] font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:text-white"
          >
            Read the platform documentation
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="divide-y divide-slate-200 overflow-hidden rounded-[22px] border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {FAQS.map((item, index) => {
            const isOpen = open === index;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  onClick={() => setOpen(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/60 sm:px-7"
                >
                  <span className={`text-[14px] font-semibold ${isOpen ? "text-slate-950 dark:text-white" : "text-slate-800 dark:text-slate-100"}`}>
                    {item.question}
                  </span>
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all ${
                      isOpen
                        ? "rotate-180 border-orange-200 bg-orange-50 text-orange-600"
                        : "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"
                    }`}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </span>
                </button>
                {isOpen && (
                  <div id={`faq-answer-${index}`} className="animate-fade-up px-6 pb-6 sm:px-7">
                    <p className="max-w-2xl text-[13px] leading-7 text-slate-600 dark:text-slate-400">{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
