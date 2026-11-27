<div align="center">
  <img src="public/assets/icons/logo-full.svg" width="260" alt="Joan Healthcare OS" />
  <br />
  <br />
  <h1>One operating system for every moment of care.</h1>
  <p><strong>Joan</strong> unifies appointments, clinical records, labs, pharmacy, and finance in one role-aware, multi-tenant healthcare workspace — from the front desk to the final claim.</p>

  <p>
    <a href="https://joanhealth.tech/" target="_blank"><strong>Live site</strong></a> ·
    <a href="https://joanhealth.tech/docs" target="_blank"><strong>Documentation</strong></a> ·
    <a href="mailto:support@joan.health"><strong>Contact support</strong></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16.2.6-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/PostgreSQL-Drizzle-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL with Drizzle" />
    <img src="https://img.shields.io/badge/Better_Auth-Session_RBAC-00A482?style=for-the-badge&logo=auth0&logoColor=white" alt="Better Auth" />
    <img src="https://img.shields.io/badge/OpenAI-Grounded_Copilot-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI Copilot" />
    <img src="https://img.shields.io/badge/Lucide-Icons-F56565?style=for-the-badge&logo=lucide&logoColor=white" alt="Lucide icons" />
    <img src="https://img.shields.io/badge/Sentry-Observability-362D59?style=for-the-badge&logo=sentry&logoColor=white" alt="Sentry" />
  </p>
</div>

---

## 📋 Table of contents

- [🤖 Introduction](#-introduction)
- [🧩 Platform modules](#-platform-modules)
- [🎭 Role-specific workspaces](#-role-specific-workspaces)
- [🔄 One continuous workflow](#-one-continuous-workflow)
- [🖼️ Visual tour](#️-visual-tour)
- [✨ Grounded AI Copilot](#-grounded-ai-copilot)
- [🛡️ Security and isolation model](#️-security-and-isolation-model)
- [🔌 Integrations](#-integrations)
- [⚙️ Tech stack](#️-tech-stack)
- [🚀 Quick start](#-quick-start)
- [🧪 Validation and release checks](#-validation-and-release-checks)
- [📁 Repository map](#-repository-map)
- [🧭 Route map](#-route-map)
- [📚 Documentation](#-documentation)
- [🤝 Contributing](#-contributing)
- [📞 Support](#-support)

---

## 🤖 Introduction

Joan is a Next.js healthcare operating system for hospitals, clinics, and multi-site care networks. It brings the full patient journey into a single bounded workspace with ten role-specific dashboards, tenant isolation, server-enforced permissions, real-time queues, and a grounded clinical Copilot.

The public landing page lives at `/`; the role-switching dashboard remains available at `/dashboard`. Documentation is served at `/docs`, and public legal/info pages cover privacy, terms, refunds, cookies, security, and accessibility.

> **Design note:** Joan is built with security-conscious defaults, but no code alone makes a deployment compliant. Compliance readiness — including HIPAA, GDPR, or local health-data rules — depends on your infrastructure, policies, contracts, and review.

---

## 🧩 Platform modules

The landing page module cards open detailed, keyboard-accessible dialogs. Each module is grounded in the same patient and tenant record model, so teams do not hand off context through spreadsheets or disconnected tools.

| Icon | Module | What it does | Key workflow |
| :---: | --- | --- | --- |
| 📅 | **Front desk flow** | Calendar booking, patient registration, arrival check-in, walk-ins, and a live queue. | Register → check in → assign to queue → consult |
| 📋 | **Clinical command** | Consultation notes, diagnoses, vitals, patient history, results, and source-linked AI support. | Queue → consult → document → order → review |
| 🔬 | **Diagnostic pipeline** | Lab orders with routine/urgent/STAT priority, technician worklists, abnormal flags, and sign-off. | Order → collect → analyze → verify → release |
| 💊 | **Dispense hub** | Prescription validation, medication inventory, interaction/allergy alerts, and refill tracking. | Prescribe → validate → dispense → counsel → record |
| 💳 | **Finance grid** | Encounter-based invoices, payment capture, insurance claims, reconciliation, and reporting. | Encounter → invoice → payment → claim → settlement |
| ✨ | **Intelligence layer** | Tenant- and permission-scoped Copilot answers with sources, plus role-aware operational views. | Ask → ground → cite → review → decide |

---

## 🎭 Role-specific workspaces

Each role sees a workspace tuned to its responsibilities. Navigation, quick actions, and data access are enforced on the server — not just hidden in the UI.

| Icon | Role | Focus |
| :---: | --- | --- |
| 🛡️ | **Super Admin** | Platform-wide control, tenants, roles, feedback, system health, and billing. |
| 🏥 | **Hospital Admin** | Facility oversight, staff, departments, workflow, security, and reporting. |
| 🩺 | **Doctor** | Queues, consultations, records, lab orders, prescriptions, and analytics. |
| ❤️ | **Nurse** | Vitals, care plans, medications, beds, ward handoffs, and queue movement. |
| 🔬 | **Lab Technician** | Orders, sample status, result entry, quality control, and lab analytics. |
| 💊 | **Pharmacist** | Dispensing, inventory, interactions, suppliers, and pharmacy analytics. |
| 💰 | **Accountant** | Invoices, payments, claims, expenses, budgets, revenue, and reports. |
| 📇 | **Receptionist** | Appointments, registration, check-in, waiting room, and queue operations. |
| 🧑‍🤝‍🧑 | **Patient** | Appointments, records, results, prescriptions, bills, and feedback. |
| 👶 | **Guardian** | Dependent appointments, records, results, vaccinations, and family oversight. |

---

## 🔄 One continuous workflow

`📅 Register & check in` → `🩺 Consult & document` → `🔬 Test & dispense` → `💳 Bill & reconcile`

Every handoff retains clinical and operational context, with permissions checked at the API boundary and tenant boundaries applied to queries.

---

## 🖼️ Visual tour

Product artwork included in this repository:

<table>
  <tr>
    <td align="center" width="50%">
      <strong>Command center</strong><br />
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
      <img src="public/assets/images/register-img.png" width="420" alt="Joan patient registration flow" />
    </td>
    <td align="center" width="50%">
      <strong>Onboarding flow</strong><br />
      <img src="public/assets/images/onboarding-img.png" width="420" alt="Joan onboarding flow" />
    </td>
  </tr>
</table>

The landing interface itself is built from accessible, icon-driven React components using Lucide icons, responsive Tailwind grids, and a light/dark/system theme toggle.

---

## ✨ Grounded AI Copilot

The Copilot is designed to assist clinicians — not replace clinical judgment.

- **Tenant-scoped:** context is restricted to the authenticated doctor's tenant.
- **Permission-aware:** server-side checks decide which records may be read.
- **Source-linked:** answers include allowlisted references the clinician can inspect.
- **Review-first:** responses are framed as drafts for clinician review.
- **Local-only insertion:** “Add to note” places text in the local editor; it never silently writes to a clinical record.

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/copilot/query` | `POST` | Free-form, grounded clinical question. |
| `/api/copilot/handoff` | `POST` | Grounded shift/handoff summary. |
| `/api/copilot/insight` | `POST` | Focused insight for a selected patient or context. |
| `/api/copilot/overview` | `GET` | Safe overview context for the Copilot panel. |
| `/api/ai/summary/[id]` | `GET` | Legacy patient summary wrapper around the grounded service. |

`OPENAI_API_KEY` is server-only and must never be prefixed with `NEXT_PUBLIC_`.

---

## 🛡️ Security and isolation model

| Guardrail | Implementation |
| --- | --- |
| 🔐 Role-based access | Permissions and session checks are enforced in route handlers and tenant-scoped services. |
| 🏗️ Tenant isolation | Queries are bounded to the active hospital or care group; cross-tenant reads are rejected. |
| 🧾 Audit trails | Operational and sensitive events are written to audit/activity logs for review. |
| 🎛️ Module controls | Tenant preferences can enable or disable capabilities to match local workflows. |
| 🧩 Input validation | Public endpoints use schema validation; invalid submissions return `400`. |
| ⏱️ Rate limiting | Copilot requests are rate-limited per user/session. |

This is a security posture description, not a certification or legal compliance claim.

---

## 🔌 Integrations

`✨ OpenAI` · `⚡ Socket.IO` · `📱 Twilio` · `✉️ Resend` · `💳 Stripe` · `🧩 REST APIs` · `📊 Sentry` · `🔍 Vercel Analytics`

- **OpenAI** powers the grounded Copilot using `gpt-4o-mini` by default; override with server-only `OPENAI_MODEL`.
- **Socket.IO** supports real-time queue and notification updates.
- **Twilio** sends SMS notifications.
- **Resend** handles transactional email and contact routing.
- **Stripe** supports payment tooling.
- **Sentry**, Vercel Analytics, and Speed Insights provide runtime observability.

---

## ⚙️ Tech stack

- **Framework:** Next.js 16 App Router, React 18
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Radix primitives, Lucide icons
- **Data:** PostgreSQL with Drizzle ORM and Neon serverless driver
- **Auth:** Better Auth with role and permission checks
- **State/data:** TanStack Query, TanStack Table, Zustand
- **Realtime:** Socket.IO, Redis
- **AI:** OpenAI SDK with grounded service layer
- **Observability:** Sentry, Vercel Analytics, Speed Insights
- **Messaging/payments:** Twilio, Resend, Stripe

---

## 🚀 Quick start

### Prerequisites

- Node.js `>=18`
- npm `>=9`
- Git
- A PostgreSQL connection string (Neon works well)
- Optional: Redis, OpenAI, Twilio, Resend, and Stripe credentials

### Clone and install

```bash
git clone https://github.com/isthatleo/joan.git
cd joan
npm install
```

### Configure environment variables

Create your local env file outside version control. Do **not** commit secrets or expose server keys with `NEXT_PUBLIC_`.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL/Neon connection string. |
| `BETTER_AUTH_SECRET` | Yes | Use a long random value in production. |
| `BETTER_AUTH_URL` | Yes | Canonical auth URL. |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL used in links and callbacks. |
| `OPENAI_API_KEY` | For Copilot | **Server-only.** Never expose to the browser. |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini`. |
| `INTEGRATIONS_ENCRYPTION_KEY` | For encrypted integrations | Base64 key used by the integration crypto helpers. |
| `REDIS_URL` | No | Defaults to `redis://localhost:6379`. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | For SMS | Twilio credentials. |
| `RESEND_API_KEY`, `EMAIL_FROM` | For email | Resend credentials and sender. |
| `NEXT_PUBLIC_SOCKET_URL` | For realtime | Socket server URL. |

### Prepare the database and start

```bash
# Push the Drizzle schema, initialize core data, and seed the first super admin
npm run setup

# Start Next.js
npm run dev

# Optional: start the standalone WebSocket server
npm run dev:socket
```

Open `http://localhost:3000`.

---

## 🧪 Validation and release checks

Run these before opening a pull request or shipping:

```bash
npm run type-check
npm run lint -- --quiet
npm run test:accountant
npm run verify:e2e:smoke
npm run build
```

The combined release gate is:

```bash
npm run verify:ship
```

Useful operational scripts:

```bash
npm run db:generate   # Generate Drizzle migrations
npm run db:push       # Push schema changes
npm run db:studio     # Inspect the database
npm run user:unlock   # Unlock a user account
npm run tenant:repair-admin # Repair a tenant admin assignment
```

---

## 📁 Repository map

```text
joan/
├── app/
│   ├── (dashboard)/        # Role-specific dashboards
│   ├── api/                # Route handlers, auth, Copilot, tenant APIs
│   ├── docs/               # Public documentation
│   ├── login/              # Authentication entry
│   ├── master/             # Super-admin entry
│   ├── tenant/[slug]/      # Tenant-scoped workspaces
│   └── page.tsx            # Public marketing landing page
├── components/
│   ├── marketing/          # Landing, legal, contact, module explorer, theme toggle
│   ├── copilot/            # Grounded Copilot panel
│   ├── theme/              # Theme provider
│   └── ui/                 # Reusable interface primitives
├── hooks/                  # Custom React hooks
├── lib/
│   ├── auth/               # Auth and RBAC helpers
│   ├── copilot/            # Grounding, context, and source logic
│   ├── db/                 # Drizzle schema and client
│   ├── services/           # Business logic
│   └── ws-server.ts        # Socket.IO server
├── public/
│   ├── assets/icons/       # Logo and interface icons
│   └── assets/images/      # Product artwork used in this README
├── scripts/                # Release and repair scripts
├── stores/                 # Zustand stores
├── middleware.ts           # Auth and tenant routing middleware
└── package.json
```

---

## 🧭 Route map

### Public

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing page with module explorer and theme toggle. |
| `/contact` | Detailed contact routing to the super-admin feedback queue. |
| `/docs` | Platform and API documentation. |
| `/privacy`, `/terms`, `/refund`, `/cookie` | Legal pages. |
| `/security`, `/accessibility` | Security and accessibility information. |
| `/login`, `/master` | Authentication entry points. |

### Application

| Route pattern | Purpose |
| --- | --- |
| `/dashboard` | Role-switching dashboard shell. |
| `/doctor`, `/nurse`, `/reception`, `/pharmacist`, `/accountant`, etc. | Legacy/global role workspaces. |
| `/tenant/[slug]/...` | Tenant-scoped role workspaces and APIs. |
| `/super-admin/...` | Platform administration. |
| `/api/copilot/...` | Grounded Copilot endpoints. |
| `/api/contact` | Validated public contact submission endpoint. |

---

## 📚 Documentation

- [Quick start guide](QUICKSTART.md)
- [Quick reference](QUICK_REFERENCE.md)
- [Super admin overview](SUPER_ADMIN_COMPLETE.md)
- [In-app documentation](https://joanhealth.tech/docs)

---

## 🤝 Contributing

1. Create a focused branch from `main`.
2. Keep server-side authorization and tenant checks in place for any new data access.
3. Never add secrets to the repository or prefix server keys with `NEXT_PUBLIC_`.
4. Run the validation commands above.
5. Open a pull request with a clear description of behavior and affected routes.

---

## 📞 Support

Questions, demos, or deployment help:

- <a href="mailto:support@joan.health">support@joan.health</a>
- <a href="https://joanhealth.tech/contact" target="_blank">Contact page</a>
- <a href="https://joanhealth.tech/docs" target="_blank">Documentation</a>

<div align="center">
  <br />
  <img src="public/assets/icons/logo-icon.svg" width="38" alt="Joan icon" />
  <br />
  <sub>Built for connected care.</sub>
</div>
