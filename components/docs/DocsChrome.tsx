"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Copy, List, Mail, ShieldCheck } from "lucide-react";

export type DocsSection = {
  id: string;
  label: string;
  group: string;
};

/**
 * Client-only chrome for the server-rendered docs page: smooth anchor scrolling,
 * active-section tracking, and copy-to-clipboard code blocks.
 */
export function DocsRail({ sections }: { sections: DocsSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const mobileDetailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("scroll-smooth");

    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    const updateActive = () => {
      const marker = window.scrollY + 148;
      let current = sections[0]?.id ?? "";

      for (const element of elements) {
        const top = element.getBoundingClientRect().top + window.scrollY;
        if (top <= marker) current = element.id;
      }

      setActiveId(current);
    };

    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);

    return () => {
      root.classList.remove("scroll-smooth");
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, [sections]);

  const groups = sections.reduce<Array<{ name: string; items: DocsSection[] }>>((result, section) => {
    let group = result.find((entry) => entry.name === section.group);
    if (!group) {
      group = { name: section.group, items: [] };
      result.push(group);
    }
    group.items.push(section);
    return result;
  }, []);

  const renderLinks = (onNavigate?: () => void) => (
    <nav aria-label="On this page" className="space-y-5">
      {groups.map((group) => (
        <div key={group.name}>
          <p className="px-3 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            {group.name}
          </p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((section) => {
              const active = section.id === activeId;
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={active ? "location" : undefined}
                    onClick={() => {
                      setActiveId(section.id);
                      onNavigate?.();
                    }}
                    className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors ${
                      active
                        ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    }`}
                  >
                    <span>{section.label}</span>
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        active ? "bg-orange-500" : "bg-transparent"
                      }`}
                    />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <details
        ref={mobileDetailsRef}
        className="group mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_-36px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900 lg:hidden"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-[13px] font-semibold text-slate-900 [&::-webkit-details-marker]:hidden dark:text-white">
          <span className="inline-flex items-center gap-2">
            <List className="h-4 w-4 text-orange-600" />
            On this page
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" />
        </summary>
        <div className="border-t border-slate-200 px-2 py-3 dark:border-slate-800">
          {renderLinks(() => {
            if (mobileDetailsRef.current) mobileDetailsRef.current.open = false;
          })}
        </div>
      </details>

      <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_40px_-36px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900">
          <p className="px-3 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Documentation
          </p>
          {renderLinks()}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-white">
          <ShieldCheck className="h-4 w-4 text-orange-300" />
          <p className="mt-2.5 text-[12px] font-semibold">Clinical context</p>
          <p className="mt-1.5 text-[11px] leading-5 text-slate-400">
            Copilot output is decision support. Verify every detail against the source record.
          </p>
          <a
            href="mailto:support@joan.health"
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-orange-300 hover:text-orange-200"
          >
            <Mail className="h-3 w-3" />
            support@joan.health
          </a>
        </div>
      </aside>
    </>
  );
}

export function CodeBlock({ code, label = "Example" }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      return;
    } catch {
      // Clipboard API can be blocked outside secure contexts; use a fallback.
    }

    const textarea = document.createElement("textarea");
    textarea.value = code;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand("copy");
    document.body.removeChild(textarea);
    setCopied(succeeded);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied to clipboard" : `Copy ${label}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-[12.5px] leading-6 text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}
