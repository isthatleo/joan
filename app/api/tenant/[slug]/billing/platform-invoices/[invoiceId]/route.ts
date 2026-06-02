import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { auditLogs, notifications, platformInvoices, roles, subscriptionPlans, tenants, userRoles, users } from "@/lib/db/schema";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("acknowledge") }),
  z.object({ action: z.literal("dispute"), message: z.string().trim().min(8).max(1200) }),
]);

function money(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function iso(value?: Date | string | null) {
  return value ? new Date(value).toISOString() : "";
}

function normalizeLineItems(value: unknown) {
  return Array.isArray(value) ? value.map((item: any) => ({
    description: String(item?.description || "Invoice item"),
    quantity: Number(item?.quantity || 0),
    unitPrice: money(item?.unitPrice),
    amount: money(item?.amount ?? item?.total ?? Number(item?.quantity || 0) * Number(item?.unitPrice || 0)),
  })) : [];
}

async function getTenantInvoice(slug: string, invoiceId: string) {
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) return { error: "Tenant not found" as const, status: 404 as const };

  const [row] = await db
    .select({
      id: platformInvoices.id,
      invoiceNumber: platformInvoices.invoiceNumber,
      status: platformInvoices.status,
      currency: platformInvoices.currency,
      subtotal: platformInvoices.subtotal,
      tax: platformInvoices.tax,
      total: platformInvoices.total,
      amountPaid: platformInvoices.amountPaid,
      billingEmail: platformInvoices.billingEmail,
      billingName: platformInvoices.billingName,
      issuedAt: platformInvoices.issuedAt,
      dueAt: platformInvoices.dueAt,
      paidAt: platformInvoices.paidAt,
      periodStart: platformInvoices.periodStart,
      periodEnd: platformInvoices.periodEnd,
      lineItems: platformInvoices.lineItems,
      notes: platformInvoices.notes,
      metadata: platformInvoices.metadata,
      tenant: { id: tenants.id, name: tenants.name, slug: tenants.slug, plan: tenants.plan, contactEmail: tenants.contactEmail },
      plan: { id: subscriptionPlans.id, name: subscriptionPlans.name, code: subscriptionPlans.code, supportLevel: subscriptionPlans.supportLevel },
    })
    .from(platformInvoices)
    .leftJoin(tenants, eq(tenants.id, platformInvoices.tenantId))
    .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, platformInvoices.planId))
    .where(and(eq(platformInvoices.id, invoiceId), eq(platformInvoices.tenantId, tenantId), isNull(platformInvoices.deletedAt)))
    .limit(1);

  if (!row) return { error: "Invoice not found" as const, status: 404 as const };
  const total = money(row.total);
  const amountPaid = money(row.amountPaid);
  return {
    tenantId,
    invoice: {
      ...row,
      currency: row.currency || "USD",
      subtotal: money(row.subtotal),
      tax: money(row.tax),
      total,
      amountPaid,
      amountDue: Math.max(0, total - amountPaid),
      issuedAt: iso(row.issuedAt),
      dueAt: iso(row.dueAt),
      paidAt: iso(row.paidAt),
      periodStart: iso(row.periodStart),
      periodEnd: iso(row.periodEnd),
      lineItems: normalizeLineItems(row.lineItems),
      notes: row.notes || "",
      metadata: row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, any> : {},
    },
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; invoiceId: string }> }) {
  try {
    const { slug, invoiceId } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const result = await getTenantInvoice(slug, invoiceId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ invoice: result.invoice }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error fetching tenant platform invoice:", error);
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string; invoiceId: string }> }) {
  try {
    const { slug, invoiceId } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const body = await request.json().catch(() => ({}));
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid invoice action", details: parsed.error.issues }, { status: 400 });

    const current = await getTenantInvoice(slug, invoiceId);
    if ("error" in current) return NextResponse.json({ error: current.error }, { status: current.status });

    const now = new Date();
    const actor = admin.user;
    const metadata = {
      ...current.invoice.metadata,
      tenantReview: {
        ...(current.invoice.metadata?.tenantReview || {}),
        acknowledgedAt: parsed.data.action === "acknowledge" ? now.toISOString() : current.invoice.metadata?.tenantReview?.acknowledgedAt,
        acknowledgedBy: parsed.data.action === "acknowledge" ? actor?.id || null : current.invoice.metadata?.tenantReview?.acknowledgedBy,
        acknowledgedByName: parsed.data.action === "acknowledge" ? actor?.email || "Hospital admin" : current.invoice.metadata?.tenantReview?.acknowledgedByName,
      },
      disputes: parsed.data.action === "dispute"
        ? [
            ...(Array.isArray(current.invoice.metadata?.disputes) ? current.invoice.metadata.disputes : []),
            {
              id: crypto.randomUUID(),
              message: parsed.data.message,
              createdAt: now.toISOString(),
              createdBy: actor?.id || null,
              createdByName: actor?.email || "Hospital admin",
              status: "open",
            },
          ]
        : current.invoice.metadata?.disputes || [],
    };

    const [updated] = await db.update(platformInvoices).set({ metadata, updatedAt: now }).where(and(eq(platformInvoices.id, invoiceId), eq(platformInvoices.tenantId, tenantId))).returning();
    if (!updated) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    await db.insert(auditLogs).values({
      tenantId,
      userId: actor?.id || null,
      action: parsed.data.action === "acknowledge" ? "platform_invoice.acknowledged" : "platform_invoice.disputed",
      entity: "platform_invoice",
      entityId: invoiceId,
      metadata: { invoiceNumber: current.invoice.invoiceNumber, message: parsed.data.action === "dispute" ? parsed.data.message : undefined },
    }).catch(() => null);

    if (parsed.data.action === "dispute") {
      const superAdmins = await db
        .select({ id: users.id })
        .from(users)
        .leftJoin(userRoles, eq(userRoles.userId, users.id))
        .leftJoin(roles, eq(roles.id, userRoles.roleId))
        .where(and(isNull(users.deletedAt), eq(users.isActive, true), or(eq(users.role, "super_admin"), eq(roles.name, "super_admin"))))
        .catch(() => []);
      const uniqueIds = [...new Set(superAdmins.map((row) => row.id).filter(Boolean))];
      if (uniqueIds.length) {
        await db.insert(notifications).values(uniqueIds.map((userId) => ({
          userId,
          tenantId,
          type: "platform_invoice_dispute",
          title: "Hospital invoice clarification requested",
          message: `${current.invoice.tenant?.name || "A tenant"} requested clarification on invoice ${current.invoice.invoiceNumber}.`,
          metadata: {
            invoiceId,
            invoiceNumber: current.invoice.invoiceNumber,
            tenantSlug: slug,
            tenantId,
            actionUrl: `/super-admin/billing/invoices/${invoiceId}`,
          },
        }))).catch(() => null);
      }
    }

    const refreshed = await getTenantInvoice(slug, invoiceId);
    if ("error" in refreshed) return NextResponse.json({ error: refreshed.error }, { status: refreshed.status });
    return NextResponse.json({ invoice: refreshed.invoice });
  } catch (error) {
    console.error("Error updating tenant platform invoice:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}
