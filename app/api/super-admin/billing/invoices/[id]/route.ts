import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { platformInvoices, subscriptionPlans, tenants } from "@/lib/db/schema";
import { auditPlatformBilling, requireSuperAdmin } from "@/lib/platform-billing";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["draft", "sent", "paid", "overdue", "void"]).optional(),
  amountPaid: z.coerce.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;
  const { id } = await params;

  const [invoice] = await db
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
    .where(eq(platformInvoices.id, id))
    .limit(1);

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  return NextResponse.json({ invoice });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invoice update", details: parsed.error.issues }, { status: 400 });
  }

  const update: any = { ...parsed.data, updatedAt: new Date() };
  if (typeof parsed.data.amountPaid === "number") update.amountPaid = parsed.data.amountPaid.toFixed(2);
  if (parsed.data.status === "paid") update.paidAt = new Date();
  if (parsed.data.status && parsed.data.status !== "paid") update.paidAt = null;

  const [invoice] = await db.update(platformInvoices).set(update).where(eq(platformInvoices.id, id)).returning();
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  await auditPlatformBilling(access.user.id, "platform_invoice.updated", invoice.id, {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
  });
  return NextResponse.json({ invoice });
}
