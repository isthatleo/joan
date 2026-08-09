import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { auditLogs, platformInvoices } from "@/lib/db/schema";
import { requireTenantAdmin } from "@/lib/tenant-staff";
import {
  ensureIpnRegistered,
  getPesapalConfig,
  requestPesapalToken,
  submitPesapalOrder,
} from "@/lib/billing/pesapal";

export const dynamic = "force-dynamic";

function money(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function appOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "";
  return configured.trim().replace(/\/+$/, "");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string; invoiceId: string }> }) {
  try {
    const { slug, invoiceId } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
    if (!admin.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const invoice = await db.query.platformInvoices.findFirst({
      where: and(eq(platformInvoices.id, invoiceId), eq(platformInvoices.tenantId, tenantId), isNull(platformInvoices.deletedAt)),
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    if (invoice.status === "paid") {
      return NextResponse.json({ error: "This invoice is already paid" }, { status: 400 });
    }

    const amountDue = Math.max(0, money(invoice.total) - money(invoice.amountPaid));
    if (amountDue <= 0) {
      return NextResponse.json({ error: "Nothing is due on this invoice" }, { status: 400 });
    }

    const config = await getPesapalConfig();
    if (!config) {
      return NextResponse.json({ error: "Pesapal is not configured for this platform yet. Contact your Joan account manager." }, { status: 503 });
    }

    const origin = appOrigin();
    if (!origin) {
      return NextResponse.json({ error: "Platform base URL is not configured" }, { status: 500 });
    }

    // Two distinct URLs: the IPN url is called server-to-server by Pesapal (the source of
    // truth, handled by /api/platform/billing/pesapal/ipn) and is registered once via
    // RegisterIPN. The browser return url is where Pesapal redirects the admin's browser
    // after checkout — it carries no reliable payment status of its own.
    const ipnUrl = `${origin}/api/platform/billing/pesapal/ipn`;
    const browserReturnUrl = `${origin}/tenant/${slug}/billing/platform-invoices/${invoice.id}?paid=pending`;

    const token = await requestPesapalToken(config);
    const notificationId = await ensureIpnRegistered(config, token, ipnUrl);

    const order = await submitPesapalOrder(config, token, {
      merchantReference: invoice.id,
      amount: amountDue,
      currency: invoice.currency || "USD",
      description: `Joan platform invoice ${invoice.invoiceNumber}`,
      callbackUrl: browserReturnUrl,
      notificationId,
      billingEmail: admin.user.email || invoice.billingEmail || "",
      billingLastName: invoice.billingName || undefined,
    });

    const existingMetadata = (invoice.metadata && typeof invoice.metadata === "object" ? invoice.metadata : {}) as Record<string, any>;
    await db
      .update(platformInvoices)
      .set({
        metadata: {
          ...existingMetadata,
          pesapal: {
            orderTrackingId: order.orderTrackingId,
            merchantReference: order.merchantReference,
            initiatedAt: new Date().toISOString(),
            initiatedBy: admin.user.id,
          },
        },
        updatedAt: new Date(),
      })
      .where(eq(platformInvoices.id, invoice.id));

    await db.insert(auditLogs).values({
      tenantId,
      userId: admin.user.id,
      action: "tenant.platform_invoice.payment_initiated",
      entity: "platform_invoice",
      entityId: invoice.id,
      metadata: { invoiceNumber: invoice.invoiceNumber, amount: amountDue, currency: invoice.currency, orderTrackingId: order.orderTrackingId },
    }).catch(() => null);

    return NextResponse.json({ redirectUrl: order.redirectUrl, orderTrackingId: order.orderTrackingId });
  } catch (error: any) {
    console.error("Error initiating Pesapal payment:", error);
    return NextResponse.json({ error: error?.message || "Failed to start Pesapal checkout" }, { status: 500 });
  }
}
