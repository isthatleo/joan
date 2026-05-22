import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments, invoices, auditLogs, tenants } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Webhook for payment success events
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const slug = resolvedParams.slug;
    const body = await request.json();

    // Verify webhook signature (implement based on payment provider)
    // const signature = request.headers.get('stripe-signature');
    // if (!signature) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
