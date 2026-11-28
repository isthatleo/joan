<div align="center">
  <img src="public/assets/icons/logo-full.svg" width="280" alt="Joan Healthcare OS" />
  <br />
  <br />
  <h1>Joan Healthcare OS</h1>
  <h3>One operating system for every moment of care.</h3>
  <p><strong>Healthcare OS for modern teams.</strong> From the front desk to the final claim, Joan brings appointments, clinical records, labs, pharmacy, and finance into one multi-tenant workspace.</p>

  <p>
    <a href="https://joan.health" target="_blank"><strong>Product site</strong></a> ·
    <a href="https://joan.health/docs" target="_blank"><strong>Documentation</strong></a> ·
    <a href="https://github.com/isthatleo/Joan" target="_blank"><strong>GitHub</strong></a> ·
    <a href="mailto:support@joan.health"><strong>Support</strong></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16.2.6-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 16.2.6" />
    <img src="https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18.3.1" />
    <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5.9" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 3.4" />
    <img src="https://img.shields.io/badge/PostgreSQL-Drizzle-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL with Drizzle" />
    <img src="https://img.shields.io/badge/Better_Auth-1.6-00A482?style=for-the-badge&logo=auth0&logoColor=white" alt="Better Auth" />
    <img src="https://img.shields.io/badge/OpenAI-6.x-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI" />
    <img src="https://img.shields.io/badge/Socket.IO-4.8-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.IO" />
    <img src="https://img.shields.io/badge/Lucide-Icons-F56565?style=for-the-badge" alt="Lucide icons" />
    <img src="https://img.shields.io/badge/Sentry-10.51-362D59?style=for-the-badge&logo=sentry&logoColor=white" alt="Sentry" />
    <img src="https://img.shields.io/badge/Vercel-Analytics-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel Analytics" />
    <img src="https://img.shields.io/badge/Zustand-4.5-764ABC?style=for-the-badge" alt="Zustand" />
  </p>
</div>

---

## 📋 Contents

- [What Joan is](#-what-joan-is)
- [Current product language](#-current-product-language)
- [Platform modules](#-platform-modules)
- [Role-specific workspaces](#-role-specific-workspaces)
- [One continuous workflow](#-one-continuous-workflow)
- [Product tour and deployment tiers](#-product-tour-and-deployment-tiers)
- [Visual asset library](#-visual-asset-library)
- [Grounded AI Copilot](#-grounded-ai-copilot)
- [Security and isolation model](#-security-and-isolation-model)
- [Integrations](#-integrations)
- [Tech stack](#-tech-stack)
- [Quick start](#-quick-start)
- [Environment variables](#-environment-variables)
- [Scripts and validation](#-scripts-and-validation)
- [Repository map](#-repository-map)
- [Route map](#-route-map)
- [Documentation](#-documentation)
- [Contributing and support](#-contributing-and-support)

---

## 🤖 What Joan is

Joan is a Next.js healthcare operating system for hospitals, clinics, labs, pharmacies, and multi-site care networks. It combines ten role-specific workspaces, tenant isolation, server-enforced permissions, real-time queues, and a grounded clinical Copilot in one application.

Important routing facts:

- `/` is the public marketing landing page.
- `/dashboard` still exists as a role-switching dashboard shell, but successful logins land on dedicated role homes from `ROLE_HOME` in `lib/rbac.ts`.
- `/docs` serves in-app documentation.
- `/login`, `/master`, `/signup`, and `/tenant-login/[slug]` are authentication entry points.
- Tenant subdomains are rewritten to `/tenant/[slug]/...` by `proxy.ts`. There is no `middleware.ts` in this codebase.

> **Compliance note:** Joan is built with security-conscious defaults, but no source tree by itself makes a deployment HIPAA-, GDPR-, or locally compliant. Compliance depends on your infrastructure, policies, contracts, access controls, and professional review. “Audit-ready” and “Compliance exports” below describe product capabilities, not certifications.

---

## 🧭 Current product language

The current landing metadata and rendered copy use these names and phrases:

| Item | Current value | Source |
| --- | --- | --- |
| Brand | `joan.` with sub-label `Healthcare OS` | `components/marketing/Brand.tsx` |
| Metadata title | `Joan — Healthcare OS for connected care` | `app/page.tsx` |
| Open Graph title | `Joan — One operating system for every moment of care` | `app/page.tsx` |
| Site name | `Joan Healthcare OS` | `app/page.tsx` |
| Canonical metadata domain | `https://joan.health` | `app/page.tsx` |
| Hero eyebrow | `Healthcare OS for modern teams` | `components/marketing/Hero.tsx` |
| Hero headline | `One operating system for every moment of care.` | `components/marketing/Hero.tsx` |
| Hero signals | `10 role-specific workspaces`, `6 deployment tiers`, `Real-time queues` | `components/marketing/Hero.tsx` |
| Footer line | `Built for care that never stops.` | `components/marketing/MarketingFooter.tsx` |
| Support email | `support@joan.health` | Marketing nav, footer, FAQ, contact page |

Domain note: `joan.health` is the canonical domain in public metadata. Some auth and socket fallbacks still reference `joanhealth.tech`, so deployments should set `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SOCKET_URL`, and tenant-domain variables explicitly.

---

## 🧩 Platform modules

The landing page module cards use `ModuleExplorer`. Clicking **Explore module** opens a keyboard-accessible dialog with the module summary, capabilities, roles, and workflow. Escape and outside-click close it, focus moves to the close button, and body scroll is locked while the dialog is open.

| Module | Tag | What it does | Capabilities | Roles | Workflow |
| --- | --- | --- | --- | --- | --- |
| 📅 **Front desk flow** | `Appointments` | Book appointments, register patients, manage check-ins, and watch the live queue move. | Calendar booking with room/clinician awareness; patient registration and identity matching; arrival check-in, walk-ins, and live queue status; front-desk handoff without re-keying. | Receptionist, Hospital admin, Doctor | Register → check in → assign to queue → consult |
| 📋 **Clinical command** | `EMR / EHR` | Consultations, notes, diagnoses, vitals, and results in one medical timeline. | Structured consultation notes; vitals and observations over time; history, allergies, and conditions in context; grounded Copilot suggestions with sources. | Doctor, Nurse, Hospital admin | Queue → consult → document → order → review |
| 🔬 **Diagnostic pipeline** | `Laboratory` | Track lab orders from request to signed result. | Routine, urgent, and STAT priority; sample status tracking and technician worklists; abnormal-value signals; doctor review and patient-facing release controls. | Lab technician, Doctor, Nurse | Order → collect → analyze → verify → release |
| 💊 **Dispense hub** | `Pharmacy` | Medications, prescriptions, stock, and interaction alerts in one pharmacy workspace. | Prescription validation and dispensing queue; medication inventory and low-stock visibility; interaction/allergy alerts; patient instructions and refill tracking. | Pharmacist, Doctor, Nurse | Prescribe → validate → dispense → counsel → record |
| 💳 **Finance grid** | `Billing` | Invoices, payments, reconciliation, and insurance claims tied to the encounter. | Encounter-based invoicing and payment recording; insurance claim preparation and tracking; finance reconciliation views; role-scoped financial reporting. | Accountant, Hospital admin, Super admin | Encounter → invoice → payment → claim → settlement |
| ✨ **Intelligence layer** | `AI & analytics` | Plain-language questions and role-aware operational signals grounded in permitted records. | Tenant- and permission-scoped clinical answers; source-linked summaries for clinician review; operational dashboards for each role; local-only note insertion with no silent record writes. | Doctor, Nurse, Hospital admin | Ask → ground → cite → review → decide |

---

## 🎭 Role-specific workspaces

Canonical roles, labels, and default post-login homes come from `lib/rbac.ts`. Tenant homes and aliases come from `lib/tenant-routing.ts`. Public descriptions come from `app/page.tsx`.

| Icon | Role label | Canonical slug | Public description | Login home | Tenant home / aliases |
| :---: | --- | --- | --- | --- | --- |
| 🛡️ | **Super Admin** | `super_admin` | Global platform control | `/super-admin` | Platform-level only |
| 🏥 | **Hospital Admin** | `hospital_admin` | Full facility oversight | `/admin` | `admin`; `/hospital-admin` → `admin` |
| 🩺 | **Doctor** | `doctor` | Consultations & records | `/doctor` | `doctor` |
| ❤️ | **Nurse** | `nurse` | Care & vital statistics | `/nurse` | `nurse` |
| 🔬 | **Lab Technician** | `lab_technician` | Tests & results | `/lab-technician` | `lab`; `/lab-technician` → `lab` |
| 💊 | **Pharmacist** | `pharmacist` | Medications & inventory | `/pharmacist` | `pharmacy`; `/pharmacist` → `pharmacy` |
| 💰 | **Accountant** | `accountant` | Billing & financial control | `/accountant` | `accountant`; `/accounts` → `accountant` |
| 📇 | **Receptionist** | `receptionist` | Scheduling & admissions | `/reception` | `reception`; `/receptionist` → `reception` |
| 🧑‍🤝‍🧑 | **Patient** | `patient` | Records & appointments | `/patient` | `patient`; `/patient-portal` alias exists |
| 👶 | **Guardian** | `guardian` | Dependent care | `/guardian` | `guardian` |

Access facts:

- Navigation, quick actions, and data access are scoped by role.
- Server-side authorization and tenant checks are enforced at API boundaries; hidden UI is not the only control.
- The normal `/login` role picker exposes nine staff/family roles. The first account is bootstrapped through `/signup`, which assigns `super_admin` server-side only while the platform has zero users.
- After bootstrap, public signup is disabled; new users are created by Super Admins or Hospital Admins inside Joan.

---

## 🔄 One continuous workflow

The landing page describes the care continuum and workflow as:

`📅 Front desk` → `🩺 Clinical care` → `🔬 Lab & pharmacy` → `💳 Finance & claims`

Expanded steps:

1. **Register & check in** — Create a global patient identity and move the patient into the live queue.
2. **Consult & document** — Capture notes, vitals, diagnoses, and prescriptions in a unified clinical record.
3. **Test & dispense** — Route lab orders and prescriptions to the right team with visible status.
4. **Bill & reconcile** — Turn the encounter into an invoice or claim and track it through settlement.

Every handoff keeps clinical and operational context together, with permissions checked at the API boundary and tenant boundaries applied to queries.

---

## 🎟️ Product tour and deployment tiers

The current `ProductTour` has three tabs:

| Tab | Icon area | Description |
| --- | --- | --- |
| **Command center** | `LayoutDashboard` | Operational clarity across every department, in one live view. |
| **Clinical workspace** | `Stethoscope` | The full patient story — notes, vitals, results, and prescriptions. |
| **Patient & family** | `HeartPulse` | A calmer experience for patients and the people who care for them. |

The current `Pricing` component exposes six deployment tiers:

| Tier | Monthly | Annual | Staff | Patients | Storage | Support | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| **Starter Clinic** | $99 | $990 | 8 | 500 | 25 GB | Email support | Patient registry, appointments, basic billing |
| **Growth Practice** | $249 | $2,490 | 35 | 2,500 | 100 GB | Priority support | **Most popular**; pharmacy, lab, claims, role permissions |
| **Regional Hospital** | $599 | $5,990 | 120 | 10,000 | 500 GB | Priority support | Department analytics, advanced audit logs, broadcasts, integrations |
| **Enterprise Network** | $1,299 | $12,990 | 400 | 50,000 | 2,000 GB | Enterprise support | Unlimited departments, compliance exports, custom integrations |
| **Teaching Hospital** | $1,799 | $17,990 | 650 | 80,000 | 3,500 GB | Enterprise support | Research reports, training departments, advanced scheduling, onboarding |
| **National Health System** | $3,499 | $34,990 | 1,500 | 250,000 | 10,000 GB | White-glove support | **National scale** badge; custom SLA, strategic reporting |

Annual billing is presented as **2 months free**. Every tenant can be configured with its own modules, roles, and limits.

---

## 🖼️ Visual asset library

All curated artwork referenced here lives under `public/assets/`. Runtime uploads in `public/avatars/` and `public/uploads/tenants/` are not presented as curated README artwork.

### Current product artwork

<table>
  <tr>
    <td align="center" width="50%">
      <strong>Command center / admin</strong><br />
      <img src="public/assets/images/admin.png" width="420" alt="Joan command center" />
    </td>
    <td align="center" width="50%">
      <strong>Appointment flow</strong><br />
      <img src="public/assets/images/appointment-img.png" width="420" alt="Joan appointment flow" />
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <strong>Registration flow</strong><br />
      <img src="public/assets/images/register-img.png" width="420" alt="Joan registration flow" />
    </td>
    <td align="center" width="50%">
      <strong>Onboarding flow</strong><br />
      <img src="public/assets/images/onboarding-img.png" width="420" alt="Joan onboarding flow" />
    </td>
  </tr>
</table>

### Status backgrounds and confirmation artwork

| Asset | Preview | Purpose |
| --- | --- | --- |
| `appointments-bg.png` | <img src="public/assets/images/appointments-bg.png" width="140" alt="Appointments background" /> | Appointment/status background artwork. |
| `pending-bg.png` | <img src="public/assets/images/pending-bg.png" width="140" alt="Pending background" /> | Pending-status background artwork. |
| `cancelled-bg.png` | <img src="public/assets/images/cancelled-bg.png" width="140" alt="Cancelled background" /> | Cancelled-status background artwork. |
| `success.gif` | <img src="public/assets/gifs/success.gif" width="140" alt="Success animation" /> | Success confirmation animation. |

### Clinician portraits

| | | |
| :---: | :---: | :---: |
| <img src="public/assets/images/dr-cameron.png" width="110" alt="Dr. Cameron" /><br />`dr-cameron.png` | <img src="public/assets/images/dr-cruz.png" width="110" alt="Dr. Cruz" /><br />`dr-cruz.png` | <img src="public/assets/images/dr-green.png" width="110" alt="Dr. Green" /><br />`dr-green.png` |
| <img src="public/assets/images/dr-lee.png" width="110" alt="Dr. Lee" /><br />`dr-lee.png` | <img src="public/assets/images/dr-livingston.png" width="110" alt="Dr. Livingston" /><br />`dr-livingston.png` | <img src="public/assets/images/dr-peter.png" width="110" alt="Dr. Peter" /><br />`dr-peter.png` |
| <img src="public/assets/images/dr-powell.png" width="110" alt="Dr. Powell" /><br />`dr-powell.png` | <img src="public/assets/images/dr-remirez.png" width="110" alt="Dr. Ramirez" /><br />`dr-remirez.png` | <img src="public/assets/images/dr-sharma.png" width="110" alt="Dr. Sharma" /><br />`dr-sharma.png` |

> The `dr-remirez.png` filename is the repository asset name; the displayed label uses that exact filename.

### Interface icons

| Logo | Appointments | Calendar | Check | Check circle | Close | Email |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| <img src="public/assets/icons/logo-icon.svg" width="26" alt="Joan logo icon" /> | <img src="public/assets/icons/appointments.svg" width="26" alt="Appointments icon" /> | <img src="public/assets/icons/calendar.svg" width="26" alt="Calendar icon" /> | <img src="public/assets/icons/check.svg" width="26" alt="Check icon" /> | <img src="public/assets/icons/check-circle.svg" width="26" alt="Check circle icon" /> | <img src="public/assets/icons/close.svg" width="26" alt="Close icon" /> | <img src="public/assets/icons/email.svg" width="26" alt="Email icon" /> |

| Loader | Pending | Cancelled | Upload | User | Arrow | Full logo |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| <img src="public/assets/icons/loader.svg" width="26" alt="Loader icon" /> | <img src="public/assets/icons/pending.svg" width="26" alt="Pending icon" /> | <img src="public/assets/icons/cancelled.svg" width="26" alt="Cancelled icon" /> | <img src="public/assets/icons/upload.svg" width="26" alt="Upload icon" /> | <img src="public/assets/icons/user.svg" width="26" alt="User icon" /> | <img src="public/assets/icons/arrow.svg" width="26" alt="Arrow icon" /> | <img src="public/assets/icons/logo-full.svg" width="90" alt="Joan full logo" /> |

The landing interface itself is built from accessible, icon-driven React components using Lucide icons, responsive Tailwind grids, and a light/dark/system theme toggle persisted as `joan-theme`.

---

## ✨ Grounded AI Copilot

The Copilot assists clinicians; it does not replace clinical judgment. Super admins use a separate Platform Copilot.

- **Tenant-scoped:** tenant chat context is restricted to the authenticated user's tenant.
- **Permission-aware:** server-side checks decide which records may be read on every turn.
- **Assignment-aware:** doctors keep queue/visit assignment scoping; the URL slug never grants access.
- **Session-only chat:** history lives in browser-tab session storage; no server-side transcript is written.
- **Source-linked:** answers include allowlisted references the clinician can inspect.
- **Review-first:** responses are framed as drafts for clinician review.
- **Local-only insertion:** “Add to note” places text in the local editor; it never silently writes to a clinical record.
- **Separate platform control:** Platform Copilot is read-only, super-admin-gated, and uses platform operations plus aggregate clinical metadata — no note text or patient details.
- **Rate-limited:** chat, query, and insight routes are limited to 20 requests/minute; handoff to 12/minute; platform chat to 10/minute.

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/copilot/query` | `POST` | One-shot, permission-filtered clinical question. |
| `/api/copilot/chat` | `POST` | Grounded multi-turn tenant conversation. |
| `/api/copilot/handoff` | `POST` | Grounded shift/handoff summary. |
| `/api/copilot/insight` | `POST` | Focused insight for a selected patient or context. |
| `/api/copilot/overview` | `GET` | Safe overview context for the Copilot panel. |
| `/api/super-admin/copilot/chat` | `POST` | Read-only platform operations conversation. |
| `/api/ai/summary/[id]` | `GET` | Legacy patient-summary wrapper around the grounded service. |

Copilot credentials are server-only. Never prefix them with `NEXT_PUBLIC_` or expose them to the browser. Configure `OPENAI_API_KEY`, `NVIDIA_API_KEY`, `OPENROUTER_API_KEY`, or `GROQ_API_KEY`; Copilot uses the first configured provider that returns a valid response in that order. `OPENAI_MODEL`, `NVIDIA_MODEL`, `OPENROUTER_MODEL`, and `GROQ_MODEL` are optional server-only overrides.

---

## 🛡️ Security and isolation model

| Guardrail | Current implementation |
| --- | --- |
| 🔐 Role-based access | Permissions and session checks are enforced in route handlers and tenant-scoped services. |
| 🏗️ Tenant isolation | Queries are bounded to the active hospital or care group; cross-tenant reads are rejected. |
| 🧾 Audit trails | Operational and sensitive events are written to audit/activity logs for review. |
| 🎛️ Module controls | Tenant preferences can enable or disable capabilities to match local workflows. |
| 🧩 Input validation | Public endpoints use schema validation; invalid submissions return `400`. |
| ⏱️ Rate limiting | Copilot and contact endpoints apply per-session or per-IP limits. |
| 🌐 Security headers | `next.config.ts` sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and HSTS headers. |
| 🧭 Tenant routing | `proxy.ts` rewrites subdomains to `/tenant/[slug]/...` and leaves API/static/tenant paths untouched. |

This is a security posture description, not a certification or legal compliance claim.

---

## 🔌 Integrations

Current landing-page integration labels:

`✨ OpenAI` · `⚡ Socket.IO` · `📱 Twilio` · `✉️ Resend` · `💳 Stripe` · `🧩 REST APIs`

Additional runtime/observability packages:

- **OpenAI-compatible SDK** — grounded Copilot with OpenAI → NVIDIA → OpenRouter → Groq fallback.
- **Socket.IO + Redis** — real-time queue and notification updates.
- **Twilio** — SMS notifications, with optional WhatsApp number support.
- **Resend** — transactional email and contact routing.
- **Stripe** — payment tooling.
- **Sentry**, **Vercel Analytics**, and **Speed Insights** — runtime observability.
- **Supabase client mapping** — `next.config.ts` maps `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## ⚙️ Tech stack

- **Framework:** Next.js 16 App Router, React 18.3
- **Language:** TypeScript 5.9
- **Styling:** Tailwind CSS 3.4, Radix/Base UI primitives, Lucide icons, `next-themes`
- **Data:** PostgreSQL with Drizzle ORM and the Neon serverless driver; `pg` and Kysely also present
- **Auth:** Better Auth 1.6 with role and permission checks
- **State/data:** TanStack Query, TanStack Table, Zustand
- **Realtime:** Socket.IO 4.8, Redis 5, `ws`
- **AI:** OpenAI SDK 6.x with a grounded service layer
- **Observability:** Sentry 10.51, Vercel Analytics, Speed Insights
- **Messaging/payments:** Twilio 5, Resend 6, Stripe 14
- **Validation/forms:** Zod 4, React Hook Form, Input OTP
- **Node requirement:** `>=18`; npm `>=9`

---

## 🚀 Quick start

### Prerequisites

- Node.js `>=18`
- npm `>=9`
- Git
- PostgreSQL connection string; Neon works well
- Optional: Redis, OpenAI, Twilio, Resend, Stripe, Supabase, and worker credentials

### Clone and install

```bash
git clone https://github.com/isthatleo/Joan.git
cd Joan
npm install
```

### Bootstrap identity and database

Choose one of the two supported first-admin paths:

1. **Seed script:** set `SEED_SUPER_ADMIN_EMAIL` and `SEED_SUPER_ADMIN_PASSWORD`, then run `npm run setup`.
2. **First-user signup:** run the database steps, start the app, and visit `/signup` while the platform has zero users. The first account is assigned `super_admin` server-side; public signup is disabled afterward.

```bash
# Full setup chain: install, push schema, initialize core data, seed super admin
npm run setup

# Or run the steps individually
npm run db:push
npm run db:init
npm run dev:seed
```

### Start development

```bash
# Start Next.js at http://localhost:3000
npm run dev

# Optional: start the standalone WebSocket server
npm run dev:socket
```

No `.env` file is committed to this repository. Create your local environment file outside version control and keep server secrets server-only.

---

## 🔐 Environment variables

Values below are references found in code. Set only what your deployment uses.

### Core required

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL/Neon connection string. |
| `BETTER_AUTH_SECRET` | Long random secret used by Better Auth. |
| `BETTER_AUTH_URL` | Canonical Better Auth base URL. |
| `NEXT_PUBLIC_APP_URL` | Public app URL used in links and callbacks. |

### Auth, domains, and tenancy

| Variable | Purpose |
| --- | --- |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Comma-separated trusted origins for Better Auth. |
| `BETTER_AUTH_ALLOWED_HOSTS` | Comma-separated allowed hosts for Better Auth. |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Root domain used by tenant-routing helpers. |
| `NEXT_PUBLIC_TENANT_DOMAINS` | Configured tenant domains. |
| `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` | Production URL exposed to the client. |
| `ROOT_DOMAIN` | Root domain used by `proxy.ts`. |
| `VERCEL_PROJECT_PRODUCTION_URL` | Vercel production URL used by `proxy.ts`. |
| `VERCEL_URL` | Vercel deployment URL used by `proxy.ts`. |

### AI, integrations, and storage

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | **Server-only** Copilot credential; first provider in the fallback chain. |
| `OPENAI_MODEL` | Optional OpenAI model override; defaults to `gpt-4o-mini`. |
| `NVIDIA_API_KEY` | **Server-only** fallback Copilot credential. |
| `NVIDIA_MODEL` | Optional NVIDIA model override. |
| `OPENROUTER_API_KEY` | **Server-only** fallback Copilot credential. |
| `OPENROUTER_MODEL` | Optional OpenRouter model override. |
| `GROQ_API_KEY` | **Server-only** fallback Copilot credential. |
| `GROQ_MODEL` | Optional Groq model override. |
| `INTEGRATIONS_ENCRYPTION_KEY` | Base64 key used by integration crypto helpers. |
| `REDIS_URL` | Redis connection; defaults to `redis://localhost:6379` where used. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | SMS credentials and sender. |
| `TWILIO_WHATSAPP_NUMBER` | Optional WhatsApp sender. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email credentials and sender identity. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Mapped by `next.config.ts` into public Supabase variables. |

### Realtime and TURN

| Variable | Purpose |
| --- | --- |
| `SOCKET_PORT`, `PORT` | Standalone WebSocket server port configuration. |
| `SOCKET_CORS_ORIGIN` | Allowed origin for socket connections. |
| `NEXT_PUBLIC_SOCKET_URL` | Browser socket URL. |
| `NEXT_PUBLIC_TURN_URLS`, `NEXT_PUBLIC_TURN_USERNAME`, `NEXT_PUBLIC_TURN_CREDENTIAL` | TURN configuration for realtime/media features. |

### Worker and internal secrets

| Variable | Purpose |
| --- | --- |
| `APPOINTMENT_REMINDER_WORKER_SECRET` | Protects the appointment-reminder worker route. |
| `PATIENT_ACCESS_SYNC_SECRET` | Protects patient-access sync. |
| `SCHEDULED_REPORTS_WORKER_SECRET` | Protects scheduled report workers. |
| `PURGE_WORKER_SECRET` | Protects tenant purge worker. |
| `INTERNAL_API_KEY` | Protects the internal send route. |

### Bootstrap, operations, and E2E

| Variable | Purpose |
| --- | --- |
| `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD` | Required by `npm run dev:seed`; do not use hard-coded default credentials. |
| `UNLOCK_EMAIL` | Target account for `npm run user:unlock`. |
| `E2E_BASE_URL`, `E2E_TENANT_SLUG` | Base URL and tenant for release smoke tests. |
| `E2E_AUTH_COOKIE`, `E2E_HOSPITAL_ADMIN_COOKIE`, `E2E_SUPER_ADMIN_COOKIE` | Session cookies for authenticated smoke checks. |
| `LOCAL_STORAGE_QUOTA_BYTES`, `STORAGE_QUOTA_BYTES`, `STORAGE_PROVIDER_NAME` | System metrics labels/thresholds. |
| `NEXT_PUBLIC_APP_VERSION` | Public version label reported by the health endpoint. |

`NEXT_PUBLIC_ADMIN_PASSKEY` appears in older passkey UI code and should not be treated as a recommended production authentication mechanism.

---

## 🧪 Scripts and validation

### Available scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run dev:socket` | Start the standalone Socket.IO server. |
| `npm run build` | Production build. |
| `npm run start` | Start the production server. |
| `npm run lint` | Run ESLint. |
| `npm run type-check` | Run `tsc --noEmit`. |
| `npm run format` | Format files with Prettier. |
| `npm run test:accountant` | Accountant finance POST regression test. |
| `npm run verify:e2e:smoke` | Release E2E smoke checks. |
| `npm run verify:ship` | Type-check, lint, accountant test, npm audit, and build. |
| `npm run db:generate` | Generate Drizzle migrations. |
| `npm run db:push` | Push the Drizzle schema. |
| `npm run db:studio` | Open Drizzle Studio. |
| `npm run db:init` | Initialize core database data. |
| `npm run dev:seed` | Seed the super admin from environment variables. |
| `npm run setup` | Install, push schema, initialize data, and seed. |
| `npm run user:unlock` | Unlock a user account. |
| `npm run tenant:repair-admin` | Repair a tenant admin assignment. |

### Pre-ship checks

```bash
npm run type-check
npm run lint -- --quiet
npm run test:accountant
npm run verify:e2e:smoke
npm run build
```

Combined release gate:

```bash
npm run verify:ship
```

`verify:ship` includes `npm audit --audit-level=high`, so resolve high-severity advisories before shipping.

---

## 📁 Repository map

```text
joan/
├── app/
│   ├── (dashboard)/              # Dedicated role dashboards and shared dashboard shell
│   ├── accessibility/            # Public accessibility page
│   ├── api/                      # 60 route groups / 431 route.ts files
│   ├── contact/                  # Detailed contact routing page
│   ├── cookie/                   # Cookie policy
│   ├── docs/                     # In-app documentation
│   ├── login/                    # Primary staff/family login
│   ├── master/                   # Super-admin entry
│   ├── privacy/                  # Privacy policy
│   ├── refund/                   # Refund policy
│   ├── security/                 # Security information
│   ├── signup/                   # First-user super-admin bootstrap
│   ├── tenant/                   # Tenant-scoped UI
│   ├── tenant-login/             # Public tenant login pages
│   ├── terms/                    # Terms of service
│   └── page.tsx                  # Public marketing landing page
├── components/
│   ├── auth/                     # Tenant role login and auth UI
│   ├── copilot/                  # Grounded Copilot panel
│   ├── marketing/                # Landing, product tour, pricing, FAQ, footer, module explorer, theme toggle
│   ├── theme/                    # Theme provider
│   └── ui/                       # Reusable interface primitives
├── hooks/                        # Custom React hooks
├── lib/
│   ├── auth/                     # Auth helpers
│   ├── copilot/                  # Grounding, context, and source logic
│   ├── db/                       # Drizzle schema, client, and init
│   ├── services/                 # Business logic
│   ├── rbac.ts                   # App roles, labels, and login homes
│   ├── tenant-routing.ts         # Tenant homes and aliases
│   └── ws-server.ts              # Socket.IO server
├── public/
│   ├── assets/gifs/              # Success animation
│   ├── assets/icons/             # Logo and interface icons
│   └── assets/images/            # Product artwork, status backgrounds, clinician portraits
├── scripts/                      # Release and repair scripts
├── stores/                       # Zustand stores
├── proxy.ts                      # Subdomain rewrite proxy
└── package.json
```

---

## 🧭 Route map

### Public and auth

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing page with module explorer, product tour, pricing, and theme toggle. |
| `/contact` | Detailed contact routing to the super-admin feedback queue. |
| `/docs` | Platform and API documentation. |
| `/privacy`, `/terms`, `/refund`, `/cookie` | Legal pages. |
| `/security`, `/accessibility` | Security and accessibility information. |
| `/login` | Primary role-based sign-in. |
| `/master` | Super-admin entry. |
| `/signup` | First-admin bootstrap; disabled after the first user exists. |
| `/tenant-login/[slug]` | Public tenant-specific role login. |
| `/tenant/[slug]/...` | Tenant-scoped workspaces reached directly or via subdomain rewrite. |

### Application role homes

`/super-admin`, `/admin`, `/doctor`, `/nurse`, `/lab-technician`, `/pharmacist`, `/accountant`, `/reception`, `/patient`, `/guardian`, plus `/dashboard` as the role-switching shell.

### API groups

`app/api/` contains 60 top-level groups and 431 `route.ts` files. Major groups:

<details>
<summary>Show all API groups</summary>

`accountant`, `activity-logging`, `ai`, `analytics`, `appointments`, `audit`, `audit-logs`, `auth`, `billing`, `compliance`, `contact`, `copilot`, `departments`, `doctor`, `feedback`, `fingerprinting`, `global-analytics`, `guardian`, `health`, `hospital`, `hospital-admin`, `inventory`, `lab`, `lab-orders`, `lab-results`, `messages`, `messaging-settings`, `mobile`, `notifications`, `nurse`, `operations`, `patient-access`, `patients`, `payments`, `permissions`, `pharmacy`, `platform`, `platform-broadcasts`, `prescriptions`, `provisioning-runs`, `public`, `queue`, `realtime`, `reports`, `retainer-plans`, `roles`, `security-events`, `send`, `sentry-example-api`, `sessions`, `staff`, `subscription-plans`, `super-admin`, `system`, `tenant`, `tenants`, `upload`, `users`, `visits`, `vitals`.

</details>

Representative API areas:

- **Auth/bootstrap:** `auth/first-user`, `auth/bootstrap`, `auth/login-guard`, `auth/otp`, `auth/password-reset`, `auth/role`, `auth/assign-role`
- **Contact:** `contact` validates and rate-limits submissions, stores `feedbacks`, and notifies active Super Admins.
- **Copilot:** `copilot/query`, `copilot/chat`, `copilot/handoff`, `copilot/insight`, `copilot/overview`, `super-admin/copilot/chat`, and legacy `ai/summary/[id]`.
- **Clinical:** `doctor`, `nurse`, `lab`, `lab-orders`, `lab-results`, `pharmacy`, `prescriptions`, `patients`, `appointments`, `queue`, `vitals`, `visits`
- **Finance:** `billing`, `payments`, `retainer-plans`, `subscription-plans`, `platform/billing/pesapal`, `super-admin/billing`
- **Tenant/platform:** `tenant/[slug]/...` and `tenants/[slug]/...`, `super-admin`, `platform`, `hospital`, `system`, `roles`, `permissions`, `users`, `sessions`
- **Security/audit:** `audit`, `audit-logs`, `security-events`, `fingerprinting`, `activity-logging`
- **Realtime/messaging:** `messages`, `notifications`, `platform-broadcasts`, `feedback`, `send`, `realtime`, `mobile`

---

## 📚 Documentation

- [Quick start guide](QUICKSTART.md)
- [Quick reference](QUICK_REFERENCE.md)
- [Super admin overview](SUPER_ADMIN_COMPLETE.md)
- [Documentation index](DOCUMENTATION_INDEX.md)
- [In-app documentation](https://joan.health/docs)

Some older markdown guides still contain historical dates, double-slash URLs, or pre-Better Auth details. When documentation conflicts with source, treat `app/`, `components/`, `lib/`, `proxy.ts`, and `package.json` as authoritative.

---

## 🤝 Contributing and support

1. Create a focused branch from `main`.
2. Keep server-side authorization and tenant checks in place for any new data access.
3. Never commit secrets or prefix server keys with `NEXT_PUBLIC_`.
4. Follow the current App Router structure and heed Next.js deprecation notices in `node_modules/next/dist/docs/` when changing framework code.
5. Run the validation commands above.
6. Open a pull request describing behavior and affected routes.

Questions, demos, or deployment help:

- <a href="mailto:support@joan.health">support@joan.health</a>
- <a href="https://joan.health/contact" target="_blank">Contact page</a>
- <a href="https://github.com/isthatleo/Joan" target="_blank">GitHub repository</a>

<div align="center">
  <br />
  <img src="public/assets/icons/logo-icon.svg" width="42" alt="Joan icon" />
  <br />
  <sub>Built for care that never stops.</sub>
</div>
