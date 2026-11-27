import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";
import { Logo } from "./Brand";
import { TenantSignInLink } from "./TenantSignInLink";

const FOOTER_COLUMNS = [
  {
    title: "Platform",
    links: [
      { label: "Overview", href: "/#platform" },
      { label: "Workflow", href: "/#workflow" },
      { label: "Roles", href: "/#roles" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
  {
    title: "Access",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Super admin", href: "/master" },
      { label: "Documentation", href: "/docs" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Security", href: "/security" },
      { label: "Accessibility", href: "/accessibility" },
      { label: "Support", href: "mailto:support@joan.health" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
      { label: "Refund policy", href: "/refund" },
      { label: "Cookie policy", href: "/cookie" },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950 pb-10 pt-16 text-center">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="flex flex-col items-center">
          <Logo light />
          <p className="mx-auto mt-5 max-w-xl text-[12.5px] leading-6 text-slate-400">
            A multi-tenant healthcare operating system for hospitals, clinics, labs, and networks —
            bringing every team and every moment of care into one connected workspace.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {["Healthcare OS", "Multi-tenant", "Role-aware", "Audit-ready"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <nav
          aria-label="Footer navigation"
          className="mt-12 grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4"
        >
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title} className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                {column.title}
              </p>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("mailto:") ? (
                      <a
                        href={link.href}
                        className="inline-flex items-center gap-1 text-[12.5px] text-slate-400 transition-colors hover:text-white"
                      >
                        {link.label}
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    ) : link.href === "/login" ? (
                      <TenantSignInLink className="text-[12.5px] text-slate-400 transition-colors hover:text-white">
                        {link.label}
                      </TenantSignInLink>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-[12.5px] text-slate-400 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-12 flex flex-col items-center gap-3 border-t border-white/10 pt-7">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11.5px] font-semibold text-slate-200 transition-colors hover:border-orange-400/40 hover:bg-white/10 hover:text-white"
          >
            <Mail className="h-3.5 w-3.5 text-orange-300" />
            Talk to the Joan team
          </Link>
          <p className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} Joan Healthcare OS. All rights reserved.
          </p>
          <p className="text-[11px] text-slate-500">Built for care that never stops.</p>
        </div>
      </div>
    </footer>
  );
}
