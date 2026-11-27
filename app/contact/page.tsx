"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Inbox,
  Loader2,
  LockKeyhole,
  Mail,
  MessageSquare,
  Send,
  ShieldCheck,
} from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";

type RoleValue =
  | "hospital_admin"
  | "clinician"
  | "it_admin"
  | "lab_pharmacy"
  | "finance"
  | "patient_guardian"
  | "other";

type TopicValue =
  | "sales"
  | "support"
  | "billing"
  | "partnership"
  | "security"
  | "accessibility"
  | "privacy"
  | "other";

const ROLE_OPTIONS: Array<{ value: RoleValue; label: string }> = [
  { value: "hospital_admin", label: "Hospital or clinic administrator" },
  { value: "clinician", label: "Doctor, nurse, or clinician" },
  { value: "it_admin", label: "IT or platform administrator" },
  { value: "lab_pharmacy", label: "Lab or pharmacy team" },
  { value: "finance", label: "Finance or billing team" },
  { value: "patient_guardian", label: "Patient or guardian" },
  { value: "other", label: "Other" },
];

const TOPIC_OPTIONS: Array<{ value: TopicValue; label: string }> = [
  { value: "sales", label: "Sales and deployment" },
  { value: "support", label: "Product support" },
  { value: "billing", label: "Billing or refund" },
  { value: "partnership", label: "Integration or partnership" },
  { value: "security", label: "Security concern" },
  { value: "accessibility", label: "Accessibility feedback" },
  { value: "privacy", label: "Privacy question" },
  { value: "other", label: "Something else" },
];

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  workEmail: "",
  organization: "",
  role: "hospital_admin" as RoleValue,
  topic: "support" as TopicValue,
  urgency: "normal" as "low" | "normal" | "high",
  subject: "",
  message: "",
  consent: false,
  website: "",
};

const INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-orange-500/20";

export default function ContactPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const update = <K extends keyof typeof INITIAL_FORM>(key: K, value: (typeof INITIAL_FORM)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    setReference(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "We could not send your message. Please try again.");
      }
      setReference(typeof data.reference === "string" ? data.reference : "received");
      setForm(INITIAL_FORM);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFAF8] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <MarketingNav />

      <main className="pb-24 pt-28 sm:pt-32">
        <section className="mx-auto max-w-4xl px-6 text-center lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-700 shadow-sm dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300">
            <MessageSquare className="h-3.5 w-3.5" />
            Contact the platform team
          </span>
          <h1 className="mt-7 text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.05em] text-slate-950 dark:text-white sm:text-5xl">
            Talk to the people behind Joan.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-8 text-slate-600 dark:text-slate-400">
            Ask about deployment, support, billing, security, or accessibility. Your message is stored
            as a platform request and routed to the Joan super admin team for review.
          </p>
        </section>

        <section className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-8 px-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:px-8">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900 sm:p-9">
            {reference ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-7 text-center">
                <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
                <h2 className="mt-4 text-xl font-semibold tracking-[-0.025em] text-slate-950 dark:text-white">
                  Message sent to the super admin team
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-[13px] leading-6 text-slate-600 dark:text-slate-400">
                  We saved your request in the platform feedback queue and notified the super admins on
                  file. Keep the reference below if you need to follow up.
                </p>
                <p className="mt-5 inline-flex rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-[11px] text-emerald-800 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-emerald-300">
                  {reference}
                </p>
                <button
                  type="button"
                  onClick={() => setReference(null)}
                  className="mt-6 inline-flex items-center gap-2 text-[12.5px] font-semibold text-orange-600 hover:text-orange-700"
                >
                  Send another message <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
                    Your details
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                      First name *
                      <input
                        required
                        maxLength={80}
                        value={form.firstName}
                        onChange={(event) => update("firstName", event.target.value)}
                        className={INPUT_CLASS}
                        placeholder="Jane"
                      />
                    </label>
                    <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                      Last name *
                      <input
                        required
                        maxLength={80}
                        value={form.lastName}
                        onChange={(event) => update("lastName", event.target.value)}
                        className={INPUT_CLASS}
                        placeholder="Doe"
                      />
                    </label>
                    <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                      Work email *
                      <input
                        required
                        type="email"
                        maxLength={200}
                        value={form.workEmail}
                        onChange={(event) => update("workEmail", event.target.value)}
                        className={INPUT_CLASS}
                        placeholder="jane@hospital.org"
                      />
                    </label>
                    <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                      Organization *
                      <input
                        required
                        maxLength={160}
                        value={form.organization}
                        onChange={(event) => update("organization", event.target.value)}
                        className={INPUT_CLASS}
                        placeholder="Hospital, clinic, or company"
                      />
                    </label>
                    <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
                      Your role *
                      <select
                        value={form.role}
                        onChange={(event) => update("role", event.target.value as RoleValue)}
                        className={INPUT_CLASS}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
                    Your message
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                      Topic *
                      <select
                        value={form.topic}
                        onChange={(event) => update("topic", event.target.value as TopicValue)}
                        className={INPUT_CLASS}
                      >
                        {TOPIC_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                      Urgency *
                      <select
                        value={form.urgency}
                        onChange={(event) =>
                          update("urgency", event.target.value as "low" | "normal" | "high")
                        }
                        className={INPUT_CLASS}
                      >
                        <option value="low">Low — general question</option>
                        <option value="normal">Normal — needs a response</option>
                        <option value="high">High — blocking work or security concern</option>
                      </select>
                    </label>
                    <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
                      Subject *
                      <input
                        required
                        minLength={3}
                        maxLength={180}
                        value={form.subject}
                        onChange={(event) => update("subject", event.target.value)}
                        className={INPUT_CLASS}
                        placeholder="Short summary of your request"
                      />
                    </label>
                    <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
                      Message *
                      <textarea
                        required
                        minLength={20}
                        maxLength={4000}
                        rows={7}
                        value={form.message}
                        onChange={(event) => update("message", event.target.value)}
                        className={`${INPUT_CLASS} resize-y leading-6`}
                        placeholder="Describe what you need, the page or workflow involved, what you expected, and what happened. Please do not include patient identifiers or clinical details."
                      />
                      <span className="mt-1 block text-right text-[10px] font-normal text-slate-400">
                        {form.message.length}/4000
                      </span>
                    </label>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <label className="flex items-start gap-3 text-[12px] leading-5 text-slate-600 dark:text-slate-400">
                    <input
                      required
                      type="checkbox"
                      checked={form.consent}
                      onChange={(event) => update("consent", event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-400"
                    />
                    <span>
                      I agree that Joan may use these details to respond to my request. I understand I
                      should not include patient identifiers or clinical records in this form.
                    </span>
                  </label>
                </div>

                <div aria-hidden className="absolute left-[-9999px] top-auto">
                  <label>
                    Website
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={(event) => update("website", event.target.value)}
                    />
                  </label>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] text-rose-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    <LockKeyhole className="mr-1 inline h-3 w-3 text-emerald-600" />
                    Routed server-side to the super admin feedback queue.
                  </p>
                  <button
                    type="submit"
                    disabled={sending}
                    className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-3 text-[13px] font-semibold text-white shadow-[0_14px_32px_-14px_rgba(234,88,12,0.9)] transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sending ? "Sending..." : "Send to super admin"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <Inbox className="h-5 w-5 text-orange-600" />
              <p className="mt-3 text-[13px] font-semibold">Where your message goes</p>
              <ul className="mt-3 space-y-2.5 text-[12px] leading-5 text-slate-600 dark:text-slate-400">
                <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> Saved as a platform feedback record.</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> An in-app notification is created for every active super admin.</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> An email is also sent when outbound email is configured.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white">
              <ShieldCheck className="h-5 w-5 text-orange-300" />
              <p className="mt-3 text-[13px] font-semibold">Do not send clinical data</p>
              <p className="mt-2 text-[11.5px] leading-5 text-slate-400">
                This is a platform contact channel, not a clinical record. Remove patient names, MRNs,
                lab values, and other identifiers before sending.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <FileText className="h-5 w-5 text-orange-600" />
              <p className="mt-3 text-[13px] font-semibold">Helpful details to include</p>
              <ul className="mt-3 space-y-2 text-[12px] leading-5 text-slate-600 dark:text-slate-400">
                <li>• The page, module, or workflow involved</li>
                <li>• What you expected and what happened</li>
                <li>• Steps to reproduce a problem</li>
                <li>• Your organization and role</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <Clock3 className="h-5 w-5 text-orange-600" />
              <p className="mt-3 text-[13px] font-semibold">Not an emergency channel</p>
              <p className="mt-2 text-[11.5px] leading-5 text-slate-600 dark:text-slate-400">
                For immediate clinical emergencies, contact local emergency services. For account or
                urgent security concerns, mark the urgency as High and use a non-clinical description.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <Mail className="h-5 w-5 text-orange-600" />
              <p className="mt-3 text-[13px] font-semibold">Direct email</p>
              <a href="mailto:support@joan.health" className="mt-1 block text-[12px] text-slate-600 dark:text-slate-400 hover:text-orange-600">
                support@joan.health
              </a>
              <Link href="/docs" className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-orange-600 hover:text-orange-700">
                Read the docs <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>
        </section>

        <section className="mx-auto mt-16 max-w-6xl px-6 lg:px-8">
          <div className="rounded-[24px] border border-slate-200 bg-white p-7 sm:p-9 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
              After you send
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                { icon: Inbox, title: "Captured", detail: "Your request is written to the platform queue with a reference number." },
                { icon: ShieldCheck, title: "Triaged", detail: "Super admins see the topic, urgency, organization, and your preferred reply address." },
                { icon: MessageSquare, title: "Answered", detail: "Replies use the work email you provided. Keep your reference for follow-up." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-[#FBFAF8] p-5 dark:border-slate-800 dark:bg-slate-800/40">
                  <item.icon className="h-5 w-5 text-orange-600" />
                  <p className="mt-4 text-[13px] font-semibold">{item.title}</p>
                  <p className="mt-2 text-[12px] leading-5 text-slate-600 dark:text-slate-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
