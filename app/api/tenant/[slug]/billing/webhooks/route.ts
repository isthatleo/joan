import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { payments, invoices, auditLogs, tenants } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getIntegrationCredentials } from "@/lib/integrations/server";

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const provided = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(provided, expectedBuf);
}

// Webhook for payment success events
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    // Verify webhook signature before trusting anything in the payload. The
    // secret is the tenant's own configured payment-provider webhook secret
    // (set via their integration settings) — an unsigned or wrongly-signed
    // request is rejected outright rather than acted upon.
    const rawBody = await request.text();
    const stripeCreds = await getIntegrationCredentials(slug, "stripe");
    const webhookSecret = stripeCreds?.webhookSecret;
    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook not configured for this tenant" }, { status: 503 });
    }

    const signature = request.headers.get("x-webhook-signature") || request.headers.get("stripe-signature");
    if (!verifySignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { eventType, paymentId, invoiceId, amount, method, metadata } = body;

    if (!invoiceId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug)
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Update payment status
    if (paymentId) {
      await db.update(payments)
        .set({
          status: eventType === 'payment.succeeded' ? 'completed' : 'failed',
          updatedAt: new Date()
        })
        .where(and(
          eq(payments.id, paymentId),
          eq(payments.tenantId, tenant.id)
        ));
    }

    // Update invoice status if payment succeeded
    if (eventType === 'payment.succeeded' && invoiceId) {
      const invoice = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.id, invoiceId),
          eq(invoices.tenantId, tenant.id)
        )
      });

      if (invoice) {
        // Check if this payment completes the invoice
        const totalPaid = await db
          .select({ total: sql<number>`SUM(${payments.amount})` })
          .from(payments)
          .where(and(
            eq(payments.invoiceId, invoiceId),
            eq(payments.status, 'completed')
          ));

        const paidAmount = Number(totalPaid[0]?.total || 0);
        const invoiceTotal = Number(invoice.totalAmount);

        if (paidAmount >= invoiceTotal) {
          await db.update(invoices)
            .set({ status: 'paid', updatedAt: new Date() })
            .where(eq(invoices.id, invoiceId));
        }
      }
    }

    // Audit log
    await db.insert(auditLogs).values({
      tenantId: tenant.id,
      action: `billing.webhook.${eventType}`,
      entity: "payment",
      entityId: paymentId || invoiceId,
      metadata: { eventType, amount, method, metadata },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
