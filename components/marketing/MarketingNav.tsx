"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Logo } from "./Brand";
import { MarketingThemeToggle } from "./MarketingThemeToggle";
import { TenantSignInLink } from "./TenantSignInLink";

const LINKS = [
  { label: "Platform", href: "/#platform" },
  { label: "Workflow", href: "/#workflow" },
  { label: "Roles", href: "/#roles" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-slate-200/70 bg-white/85 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85"
          : "border-b border-transparent bg-white/40 backdrop-blur-md dark:bg-slate-950/40"
      }`}
    >
      <nav className="mx-auto flex h-[72px] max-w-7xl items-center gap-6 px-6 lg:px-8" aria-label="Main navigation">
        <Logo />

        <div className="ml-auto hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/docs"
            className="ml-1 rounded-full px-3.5 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            Docs
          </Link>
        </div>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <MarketingThemeToggle />
          <TenantSignInLink
            className="rounded-full px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            Sign in
          </TenantSignInLink>
          <Link
            href="mailto:support@joan.health?subject=Joan%20demo%20request"
            className="group inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(15,23,42,0.7)] transition-all hover:bg-orange-600 hover:shadow-[0_10px_24px_-10px_rgba(249,115,22,0.8)]"
          >
            Book a demo
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((value) => !value)}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div id="mobile-navigation" className="border-t border-slate-200 bg-white px-6 pb-7 pt-4 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-[15px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/docs"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-[15px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Documentation
            </Link>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
            <span className="text-[12.5px] font-medium text-slate-500 dark:text-slate-400">Appearance</span>
            <MarketingThemeToggle compact />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <TenantSignInLink
              onClick={() => setOpen(false)}
              className="flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800"
            >
              Sign in
            </TenantSignInLink>
            <Link
              href="mailto:support@joan.health?subject=Joan%20demo%20request"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white"
            >
              Book a demo
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
