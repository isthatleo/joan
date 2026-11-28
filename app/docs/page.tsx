import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarCheck2,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  Code2,
  FileText,
  HeartPulse,
  Inbox,
  KeyRound,
  Layers3,
  LifeBuoy,
  LockKeyhole,
  Mail,
  MessageSquare,
  Microscope,
  Pill,
  Receipt,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Terminal,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { CodeBlock, DocsRail, type DocsSection } from "@/components/docs/DocsChrome";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";

export const metadata: Metadata = {
  title: "Documentation | Joan Healthcare OS",
  description:
    "Current product guide for Joan Healthcare OS: roles, tenant access, modules, Copilot, APIs, architecture, security posture, and support.",
};

const SECTIONS: DocsSection[] = [
  { id: "overview", label: "Overview", group: "Start here" },
  { id: "quick-start", label: "Quick start", group: "Start here" },
  { id: "access-roles", label: "Access & roles", group: "Start here" },
  { id: "tenant-access-flow", label: "Tenant access flow", group: "Start here" },
  { id: "core-modules", label: "Core modules", group: "Product" },
  { id: "ai-copilot", label: "AI Copilot", group: "Product" },
  { id: "api-reference", label: "API reference", group: "Reference" },
  { id: "architecture", label: "Architecture", group: "Reference" },
  { id: "security-model", label: "Security model", group: "Reference" },
  { id: "troubleshooting", label: "Troubleshooting", group: "Help" },
  { id: "support-contact", label: "Support & contact", group: "Help" },
];

const ROUTES: Array<{ path: string; label: string; detail: string; icon: LucideIcon }> = [
  {
    path: "/",
    label: "Marketing site",
    detail: "Public landing page and product story.",
    icon: BookOpen,
  },
  {
    path: "/docs",
    label: "This guide",
    detail: "In-app product and API reference.",
    icon: FileText,
  },
  {
    path: "/dashboard",
    label: "Role shell",
    detail: "Legacy role-switching shell; successful sign-ins land on role homes.",
    icon: Building2,
  },
  {
    path: "/login",
    label: "Global role selector",
    detail: "Manual selector only; it does not choose a default tenant.",
    icon: KeyRound,
  },
  {
    path: "/tenant-login/[slug]",
    label: "Tenant role login",
    detail: "Manual entry point for a specific tenant workspace.",
    icon: Users,
  },
  {
    path: "/super-admin",
    label: "Platform control",
    detail: "Super Admin home for platform-wide work.",
    icon: ShieldCheck,
  },
];

const ROLES: Array<{
  label: string;
  slug: string;
  home: string;
  detail: string;
  icon: LucideIcon;
}> = [
  {
    label: "Super Admin",
    slug: "super_admin",
    home: "/super-admin",
    detail: "Platform-wide control and oversight.",
    icon: ShieldCheck,
  },
  {
    label: "Hospital Admin",
    slug: "hospital_admin",
    home: "/admin",
    detail: "Facility settings, users, and module controls.",
    icon: Building2,
  },
  {
    label: "Doctor",
    slug: "doctor",
    home: "/doctor",
    detail: "Consultations, records, and Copilot review.",
    icon: Stethoscope,
  },
  {
    label: "Nurse",
    slug: "nurse",
    home: "/nurse",
    detail: "Care delivery, vitals, and medication updates.",
    icon: HeartPulse,
  },
  {
    label: "Lab Technician",
    slug: "lab_technician",
    home: "/lab-technician",
    detail: "Orders, samples, and result verification.",
    icon: Microscope,
  },
  {
    label: "Pharmacist",
    slug: "pharmacist",
    home: "/pharmacist",
    detail: "Prescription validation and dispensing.",
    icon: Pill,
  },
  {
    label: "Accountant",
    slug: "accountant",
    home: "/accountant",
    detail: "Invoices, payments, and reconciliation.",
    icon: Wallet,
  },
  {
    label: "Receptionist",
    slug: "receptionist",
    home: "/reception",
    detail: "Appointments, registration, and check-in.",
    icon: CalendarCheck2,
  },
  {
    label: "Patient",
    slug: "patient",
    home: "/patient",
    detail: "Personal records and appointments.",
    icon: Users,
  },
  {
    label: "Guardian",
    slug: "guardian",
    home: "/guardian",
    detail: "Dependent care overview.",
    icon: HeartPulse,
  },
];

const TENANT_ALIASES = [
  { role: "Hospital Admin", segment: "admin", alias: "hospital-admin" },
  { role: "Doctor", segment: "doctor", alias: "—" },
  { role: "Nurse", segment: "nurse", alias: "—" },
  { role: "Lab Technician", segment: "lab", alias: "lab-technician" },
  { role: "Pharmacist", segment: "pharmacy", alias: "pharmacist" },
  { role: "Accountant", segment: "accountant", alias: "accounts" },
  { role: "Receptionist", segment: "reception", alias: "receptionist" },
  { role: "Patient", segment: "patient", alias: "patient-portal" },
  { role: "Guardian", segment: "guardian", alias: "—" },
];

const MODULES: Array<{
  title: string;
  tag: string;
  description: string;
  roles: string;
  workflow: string;
  icon: LucideIcon;
}> = [
  {
    title: "Front desk flow",
    tag: "Appointments",
    icon: CalendarCheck2,
    description: "Book appointments, register patients, manage check-ins, and watch the live queue move.",
    roles: "Receptionist · Hospital Admin · Doctor",
    workflow: "Register → check in → assign to queue → consult",
  },
  {
    title: "Clinical command",
    tag: "EMR / EHR",
    icon: ClipboardList,
    description: "Consultations, notes, diagnoses, vitals, and results in one medical timeline.",
    roles: "Doctor · Nurse · Hospital Admin",
    workflow: "Queue → consult → document → order → review",
  },
  {
    title: "Diagnostic pipeline",
    tag: "Laboratory",
    icon: Microscope,
    description: "Track lab orders from request to signed result with priorities, worklists, and review controls.",
    roles: "Lab Technician · Doctor · Nurse",
    workflow: "Order → collect → analyze → verify → release",
  },
  {
    title: "Dispense hub",
    tag: "Pharmacy",
    icon: Pill,
    description: "Medications, prescriptions, stock, and safety alerts in one pharmacy workspace.",
    roles: "Pharmacist · Doctor · Nurse",
    workflow: "Prescribe → validate → dispense → counsel → record",
  },
  {
    title: "Finance grid",
    tag: "Billing",
    icon: Receipt,
    description: "Invoices, payments, reconciliation, and insurance claims tied to the encounter.",
    roles: "Accountant · Hospital Admin · Super Admin",
    workflow: "Encounter → invoice → payment → claim → settlement",
  },
  {
    title: "Intelligence layer",
    tag: "AI & analytics",
    icon: Sparkles,
    description: "Plain-language questions and role-aware operational signals grounded in permitted records.",
    roles: "Doctor · Nurse · Hospital Admin",
    workflow: "Ask → ground → cite → review → decide",
  },
];

const API_ENDPOINTS: Array<{ method: "GET" | "POST" | "PUT"; path: string; purpose: string }> = [
  { method: "GET", path: "/api/patients", purpose: "List patients in the active tenant scope." },
  { method: "POST", path: "/api/patients", purpose: "Create a patient record." },
  { method: "GET", path: "/api/appointments", purpose: "List appointments." },
  { method: "POST", path: "/api/appointments", purpose: "Book an appointment." },
  { method: "GET", path: "/api/visits", purpose: "List visits." },
  { method: "POST", path: "/api/visits", purpose: "Create a visit." },
  { method: "GET", path: "/api/lab-orders", purpose: "List lab orders." },
  { method: "POST", path: "/api/lab-orders", purpose: "Create a lab order." },
  { method: "PUT", path: "/api/lab-orders", purpose: "Update a lab order." },
  { method: "GET", path: "/api/pharmacy/prescriptions", purpose: "List prescriptions." },
  { method: "POST", path: "/api/pharmacy/prescriptions", purpose: "Create a prescription." },
  { method: "GET", path: "/api/billing/invoices", purpose: "List invoices." },
  { method: "POST", path: "/api/billing/invoices", purpose: "Create an invoice." },
  { method: "POST", path: "/api/queue/add", purpose: "Add a patient to the live queue." },
  { method: "POST", path: "/api/copilot/query", purpose: "Permission-filtered, grounded answer." },
  { method: "POST", path: "/api/copilot/chat", purpose: "Scope-bound grounded tenant conversation." },
  { method: "POST", path: "/api/copilot/handoff", purpose: "Grounded shift handoff summary." },
  { method: "POST", path: "/api/copilot/insight", purpose: "Patient-specific note draft." },
  { method: "GET", path: "/api/copilot/overview", purpose: "Copilot counts for the panel." },
  {
    method: "POST",
    path: "/api/super-admin/copilot/chat",
    purpose: "Read-only platform operations conversation.",
  },
  { method: "GET", path: "/api/ai/summary/[id]", purpose: "Legacy patient-summary wrapper." },
  { method: "POST", path: "/api/contact", purpose: "Platform feedback routed to super admins." },
];

const STACK = [
  { label: "Framework", detail: "Next.js 16 App Router · React 18.3 · TypeScript 5.9" },
  { label: "Styling", detail: "Tailwind CSS 3.4 · Radix/Base UI · Lucide icons · next-themes" },
  { label: "Data", detail: "PostgreSQL with Drizzle ORM and the Neon serverless driver" },
  { label: "Auth & RBAC", detail: "Better Auth 1.6 with server-side role and permission checks" },
  { label: "Realtime", detail: "Socket.IO 4.8 · Redis 5 · ws" },
  {
    label: "AI",
    detail:
      "Server-only OpenAI-compatible SDK with OpenAI → NVIDIA → OpenRouter → Groq fallback and grounded service layers",
  },
  { label: "Messaging & payments", detail: "Twilio · Resend · Stripe" },
  {
    label: "Validation & observability",
    detail: "Zod 4 · React Hook Form · Sentry · Vercel Analytics · Speed Insights",
  },
];

const SECURITY_CONTROLS = [
  {
    title: "Role-based access",
    detail: "Permissions and session checks are enforced in route handlers and tenant-scoped services.",
  },
  {
    title: "Tenant isolation",
    detail: "Queries are bounded to the active hospital or care group; cross-tenant reads are rejected.",
  },
  {
    title: "Audit trails",
    detail: "Operational and sensitive events are written to activity logs for review.",
  },
  {
    title: "Module controls",
    detail: "Tenant preferences can enable or disable capabilities to match local workflows.",
  },
  {
    title: "Input validation",
    detail: "Public endpoints use schema validation; invalid submissions return 400.",
  },
  {
    title: "Rate limiting",
    detail: "Copilot and contact endpoints apply per-session or per-IP limits.",
  },
  {
    title: "Security headers",
    detail: "next.config.ts sets X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and HSTS.",
  },
  {
    title: "Tenant routing",
    detail: "proxy.ts rewrites subdomains to /tenant/[slug]/... and leaves API, static, and tenant paths untouched.",
  },
];

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11.5px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {children}
    </code>
  );
}

function Section({
  id,
  number,
  title,
  description,
  children,
}: {
  id: string;
  number: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 border-t border-slate-200 pt-12 first:border-t-0 first:pt-0 dark:border-slate-800"
    >
      <div className="flex items-start gap-4">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 font-mono text-[11px] font-semibold text-orange-700 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
          {number}
        </span>
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">{title}</h2>
          {description && (
            <p className="mt-2 max-w-2xl text-[14px] leading-7 text-slate-600 dark:text-slate-400">{description}</p>
          )}
        </div>
      </div>
      <div className="mt-7 space-y-5 sm:pl-12">{children}</div>
    </section>
  );
}

function Callout({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: "note" | "warning" | "success";
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  const tones = {
    note: "border-orange-200 bg-orange-50/70 text-orange-950 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-100",
    warning:
      "border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100",
    success:
      "border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100",
  };

  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">{title}</p>
          <div className="mt-1.5 text-[12.5px] leading-6 opacity-90">{children}</div>
        </div>
      </div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-[14px] leading-6 text-slate-600 dark:text-slate-400">
          <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-orange-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function MethodBadge({ method }: { method: "GET" | "POST" | "PUT" }) {
  const tones = {
    GET: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
    POST: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    PUT: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  };

  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold ring-1 ${tones[method]}`}>
      {method}
    </span>
  );
}

const FAQS: Array<{ question: string; answer: ReactNode }> = [
  {
    question: "Why do I land on a role selector instead of a tenant?",
    answer: (
      <>
        This is expected after the routing revert. <InlineCode>{"/login"}</InlineCode> is the manual global role
        selector and does not pick a default tenant. Use your organization’s tenant URL or{" "}
        <InlineCode>{"/tenant-login/<slug>"}</InlineCode> to reach the tenant role picker.
      </>
    ),
  },
  {
    question: "Why does Copilot say I do not have clinical access?",
    answer: (
      <>
        Copilot routes require an account with clinical permissions. If your role cannot read the relevant record
        type, the server returns <InlineCode>403</InlineCode>. Ask your Hospital Admin to review role assignments.
      </>
    ),
  },
  {
    question: "Why is a patient outside my Copilot scope?",
    answer: (
      <>
        Patient-specific queries are limited to the signed-in user’s permission scope. For doctors, that means
        assigned care scope; other permitted roles use tenant scope. A <InlineCode>404</InlineCode> means the patient
        or queue entry is outside that scope in the tenant.
      </>
    ),
  },
  {
    question: "Why did Copilot tell me to start a new chat?",
    answer: (
      <>
        Browser-session history is bound to the tenant, user, patient focus, and permission scope issued with the
        first reply. If those change, the server returns <InlineCode>400</InlineCode> instead of replaying stale
        turns. Clear the chat or start a new one.
      </>
    ),
  },
  {
    question: "What does a 429 Copilot response mean?",
    answer: (
      <>
        You hit the per-doctor rate limit. Query, chat, insight, and overview requests are limited to 20 per minute;
        handoff is limited to 12 per minute. Wait briefly and retry.
      </>
    ),
  },
  {
    question: "My tenant subdomain does not resolve. What should I check?",
    answer: (
      <>
        Confirm the tenant domain and DNS configuration. <InlineCode>proxy.ts</InlineCode> rewrites recognized
        subdomains to <InlineCode>{"/tenant/[slug]/..."}</InlineCode>; API, static, and explicit tenant paths are left
        untouched.
      </>
    ),
  },
  {
    question: "How do I add or change a user?",
    answer: (
      <>
        After the first account is bootstrapped, public signup is disabled. Super Admins and Hospital Admins create
        users inside Joan. For help with an existing account, use the{" "}
        <Link href="/contact" className="font-semibold text-orange-600 hover:text-orange-700">
          contact page
        </Link>
        .
      </>
    ),
  },
];

export default function DocumentationPage() {
  return (
    <div id="top" className="min-h-screen bg-subtle text-foreground dark:bg-slate-950 dark:text-slate-100">
      <MarketingNav />

      <main className="pb-24 pt-28 sm:pt-32">
        <section className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[28px] border border-orange-200/70 bg-white px-6 py-12 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] dark:border-orange-500/20 dark:bg-slate-900 sm:px-10 lg:px-14 lg:py-16">
            <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-orange-100/70 blur-3xl dark:bg-orange-500/10" />
            <div className="relative max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/70 bg-orange-50/80 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300">
                <BookOpen className="h-3.5 w-3.5" />
                Current product guide
              </span>
              <h1 className="mt-7 text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.05em] text-slate-950 dark:text-white sm:text-5xl">
                Joan documentation.
              </h1>
              <p className="mt-6 max-w-2xl text-[15px] leading-8 text-slate-600 dark:text-slate-400">
                A practical guide to the current codebase: how access works, which modules connect, what the Copilot
                can safely do, and where the API boundaries sit.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {["Next.js 16 App Router", "10 role workspaces", "Grounded Copilot", "Post-revert routing"].map(
                  (chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
                    >
                      {chip}
                    </span>
                  )
                )}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#quick-start"
                  className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-3 text-[13px] font-semibold text-white shadow-[0_14px_32px_-14px_rgba(234,88,12,0.9)] transition-colors hover:bg-orange-700"
                >
                  Start with quick start
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-[13px] font-semibold text-slate-700 transition-colors hover:border-orange-300 hover:text-orange-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-orange-500/40 dark:hover:text-orange-300"
                >
                  Ask the platform team
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto mt-12 grid max-w-7xl grid-cols-1 gap-8 px-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:px-8">
          <DocsRail sections={SECTIONS} />

          <article className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900 sm:p-10">
            <Callout tone="note" icon={FileText} title="Read this first">
              This guide reflects the current <InlineCode>main</InlineCode> branch after the routing revert. It
              replaces older notes that described a default tenant resolver or a different API stack.
            </Callout>

            <div className="mt-12 space-y-14">
              <Section
                id="overview"
                number="01"
                title="Overview"
                description="What Joan is, and where the public and in-app surfaces sit."
              >
                <p className="text-[14px] leading-7 text-slate-600 dark:text-slate-400">
                  Joan is a Next.js healthcare operating system for hospitals, clinics, labs, pharmacies, and
                  multi-site care networks. It brings ten role-specific workspaces, tenant isolation,
                  server-enforced permissions, real-time queues, and a grounded clinical Copilot into one
                  application.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {ROUTES.map((route) => (
                    <div
                      key={route.path}
                      className="rounded-2xl border border-slate-200 bg-[#FBFAF8] p-4 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-orange-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-orange-300 dark:ring-slate-700">
                          <route.icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{route.label}</p>
                          <p className="mt-1 font-mono text-[10.5px] text-orange-700 dark:text-orange-300">
                            {route.path}
                          </p>
                          <p className="mt-2 text-[11.5px] leading-5 text-slate-600 dark:text-slate-400">
                            {route.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Callout tone="success" icon={ShieldCheck} title="Security posture, not a certification">
                  Joan uses security-conscious defaults, but no source tree makes a deployment compliant by itself.
                  Your infrastructure, policies, contracts, access controls, and professional review determine your
                  obligations and posture.
                </Callout>
              </Section>

              <Section
                id="quick-start"
                number="02"
                title="Quick start"
                description="Get a local instance running and bootstrap the first administrator."
              >
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-orange-600" />
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Local development
                  </p>
                </div>
                <BulletList
                  items={[
                    "Node.js >= 18 and npm >= 9",
                    "Git and a PostgreSQL connection string; Neon works well",
                    "Optional: Redis, Copilot model-provider, Twilio, Resend, Stripe, and worker credentials",
                  ]}
                />
                <CodeBlock
                  label="Shell"
                  code={`npm install

# Full bootstrap chain; replaces the three database/seed steps below
npm run setup

# Or run the steps individually
npm run db:push
npm run db:init
npm run dev:seed

# Start Next.js at http://localhost:3000
npm run dev

# Optional standalone Socket.IO server
npm run dev:socket`}
                />
                <p className="text-[14px] leading-7 text-slate-600 dark:text-slate-400">
                  The first administrator comes from either the seed script or the first-user flow. Set{" "}
                  <InlineCode>SEED_SUPER_ADMIN_EMAIL</InlineCode> and{" "}
                  <InlineCode>SEED_SUPER_ADMIN_PASSWORD</InlineCode> in your local environment for{" "}
                  <InlineCode>npm run dev:seed</InlineCode>, or visit <InlineCode>/signup</InlineCode> while the
                  platform has zero users. Public signup is disabled afterward; administrators create users inside
                  Joan.
                </p>
                <Callout tone="warning" icon={LockKeyhole} title="Keep secrets server-only">
                  No <InlineCode>.env</InlineCode> file is committed. Core variable names include{" "}
                  <InlineCode>DATABASE_URL</InlineCode>, <InlineCode>BETTER_AUTH_SECRET</InlineCode>,{" "}
                  <InlineCode>BETTER_AUTH_URL</InlineCode>, and <InlineCode>NEXT_PUBLIC_APP_URL</InlineCode>. Never
                  expose Copilot credentials to the browser. Configure{" "}
                  <InlineCode>OPENAI_API_KEY</InlineCode>, <InlineCode>NVIDIA_API_KEY</InlineCode>,{" "}
                  <InlineCode>OPENROUTER_API_KEY</InlineCode>, or <InlineCode>GROQ_API_KEY</InlineCode> on the
                  server; Copilot uses the first configured provider that returns a valid response.{" "}
                  <InlineCode>OPENAI_MODEL</InlineCode>, <InlineCode>NVIDIA_MODEL</InlineCode>,{" "}
                  <InlineCode>OPENROUTER_MODEL</InlineCode>, and <InlineCode>GROQ_MODEL</InlineCode> are optional
                  server-only model overrides.
                </Callout>
              </Section>

              <Section
                id="access-roles"
                number="03"
                title="Access & roles"
                description="Canonical roles, labels, and post-sign-in homes from lib/rbac.ts."
              >
                <p className="text-[14px] leading-7 text-slate-600 dark:text-slate-400">
                  Navigation and quick actions are scoped by role, but hidden UI is not the only control. Route
                  handlers and tenant-scoped services enforce permissions on the server.
                </p>

                <Callout tone="warning" icon={KeyRound} title="Global selector is not tenant routing">
                  <InlineCode>{"/login"}</InlineCode> is the manual global role selector. After the revert it does
                  not resolve or redirect to a default tenant. Tenant members use their organization’s tenant URL or
                  a tenant role login page.
                </Callout>

                <div className="grid gap-3 sm:grid-cols-2">
                  {ROLES.map((role) => (
                    <div
                      key={role.slug}
                      className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-orange-200 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-orange-500/30"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
                          <role.icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{role.label}</p>
                          <p className="mt-0.5 font-mono text-[10.5px] text-slate-400">{role.slug}</p>
                          <p className="mt-2 text-[11.5px] leading-5 text-slate-600 dark:text-slate-400">
                            {role.detail}
                          </p>
                          <p className="mt-2 font-mono text-[10.5px] text-orange-700 dark:text-orange-300">
                            {role.home}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section
                id="tenant-access-flow"
                number="04"
                title="Tenant access flow"
                description="How subdomains, tenant logins, and role homes connect."
              >
                <p className="text-[14px] leading-7 text-slate-600 dark:text-slate-400">
                  Tenant subdomains are rewritten by <InlineCode>proxy.ts</InlineCode> to{" "}
                  <InlineCode>{"/tenant/[slug]/..."}</InlineCode>. There is no <InlineCode>middleware.ts</InlineCode>{" "}
                  in this codebase. API, static, <InlineCode>/tenant/</InlineCode>, and{" "}
                  <InlineCode>/tenant-login/</InlineCode> paths are left untouched.
                </p>

                <CodeBlock
                  label="Subdomain rewrites"
                  code={`north.example.com/            -> /tenant/north/login
north.example.com/doctor     -> /tenant/north/doctor
acme.localhost:3000/          -> /tenant/acme/login
acme.localhost:3000/reception -> /tenant/acme/reception`}
                />

                <p className="text-[14px] leading-7 text-slate-600 dark:text-slate-400">
                  On the root domain, open <InlineCode>{"/tenant-login/<slug>"}</InlineCode> for the manual tenant
                  role selector. There is no automatic default-tenant resolver after the revert. Once inside a
                  tenant, role homes use these segments under{" "}
                  <InlineCode>{"/tenant/<slug>/"}</InlineCode> on the root domain, or at the root on a tenant
                  subdomain.
                </p>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[440px] text-left text-[12.5px]">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold">Tenant segment</th>
                        <th className="px-4 py-3 font-semibold">Alias</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {TENANT_ALIASES.map((row) => (
                        <tr key={row.role} className="text-slate-600 dark:text-slate-400">
                          <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{row.role}</td>
                          <td className="px-4 py-2.5">
                            <InlineCode>{row.segment}</InlineCode>
                          </td>
                          <td className="px-4 py-2.5">{row.alias === "—" ? "—" : <InlineCode>{row.alias}</InlineCode>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section
                id="core-modules"
                number="05"
                title="Core modules"
                description="Six connected workspaces from front desk through finance and intelligence."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {MODULES.map((module) => (
                    <div
                      key={module.title}
                      className="rounded-2xl border border-slate-200 bg-[#FBFAF8] p-5 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-orange-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-orange-300 dark:ring-slate-700">
                          <module.icon className="h-5 w-5" />
                        </span>
                        <span className="rounded-full border border-orange-200/70 bg-white px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300">
                          {module.tag}
                        </span>
                      </div>
                      <h3 className="mt-4 text-[15px] font-semibold text-slate-950 dark:text-white">{module.title}</h3>
                      <p className="mt-2 text-[12.5px] leading-6 text-slate-600 dark:text-slate-400">
                        {module.description}
                      </p>
                      <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-[11.5px] dark:border-slate-700">
                        <div className="flex flex-wrap gap-x-2">
                          <dt className="font-semibold text-slate-500 dark:text-slate-400">Roles</dt>
                          <dd className="text-slate-700 dark:text-slate-200">{module.roles}</dd>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <dt className="font-semibold text-slate-500 dark:text-slate-400">Flow</dt>
                          <dd className="text-slate-700 dark:text-slate-200">{module.workflow}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              </Section>

              <Section
                id="ai-copilot"
                number="06"
                title="AI Copilot"
                description="Grounded tenant chat and a separate read-only platform assistant, both with server-side scope enforcement."
              >
                <p className="text-[14px] leading-7 text-slate-600 dark:text-slate-400">
                  Copilot is decision support, not an autonomous clinician or a general medical chatbot. It answers
                  only from tenant-scoped records rebuilt on every turn and filtered by the signed-in user’s
                  permissions; doctors keep assignment scoping while other permitted roles use tenant scope. Generic
                  medical questions and unsupported claims are declined. Conversation history is held in the browser
                  tab session only, never stored as a server transcript, and is replayed only when its server-issued
                  scope envelope still matches the current tenant, user, patient focus, and permissions.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      title: "Tenant-scoped",
                      detail: "Context is restricted to the authenticated user’s tenant.",
                      icon: Building2,
                    },
                    {
                      title: "Permission-aware",
                      detail: "Server-side checks decide which record categories may be read.",
                      icon: ShieldCheck,
                    },
                    {
                      title: "Source-linked",
                      detail: "Answers include allowlisted references for verification.",
                      icon: FileText,
                    },
                    {
                      title: "Review-first",
                      detail: "Responses are drafts for clinician review, not final decisions.",
                      icon: ClipboardList,
                    },
                    {
                      title: "Session-only chat",
                      detail: "History stays in browser-tab session storage; no server transcript is written.",
                      icon: MessageSquare,
                    },
                    {
                      title: "Scope-bound history",
                      detail: "Stale turns from another tenant, user, patient, or role set are rejected.",
                      icon: ShieldCheck,
                    },
                    {
                      title: "Separate platform control",
                      detail:
                        "Super admins use a read-only assistant with its own gate, data layer, and controls.",
                      icon: Building2,
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                        <item.icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[12.5px] font-semibold text-slate-900 dark:text-white">{item.title}</p>
                        <p className="mt-1 text-[11.5px] leading-5 text-slate-600 dark:text-slate-400">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Callout tone="warning" icon={Sparkles} title="Verify before acting">
                  Copilot answers may be incomplete or incorrect and are not a diagnosis or treatment
                  recommendation. “Add to note” places text in the local editor; it never silently writes to a
                  clinical record.
                </Callout>

                <CodeBlock
                  label="POST /api/copilot/chat"
                  code={`{
  "message": "Which abnormal lab results need review?",
  "history": [{ "role": "user", "content": "What needs attention today?" }],
  "historyScope": {
    "version": 1,
    "tenantId": "server-issued",
    "userId": "server-issued",
    "patientId": null,
    "queueId": null,
    "scopeToAssignee": false,
    "allowedCategories": ["queue", "lab"]
  },
  "patientId": "optional-patient-id",
  "queueId": "optional-queue-id"
}`}
                />

                <p className="text-[14px] leading-7 text-slate-600 dark:text-slate-400">
                  <InlineCode>message</InlineCode> is 1–500 characters and{" "}
                  <InlineCode>history</InlineCode> holds at most 8 prior user/assistant turns, capped at 1,000
                  characters each. The server rebuilds and re-authorizes context on every turn; client history is
                  continuity text only, never evidence or permission. <InlineCode>historyScope</InlineCode> is the
                  server-issued envelope from the previous reply; a mismatch returns <InlineCode>400</InlineCode>{" "}
                  before any prior turn reaches the model. Chat, query, insight, and overview are limited to 20
                  requests per minute; handoff to 12 per minute. The older{" "}
                  <InlineCode>POST /api/copilot/query</InlineCode> one-shot endpoint remains available.
                </p>

                <CodeBlock
                  label="POST /api/super-admin/copilot/chat"
                  code={`{
  "message": "How many tenants are active?",
  "history": [],
  "historyScope": {
    "version": 1,
    "actorId": "server-issued",
    "access": "platform",
    "dataLayer": "platform_operations+read_only_clinical_metadata"
  }
}`}
                />

                <p className="text-[14px] leading-7 text-slate-600 dark:text-slate-400">
                  Platform Copilot has a separate session-derived super-admin gate, a read-only data layer, and a
                  stricter 10-requests-per-minute limit. Its request shape intentionally rejects{" "}
                  <InlineCode>patientId</InlineCode>, <InlineCode>queueId</InlineCode>,{" "}
                  <InlineCode>tenantId</InlineCode>, and <InlineCode>role</InlineCode>. It answers from platform
                  operations plus aggregate clinical counts, trends, and opaque record identifiers. It does not
                  include note text, patient details, or write actions.
                </p>
              </Section>

              <Section
                id="api-reference"
                number="07"
                title="API reference"
                description="Same-origin REST endpoints resolved through an authenticated session."
              >
                <p className="text-[14px] leading-7 text-slate-600 dark:text-slate-400">
                  Calls use the signed-in browser session. Route handlers resolve the session, tenant, and role
                  before touching data, so an endpoint is never an unauthenticated shortcut around the UI.
                </p>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[560px] text-left text-[12.5px]">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Method</th>
                        <th className="px-4 py-3 font-semibold">Endpoint</th>
                        <th className="px-4 py-3 font-semibold">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {API_ENDPOINTS.map((endpoint) => (
                        <tr key={`${endpoint.method}:${endpoint.path}`} className="text-slate-600 dark:text-slate-400">
                          <td className="px-4 py-2.5">
                            <MethodBadge method={endpoint.method} />
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-900 dark:text-slate-100">
                            {endpoint.path}
                          </td>
                          <td className="px-4 py-2.5">{endpoint.purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <CodeBlock
                  label="Browser fetch"
                  code={`const response = await fetch("/api/copilot/query", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    question: "Summarize the urgent queue for this shift.",
  }),
});

if (!response.ok) {
  throw new Error("Copilot request failed");
}

const answer = await response.json();`}
                />
                <p className="text-[12.5px] leading-6 text-slate-500 dark:text-slate-400">
                  <Code2 className="mr-1 inline h-3.5 w-3.5 text-orange-600" />
                  Use relative paths from inside the app so the session cookie is sent automatically. Do not paste
                  secrets into request bodies.
                </p>
              </Section>

              <Section
                id="architecture"
                number="08"
                title="Architecture"
                description="App Router structure and the runtime pieces behind each workflow."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {STACK.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <p className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-900 dark:text-white">
                        <Layers3 className="h-3.5 w-3.5 text-orange-600" />
                        {item.label}
                      </p>
                      <p className="mt-1.5 text-[11.5px] leading-5 text-slate-600 dark:text-slate-400">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>

                <CodeBlock
                  label="Repository shape"
                  code={`app/
  (dashboard)/   # dedicated role workspaces
  api/           # REST route handlers
  docs/          # this guide
  tenant/        # tenant-scoped UI
lib/
  rbac.ts        # canonical roles and homes
  tenant-routing.ts
  copilot/       # grounding, context, and access
proxy.ts         # subdomain -> /tenant/[slug]/...`}
                />
              </Section>

              <Section
                id="security-model"
                number="09"
                title="Security model"
                description="The guardrails implemented in the current codebase."
              >
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[520px] text-left text-[12.5px]">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Guardrail</th>
                        <th className="px-4 py-3 font-semibold">Current implementation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {SECURITY_CONTROLS.map((control) => (
                        <tr key={control.title} className="text-slate-600 dark:text-slate-400">
                          <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{control.title}</td>
                          <td className="px-4 py-2.5">{control.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Callout tone="note" icon={ShieldCheck} title="Clinical responsibility">
                  This table describes product behavior, not legal status. Clinicians remain responsible for the
                  records they enter and the decisions they make. Copilot output is support material that must be
                  checked against source records.
                </Callout>
              </Section>

              <Section
                id="troubleshooting"
                number="10"
                title="Troubleshooting"
                description="Quick answers to the issues that most often come up during onboarding."
              >
                <div className="space-y-3">
                  {FAQS.map((faq) => (
                    <details
                      key={faq.question}
                      className="group rounded-2xl border border-slate-200 bg-[#FBFAF8] open:bg-white dark:border-slate-800 dark:bg-slate-800/40 dark:open:bg-slate-800/70"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[13px] font-semibold text-slate-900 [&::-webkit-details-marker]:hidden dark:text-white">
                        <span>{faq.question}</span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="border-t border-slate-200 px-5 py-4 text-[12.5px] leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-400">
                        {faq.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </Section>

              <Section
                id="support-contact"
                number="11"
                title="Support & contact"
                description="Where to send deployment, support, billing, security, and accessibility questions."
              >
                <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-7 text-white sm:p-9">
                  <div className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
                  <div className="relative">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-orange-200">
                      <LifeBuoy className="h-3.5 w-3.5" />
                      Need a hand?
                    </span>
                    <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                      Talk to the platform team.
                    </h3>
                    <p className="mt-3 max-w-xl text-[13px] leading-6 text-slate-400">
                      Use the contact page for deployment, support, billing, partnership, security, or accessibility
                      questions. Requests are stored as platform feedback and routed to the Joan super admin team.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href="/contact"
                        className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-orange-700"
                      >
                        Open contact page
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <a
                        href="mailto:support@joan.health"
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-[13px] font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        support@joan.health
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      icon: Inbox,
                      title: "Captured",
                      detail: "POST /api/contact writes a platform feedback record with a reference number.",
                    },
                    {
                      icon: MessageSquare,
                      title: "Triaged",
                      detail: "Active super admins get an in-app notification; email is sent when configured.",
                    },
                    {
                      icon: Clock3,
                      title: "Not emergency",
                      detail: "For immediate clinical emergencies, contact local emergency services.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <item.icon className="h-4 w-4 text-orange-600" />
                      <p className="mt-3 text-[12.5px] font-semibold text-slate-900 dark:text-white">{item.title}</p>
                      <p className="mt-1.5 text-[11.5px] leading-5 text-slate-600 dark:text-slate-400">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>

                <Callout tone="warning" icon={LockKeyhole} title="Do not send clinical data">
                  This is a platform contact channel, not a clinical record. Remove patient names, MRNs, lab values,
                  and other identifiers before sending a message.
                </Callout>
              </Section>
            </div>
          </article>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
