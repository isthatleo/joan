import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, FileText, Mail, ShieldCheck } from "lucide-react";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  updated?: string;
  sections: LegalSection[];
  children?: ReactNode;
};

const RELATED_LINKS = [
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of service", href: "/terms" },
  { label: "Refund policy", href: "/refund" },
  { label: "Cookie policy", href: "/cookie" },
  { label: "Security", href: "/security" },
  { label: "Accessibility", href: "/accessibility" },
];

export function LegalPage({
  eyebrow,
  title,
  description,
  updated = "Last updated November 27, 2026",
  sections,
  children,
}: LegalPageProps) {
  return (
    <div className="min-h-screen bg-[#FBFAF8] text-slate-900">
      <MarketingNav />

      <main className="pb-24 pt-28 sm:pt-32">
        <section className="mx-auto max-w-4xl px-6 text-center lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-700 shadow-sm">
            <FileText className="h-3.5 w-3.5" />
            {eyebrow}
          </span>
          <h1 className="mt-7 text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.05em] text-slate-950 sm:text-5xl">
            {title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-8 text-slate-600">{description}</p>
          <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">{updated}</p>
        </section>

        <section className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-8">
          <article className="rounded-[24px] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.35)] sm:p-10">
            <div className="space-y-10">
              {sections.map((section, index) => (
                <section key={section.title}>
                  <div className="flex items-start gap-3">
                    <span className="mt-1 font-mono text-[10px] font-semibold text-orange-500">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-semibold tracking-[-0.025em] text-slate-950">
                        {section.title}
                      </h2>
                      <div className="mt-3 space-y-3 text-[14px] leading-7 text-slate-600">
                        {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                      </div>
                      {section.bullets && section.bullets.length > 0 && (
                        <ul className="mt-4 space-y-2.5">
                          {section.bullets.map((bullet) => (
                            <li key={bullet} className="flex gap-2.5 text-[14px] leading-6 text-slate-600">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </section>
              ))}
            </div>

            {children && <div className="mt-10 border-t border-slate-200 pt-10">{children}</div>}

            <div className="mt-10 rounded-2xl border border-orange-200 bg-orange-50/60 p-5">
              <p className="text-[13px] font-semibold text-orange-950">Questions about this policy?</p>
              <p className="mt-1 text-[12.5px] leading-6 text-orange-900/75">
                Send a message through our contact page. We route platform questions to the Joan super
                admin team for review.
              </p>
              <Link
                href="/contact"
                className="mt-3 inline-flex items-center gap-2 text-[12.5px] font-semibold text-orange-700 hover:text-orange-800"
              >
                Open contact page <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>

          <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Related information
              </p>
              <ul className="mt-4 space-y-2.5">
                {RELATED_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center justify-between gap-2 text-[12.5px] font-medium text-slate-700 transition-colors hover:text-orange-600"
                    >
                      {link.label}
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white">
              <ShieldCheck className="h-5 w-5 text-orange-300" />
              <p className="mt-3 text-[13px] font-semibold">Healthcare context</p>
              <p className="mt-2 text-[11.5px] leading-5 text-slate-400">
                This page explains general platform practices. Organization-specific agreements and
                applicable law may add requirements.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <Mail className="h-5 w-5 text-orange-600" />
              <p className="mt-3 text-[13px] font-semibold">Direct email</p>
              <a
                href="mailto:support@joan.health"
                className="mt-1 block break-all text-[12px] text-slate-600 hover:text-orange-600"
              >
                support@joan.health
              </a>
            </div>
          </aside>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
