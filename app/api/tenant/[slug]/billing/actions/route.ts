import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogs, integrations, invoices, payments } from "@/lib/db/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import { getBillingSettings } from "@/lib/billing-settings";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);
  if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "");
  const now = new Date();

  if (action === "export-report") {
    const settings = await getBillingSettings(slug);
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const [invoiceAgg] = await db
      .select({
        totalBilled: sql<number>`coalesce(sum(coalesce(${invoices.totalAmount}, '0')::numeric),0)`,
        totalPaid: sql<number>`coalesce(sum(case when ${invoices.status} = 'paid' then coalesce(${invoices.totalAmount}, '0')::numeric else 0 end),0)`,
      })
      .from(invoices)
      .where(and(eq(invoices.tenantId, access.tenant.id), gte(invoices.createdAt, start)));

    const [paymentAgg] = await db
      .select({
        totalPayments: sql<number>`coalesce(sum(coalesce(${payments.amount}, '0')::numeric),0)`,
        count: sql<number>`count(*)`,
      })
      .from(payments)
      .where(and(eq(payments.tenantId, access.tenant.id), gte(payments.createdAt, start)));

    const [integrationAgg] = await db
      .select({ count: sql<number>`count(*)` })
      .from(integrations)
      .where(eq(integrations.tenantId, access.tenant.id));

    const payload = {
      tenant: { id: access.tenant.id, slug: access.tenant.slug, name: access.tenant.name },
      exportedAt: now.toISOString(),
      settings,
      overview: {
        totalBilled: Number(invoiceAgg?.totalBilled || 0),
        totalPaid: Number(invoiceAgg?.totalPaid || 0),
        totalPayments: Number(paymentAgg?.totalPayments || 0),
        paymentCount: Number(paymentAgg?.count || 0),
        connectedProcessors: Number(integrationAgg?.count || 0),
      },
    };
    await db.insert(auditLogs).values({
      tenantId: access.tenant.id,
      userId: access.user?.id || null,
      action: "tenant.billing_exported",
      entity: "billing",
      entityId: access.tenant.id,
      metadata: { exportedAt: payload.exportedAt },
    });
    return NextResponse.json(payload);
  }

  if (action === "validate-setup") {
    const settings = await getBillingSettings(slug);
    const activeIntegrations = await db
      .select({
        provider: integrations.provider,
        isActive: integrations.isActive,
        lastTestStatus: integrations.lastTestStatus,
      })
      .from(integrations)
      .where(eq(integrations.tenantId, access.tenant.id))
      .orderBy(desc(integrations.updatedAt))
      .limit(20);

    const findings = [
      settings.paymentMethods.creditCard && !activeIntegrations.some((item: any) => item.isActive && ["stripe", "paypal", "square", "authorize-net"].includes(item.provider))
        ? "Credit card payments are enabled but no active card processor is configured."
        : null,
      settings.paymentMethods.insurance && !settings.insuranceIntegration.realTimeEligibility
        ? "Insurance payments are enabled without real-time eligibility checks."
        : null,
      settings.billingPreferences.taxCalculations ? null : "Tax calculations are disabled and should be reviewed against local policy.",
      !settings.paymentMethods.creditCard && !settings.paymentMethods.bankTransfer && !settings.paymentMethods.cash && !settings.paymentMethods.insurance
        ? "No payment methods are enabled for this tenant."
        : null,
    ].filter(Boolean);

    const payload = {
      validatedAt: now.toISOString(),
      settings,
      integrations: activeIntegrations,
      valid: findings.length === 0,
      findings,
      summary: {
        activeIntegrations: activeIntegrations.filter((item: any) => item.isActive).length,
        configuredIntegrations: activeIntegrations.filter((item: any) => item.lastTestStatus === "active").length,
        paymentMethodsEnabled: Object.values(settings.paymentMethods || {}).filter(Boolean).length,
      },
    };
    await db.insert(auditLogs).values({
      tenantId: access.tenant.id,
      userId: access.user?.id || null,
      action: "tenant.billing_validated",
      entity: "billing",
      entityId: access.tenant.id,
      metadata: { valid: payload.valid, findings },
    });
    return NextResponse.json(payload);
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
