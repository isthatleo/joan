import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  auditLogs,
  emailSendLog,
  notifications,
  platformInvoices,
  roles,
  subscriptionPlans,
  tenants,
  userRoles,
  users,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send-email";

export const DEFAULT_SUBSCRIPTION_PLANS = [
  {
    name: "Starter Clinic",
    code: "starter_clinic",
    description: "For small clinics starting with core appointment and patient workflows.",
    monthlyPrice: "99.00",
    yearlyPrice: "990.00",
    staffLimit: 8,
    clientLimit: 500,
    storageGb: 25,
    supportLevel: "standard",
    sortOrder: 1,
    features: ["Patient registry", "Appointments", "Basic billing", "Email support"],
    modules: ["appointments", "patients", "billing"],
  },
  {
    name: "Growth Practice",
    code: "growth_practice",
    description: "For growing hospitals needing pharmacy, lab, and finance workflows.",
    monthlyPrice: "249.00",
    yearlyPrice: "2490.00",
    staffLimit: 35,
    clientLimit: 2500,
    storageGb: 100,
    supportLevel: "priority",
    sortOrder: 2,
    features: ["Pharmacy", "Laboratory", "Insurance claims", "Role permissions"],
    modules: ["appointments", "patients", "billing", "pharmacy", "laboratory", "insurance"],
  },
  {
    name: "Regional Hospital",
    code: "regional_hospital",
    description: "For multi-department hospitals with advanced operational analytics.",
    monthlyPrice: "599.00",
    yearlyPrice: "5990.00",
    staffLimit: 120,
    clientLimit: 10000,
    storageGb: 500,
    supportLevel: "priority",
    sortOrder: 3,
    features: ["Department analytics", "Advanced audit logs", "Broadcasts", "Integrations"],
    modules: ["appointments", "patients", "billing", "pharmacy", "laboratory", "analytics", "broadcasts"],
  },
  {
    name: "Enterprise Network",
    code: "enterprise_network",
    description: "For large hospital groups with high staff volume and deep compliance needs.",
    monthlyPrice: "1299.00",
    yearlyPrice: "12990.00",
    staffLimit: 400,
    clientLimit: 50000,
    storageGb: 2000,
    supportLevel: "enterprise",
    sortOrder: 4,
    features: ["Unlimited departments", "Compliance exports", "Dedicated support", "Custom integrations"],
    modules: ["appointments", "patients", "billing", "pharmacy", "laboratory", "analytics", "compliance", "integrations"],
  },
  {
    name: "Teaching Hospital",
    code: "teaching_hospital",
    description: "For hospitals with training workflows, research reporting, and expanded analytics.",
    monthlyPrice: "1799.00",
    yearlyPrice: "17990.00",
    staffLimit: 650,
    clientLimit: 80000,
    storageGb: 3500,
    supportLevel: "enterprise",
    sortOrder: 5,
    features: ["Research reports", "Training departments", "Advanced scheduling", "Dedicated onboarding"],
    modules: ["appointments", "patients", "billing", "pharmacy", "laboratory", "analytics", "reports", "compliance"],
  },
  {
    name: "National Health System",
    code: "national_health_system",
    description: "For national-scale deployments requiring maximum limits and white-glove support.",
    monthlyPrice: "3499.00",
    yearlyPrice: "34990.00",
    staffLimit: 1500,
    clientLimit: 250000,
    storageGb: 10000,
    supportLevel: "white-glove",
    sortOrder: 6,
    features: ["National scale limits", "White-glove support", "Custom SLA", "Strategic reporting"],
    modules: ["appointments", "patients", "billing", "pharmacy", "laboratory", "analytics", "reports", "compliance", "integrations", "workflow"],
  },
];

let platformBillingSchemaReady = false;

export async function ensurePlatformBillingSchema() {
  if (platformBillingSchemaReady) return;
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`).catch(() => null);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "subscription_plans" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      "deleted_at" timestamp,
      "name" text NOT NULL,
      "code" text NOT NULL UNIQUE,
      "description" text,
      "currency" text DEFAULT 'USD' NOT NULL,
      "monthly_price" numeric(14, 2) DEFAULT '0' NOT NULL,
      "yearly_price" numeric(14, 2) DEFAULT '0' NOT NULL,
      "staff_limit" integer DEFAULT 0 NOT NULL,
      "client_limit" integer DEFAULT 0 NOT NULL,
      "storage_gb" integer DEFAULT 0 NOT NULL,
      "features" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "modules" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "support_level" text DEFAULT 'standard' NOT NULL,
      "billing_cycle" text DEFAULT 'monthly' NOT NULL,
      "is_active" boolean DEFAULT true NOT NULL,
      "is_default" boolean DEFAULT false NOT NULL,
      "sort_order" integer DEFAULT 0 NOT NULL,
      "created_by" uuid
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "subscription_plans_active_idx" ON "subscription_plans" ("is_active")`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "platform_invoices" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      "deleted_at" timestamp,
      "tenant_id" uuid REFERENCES "tenants"("id"),
      "plan_id" uuid REFERENCES "subscription_plans"("id"),
      "invoice_number" text NOT NULL UNIQUE,
      "status" text DEFAULT 'draft' NOT NULL,
      "currency" text DEFAULT 'USD' NOT NULL,
      "subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
      "tax" numeric(14, 2) DEFAULT '0' NOT NULL,
      "total" numeric(14, 2) DEFAULT '0' NOT NULL,
      "amount_paid" numeric(14, 2) DEFAULT '0' NOT NULL,
      "billing_email" text,
      "billing_name" text,
      "issued_at" timestamp DEFAULT now() NOT NULL,
      "due_at" timestamp NOT NULL,
      "paid_at" timestamp,
      "period_start" timestamp,
      "period_end" timestamp,
      "line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "notes" text,
      "metadata" jsonb DEFAULT '{}'::jsonb
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "platform_invoice_tenant_idx" ON "platform_invoices" ("tenant_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "platform_invoice_status_idx" ON "platform_invoices" ("status")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "platform_invoice_due_idx" ON "platform_invoices" ("due_at")`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "retainer_plans" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      "deleted_at" timestamp,
      "name" text NOT NULL,
      "code" text NOT NULL UNIQUE,
      "description" text,
      "currency" text DEFAULT 'USD' NOT NULL,
      "monthly_fee" numeric(14, 2) DEFAULT '0' NOT NULL,
      "setup_fee" numeric(14, 2) DEFAULT '0' NOT NULL,
      "response_sla_hours" integer DEFAULT 24 NOT NULL,
      "included_hours" integer DEFAULT 0 NOT NULL,
      "overage_rate" numeric(14, 2) DEFAULT '0' NOT NULL,
      "features" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "is_active" boolean DEFAULT true NOT NULL,
      "is_default" boolean DEFAULT false NOT NULL,
      "sort_order" integer DEFAULT 0 NOT NULL,
      "created_by" uuid
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "retainer_plans_active_idx" ON "retainer_plans" ("is_active")`);
  platformBillingSchemaReady = true;
}

export async function requireSuperAdmin(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null as any);
  if (!session?.user?.email && !session?.user?.id) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const appUser = await db.query.users.findFirst({
    where: session.user.email ? ilike(users.email, session.user.email) : eq(users.id, session.user.id),
  });

  if (!appUser?.isActive) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const assignedRoles = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, appUser.id))
    .catch(() => []);

  const roleNames = new Set([appUser.role, ...assignedRoles.map((role) => role.name)].map((role) => String(role || "").toLowerCase()));
  if (!roleNames.has("super_admin")) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, user: appUser };
}

export async function ensureDefaultSubscriptionPlans(createdBy?: string | null) {
  await ensurePlatformBillingSchema();
  const existing = await db.execute(sql`SELECT id FROM subscription_plans WHERE deleted_at IS NULL LIMIT 1`) as any;
  if ((existing.rows || []).length) return;

  for (const [index, plan] of DEFAULT_SUBSCRIPTION_PLANS.entries()) {
    await db.execute(sql`
      INSERT INTO subscription_plans (
        name, code, description, monthly_price, yearly_price, staff_limit, client_limit,
        storage_gb, support_level, sort_order, features, modules, is_active, is_default, created_by
      )
      VALUES (
        ${plan.name}, ${plan.code}, ${plan.description}, ${plan.monthlyPrice}, ${plan.yearlyPrice},
        ${plan.staffLimit}, ${plan.clientLimit}, ${plan.storageGb}, ${plan.supportLevel}, ${plan.sortOrder},
        ${JSON.stringify(plan.features)}::jsonb, ${JSON.stringify(plan.modules)}::jsonb, true, ${index === 1}, ${createdBy || null}
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        monthly_price = EXCLUDED.monthly_price,
        yearly_price = EXCLUDED.yearly_price,
        staff_limit = EXCLUDED.staff_limit,
        client_limit = EXCLUDED.client_limit,
        storage_gb = EXCLUDED.storage_gb,
        support_level = EXCLUDED.support_level,
        sort_order = EXCLUDED.sort_order,
        features = EXCLUDED.features,
        modules = EXCLUDED.modules,
        is_active = true,
        updated_at = now()
    `);
  }
}

export async function listSubscriptionPlans(includeInactive = false) {
  await ensureDefaultSubscriptionPlans();
  const base = db.select().from(subscriptionPlans);
  return (includeInactive ? base : base.where(eq(subscriptionPlans.isActive, true))).orderBy(subscriptionPlans.sortOrder, subscriptionPlans.monthlyPrice);
}

export async function ensureDefaultRetainerPlans(createdBy?: string | null) {
  await ensurePlatformBillingSchema();
  const result = await db.execute(sql`SELECT id FROM retainer_plans WHERE deleted_at IS NULL LIMIT 1`) as any;
  if ((result.rows || []).length) return;

  const retainers = [
    {
      name: "Essential Support Retainer",
      code: "essential_support",
      description: "Baseline production support for small facilities that need monitored issue response and monthly advisory.",
      monthlyFee: "299.00",
      setupFee: "0.00",
      responseSlaHours: 24,
      includedHours: 6,
      overageRate: "65.00",
      features: ["Email support", "Monthly health review", "Bug triage", "Patch guidance"],
      isDefault: true,
      sortOrder: 1,
    },
    {
      name: "Priority Operations Retainer",
      code: "priority_operations",
      description: "Priority maintenance for active hospitals with faster response, workflow support, and release coordination.",
      monthlyFee: "799.00",
      setupFee: "250.00",
      responseSlaHours: 8,
      includedHours: 18,
      overageRate: "85.00",
      features: ["Priority support", "Workflow optimization", "Integration checks", "Quarterly training"],
      isDefault: false,
      sortOrder: 2,
    },
    {
      name: "Enterprise Reliability Retainer",
      code: "enterprise_reliability",
      description: "High-touch operational support for large tenants with strict SLA, incident support, and executive reporting.",
      monthlyFee: "1999.00",
      setupFee: "750.00",
      responseSlaHours: 2,
      includedHours: 50,
      overageRate: "120.00",
      features: ["2-hour SLA", "Incident bridge", "Dedicated success engineer", "Executive reports"],
      isDefault: false,
      sortOrder: 3,
    },
    {
      name: "Compliance Plus Retainer",
      code: "compliance_plus",
      description: "Governance-focused retainer for audits, backups, policy reviews, and security posture improvements.",
      monthlyFee: "1499.00",
      setupFee: "500.00",
      responseSlaHours: 4,
      includedHours: 32,
      overageRate: "110.00",
      features: ["Compliance reviews", "Backup verification", "Security audits", "Policy advisory"],
      isDefault: false,
      sortOrder: 4,
    },
  ];

  for (const retainer of retainers) {
    await db.execute(sql`
      INSERT INTO retainer_plans (
        name, code, description, monthly_fee, setup_fee, response_sla_hours,
        included_hours, overage_rate, features, is_active, is_default, sort_order, created_by
      )
      VALUES (
        ${retainer.name}, ${retainer.code}, ${retainer.description}, ${retainer.monthlyFee},
        ${retainer.setupFee}, ${retainer.responseSlaHours}, ${retainer.includedHours},
        ${retainer.overageRate}, ${JSON.stringify(retainer.features)}::jsonb, true,
        ${retainer.isDefault}, ${retainer.sortOrder}, ${createdBy || null}
      )
      ON CONFLICT (code) DO NOTHING
    `);
  }
}

export async function listRetainerPlans(includeInactive = false) {
  await ensureDefaultRetainerPlans();
  const result = await db.execute(sql`
    SELECT
      rp.*,
      coalesce(count(t.id) FILTER (
        WHERE t.is_active = true
          AND t.deleted_at IS NULL
          AND (
            t.metadata->>'retainerPlanId' = rp.id::text OR
            t.metadata->>'retainerPlanCode' = rp.code
          )
      ), 0)::int AS active_tenants
    FROM retainer_plans rp
    LEFT JOIN tenants t ON true
    WHERE rp.deleted_at IS NULL
      AND (${includeInactive} = true OR rp.is_active = true)
    GROUP BY rp.id
    ORDER BY rp.sort_order, rp.monthly_fee
  `) as any;
  return result.rows || [];
}

export async function createRetainerPlan(input: {
  name: string;
  code: string;
  description?: string;
  currency: string;
  monthlyFee: number;
  setupFee: number;
  responseSlaHours: number;
  includedHours: number;
  overageRate: number;
  features: string[];
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdBy?: string | null;
}) {
  await ensureDefaultRetainerPlans(input.createdBy);
  if (input.isDefault) {
    await db.execute(sql`UPDATE retainer_plans SET is_default = false, updated_at = now() WHERE is_default = true`);
  }
  const result = await db.execute(sql`
    INSERT INTO retainer_plans (
      name, code, description, currency, monthly_fee, setup_fee, response_sla_hours,
      included_hours, overage_rate, features, is_active, is_default, sort_order, created_by
    )
    VALUES (
      ${input.name}, ${input.code}, ${input.description || null}, ${input.currency},
      ${input.monthlyFee.toFixed(2)}, ${input.setupFee.toFixed(2)}, ${input.responseSlaHours},
      ${input.includedHours}, ${input.overageRate.toFixed(2)}, ${JSON.stringify(input.features)}::jsonb,
      ${input.isActive}, ${input.isDefault}, ${input.sortOrder}, ${input.createdBy || null}
    )
    RETURNING *
  `) as any;
  return result.rows?.[0];
}

export async function resolvePlan(planRef: string) {
  await ensureDefaultSubscriptionPlans();
  const normalized = planRef.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized);
  const planPredicates = [
    eq(subscriptionPlans.code, normalized),
    ilike(subscriptionPlans.name, normalized),
    ...(isUuid ? [eq(subscriptionPlans.id, normalized)] : []),
  ];
  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(
      and(
        isNull(subscriptionPlans.deletedAt),
        or(...planPredicates),
      ),
    )
    .limit(1);

  if (plan) return plan;
  const [fallback] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isDefault, true)).limit(1);
  return fallback;
}

export async function createTenantSubscriptionInvoice(input: {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  plan: typeof subscriptionPlans.$inferSelect;
  adminUserId?: string | null;
  billingEmail?: string | null;
}) {
  const now = new Date();
  const dueAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const amount = String(input.plan.monthlyPrice || "0");
  const invoiceNumber = `SUB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  const [invoice] = await db.insert(platformInvoices).values({
    tenantId: input.tenantId,
    planId: input.plan.id,
    invoiceNumber,
    status: "sent",
    currency: input.plan.currency || "USD",
    subtotal: amount,
    tax: "0",
    total: amount,
    amountPaid: "0",
    billingEmail: input.billingEmail || null,
    billingName: input.tenantName,
    issuedAt: now,
    dueAt,
    periodStart: now,
    periodEnd,
    lineItems: [
      {
        description: `${input.plan.name} monthly subscription`,
        quantity: 1,
        unitPrice: amount,
        total: amount,
      },
    ],
    metadata: {
      kind: "tenant_subscription",
      tenantSlug: input.tenantSlug,
      planCode: input.plan.code,
    },
  }).returning();

  if (input.adminUserId) {
    await db.insert(notifications).values({
      tenantId: input.tenantId,
      userId: input.adminUserId,
      type: "platform_invoice",
      title: "Subscription invoice issued",
      message: `Invoice ${invoice.invoiceNumber} for ${input.plan.name} is ${invoice.status} and due ${dueAt.toLocaleDateString()}.`,
      metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, total: amount, status: invoice.status },
    }).catch(() => null);
  }

  if (input.billingEmail) {
    const emailResult = await sendEmail({
      to: input.billingEmail,
      subject: `Subscription invoice ${invoice.invoiceNumber}`,
      tenantSlug: input.tenantSlug,
      template: {
        variant: "invoice",
        brandName: input.tenantName,
        heading: `Invoice ${invoice.invoiceNumber}`,
        body: `Your ${input.plan.name} subscription invoice has been issued and is due ${dueAt.toLocaleDateString()}.`,
        statusLabel: invoice.status,
        summary: [
          { label: "Plan", value: input.plan.name },
          { label: "Total", value: `${input.plan.currency} ${amount}` },
          { label: "Due date", value: dueAt.toLocaleDateString() },
        ],
        items: [
          { label: `${input.plan.name} monthly subscription`, value: `${input.plan.currency} ${amount}` },
        ],
      },
    }).catch(() => null);

    if (!emailResult?.ok) {
      await db.insert(emailSendLog).values({
        tenantId: input.tenantId,
        toAddress: input.billingEmail,
        subject: `Subscription invoice ${invoice.invoiceNumber}`,
        provider: "platform",
        status: "queued",
        metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, total: amount, reason: "provider_unavailable" },
      } as any).catch(() => null);
    }
  }

  return invoice;
}

export async function createPlatformInvoice(input: {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  planId?: string | null;
  billingEmail?: string | null;
  billingName?: string | null;
  status?: string;
  currency: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
  tax?: number;
  dueAt: Date;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  notes?: string | null;
  kind?: string;
  createdBy?: string | null;
}) {
  await ensureDefaultSubscriptionPlans();
  const now = new Date();
  const subtotal = input.lineItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  const tax = Number(input.tax || 0);
  const total = subtotal + tax;
  const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const lineItems = input.lineItems.map((item) => ({
    description: item.description,
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unitPrice || 0).toFixed(2),
    total: (Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2),
  }));

  const [invoice] = await db.insert(platformInvoices).values({
    tenantId: input.tenantId,
    planId: input.planId || null,
    invoiceNumber,
    status: input.status || "sent",
    currency: input.currency || "USD",
    subtotal: subtotal.toFixed(2),
    tax: tax.toFixed(2),
    total: total.toFixed(2),
    amountPaid: "0",
    billingEmail: input.billingEmail || null,
    billingName: input.billingName || input.tenantName,
    issuedAt: now,
    dueAt: input.dueAt,
    periodStart: input.periodStart || null,
    periodEnd: input.periodEnd || null,
    lineItems,
    notes: input.notes || null,
    metadata: {
      kind: input.kind || "manual_platform_invoice",
      tenantSlug: input.tenantSlug,
      createdBy: input.createdBy || null,
    },
  }).returning();

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, input.tenantId) }).catch(() => null as any);
  const adminUser = await db.query.users.findFirst({
    where: and(
      eq(users.tenantId, input.tenantId),
      tenant?.adminUserId ? or(eq(users.role, "hospital_admin"), eq(users.id, tenant.adminUserId)) : eq(users.role, "hospital_admin"),
    ),
  }).catch(() => null as any);

  if (adminUser?.id) {
    await db.insert(notifications).values({
      tenantId: input.tenantId,
      userId: adminUser.id,
      type: "platform_invoice",
      title: "Platform invoice issued",
      message: `Invoice ${invoice.invoiceNumber} for ${input.currency} ${total.toFixed(2)} is due ${input.dueAt.toLocaleDateString()}.`,
      metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, total: total.toFixed(2), status: invoice.status },
    }).catch(() => null);
  }

  if (input.billingEmail) {
    const emailResult = await sendEmail({
      to: input.billingEmail,
      subject: `Platform invoice ${invoice.invoiceNumber}`,
      tenantSlug: input.tenantSlug,
      template: {
        variant: "invoice",
        brandName: input.tenantName,
        heading: `Invoice ${invoice.invoiceNumber}`,
        body: input.notes || "A new platform invoice has been issued for your tenant account.",
        statusLabel: invoice.status,
        summary: [
          { label: "Tenant", value: input.tenantName },
          { label: "Total", value: `${input.currency} ${total.toFixed(2)}` },
          { label: "Due date", value: input.dueAt.toLocaleDateString() },
        ],
        items: lineItems.map((item) => ({ label: item.description, value: `${input.currency} ${item.total}` })),
      },
    }).catch(() => null);

    if (!emailResult?.ok) {
      await db.insert(emailSendLog).values({
        tenantId: input.tenantId,
        toAddress: input.billingEmail,
        subject: `Platform invoice ${invoice.invoiceNumber}`,
        provider: "platform",
        status: "queued",
        metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, total: total.toFixed(2), reason: "provider_unavailable" },
      } as any).catch(() => null);
    }
  }

  await auditPlatformBilling(input.createdBy, "platform_invoice.created", invoice.id, { invoiceNumber, tenantId: input.tenantId, total });
  return invoice;
}

export async function getPlatformBillingPayload() {
  await ensureDefaultSubscriptionPlans();
  const now = new Date();
  const [stats] = await db.select({
    invoices: sql<number>`count(*)`,
    open: sql<number>`count(case when ${platformInvoices.status} in ('sent', 'overdue', 'draft') then 1 end)`,
    paid: sql<number>`count(case when ${platformInvoices.status} = 'paid' then 1 end)`,
    overdue: sql<number>`count(case when ${platformInvoices.status} != 'paid' and ${platformInvoices.dueAt} < ${now} then 1 end)`,
    totalBilled: sql<string>`coalesce(sum(${platformInvoices.total}), 0)`,
    totalPaid: sql<string>`coalesce(sum(${platformInvoices.amountPaid}), 0)`,
  }).from(platformInvoices);

  const invoices = await db
    .select({
      id: platformInvoices.id,
      invoiceNumber: platformInvoices.invoiceNumber,
      status: platformInvoices.status,
      currency: platformInvoices.currency,
      subtotal: platformInvoices.subtotal,
      tax: platformInvoices.tax,
      total: platformInvoices.total,
      amountPaid: platformInvoices.amountPaid,
      dueAt: platformInvoices.dueAt,
      issuedAt: platformInvoices.issuedAt,
      billingEmail: platformInvoices.billingEmail,
      billingName: platformInvoices.billingName,
      lineItems: platformInvoices.lineItems,
      tenant: { id: tenants.id, name: tenants.name, slug: tenants.slug, plan: tenants.plan },
      plan: { id: subscriptionPlans.id, name: subscriptionPlans.name, code: subscriptionPlans.code },
    })
    .from(platformInvoices)
    .leftJoin(tenants, eq(tenants.id, platformInvoices.tenantId))
    .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, platformInvoices.planId))
    .orderBy(desc(platformInvoices.issuedAt))
    .limit(100);

  const tenantRows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      plan: tenants.plan,
      contactEmail: tenants.contactEmail,
      isActive: tenants.isActive,
    })
    .from(tenants)
    .where(isNull(tenants.deletedAt))
    .orderBy(tenants.name);

  const planRows = await listSubscriptionPlans(true);

  return { generatedAt: now.toISOString(), stats, invoices, tenants: tenantRows, plans: planRows };
}

export async function auditPlatformBilling(userId: string | null | undefined, action: string, entityId: string, metadata: any = {}) {
  await db.insert(auditLogs).values({
    userId: userId || null,
    action,
    entity: "platform_billing",
    entityId,
    metadata,
  }).catch(() => null);
}
