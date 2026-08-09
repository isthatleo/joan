import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, notifications, platformInvoices } from "@/lib/db/schema";
import { getPesapalConfig, getPesapalTransactionStatus, requestPesapalToken } from "@/lib/billing/pesapal";

export const dynamic = "force-dynamic";

function money(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ack(orderTrackingId: string, orderMerchantReference: string, status: 200 | 500) {
  return NextResponse.json({
    orderNotificationType: "IPNCHANGE",
    orderTrackingId,
    orderMerchantReference,
    status,
  });
}

/**
 * Pesapal's IPN/callback payload deliberately carries no payment status (their own
 * documented anti-spoofing design) — this handler never trusts OrderTrackingId/
 * OrderMerchantReference as proof of payment by themselves. It only acts after an
 * independent, server-to-server GetTransactionStatus call confirms the real outcome.
 */
async function handleIpn(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let orderTrackingId = searchParams.get("OrderTrackingId") || "";
  let orderMerchantReference = searchParams.get("OrderMerchantReference") || "";

  if (!orderTrackingId) {
    const body = await request.json().catch(() => ({} as Record<string, string>));
    orderTrackingId = orderTrackingId || body?.OrderTrackingId || body?.orderTrackingId || "";
    orderMerchantReference = orderMerchantReference || body?.OrderMerchantReference || body?.orderMerchantReference || "";
  }

  if (!orderTrackingId) {
    return ack(orderTrackingId, orderMerchantReference, 500);
  }

  try {
    const config = await getPesapalConfig();
    if (!config) throw new Error("Pesapal is not configured");

    const token = await requestPesapalToken(config);
    const transaction = await getPesapalTransactionStatus(config, token, orderTrackingId);

    const invoiceId = orderMerchantReference || transaction.merchantReference;
    const invoice = await db.query.platformInvoices.findFirst({ where: eq(platformInvoices.id, invoiceId) });
    if (!invoice) throw new Error(`No platform invoice found for merchant reference ${invoiceId}`);

    const invoiceMetadata = (invoice.metadata && typeof invoice.metadata === "object" ? invoice.metadata : {}) as Record<string, any>;
    const trackedOrderId = invoiceMetadata?.pesapal?.orderTrackingId;
    if (trackedOrderId && trackedOrderId !== orderTrackingId) {
      // A stale/replayed notification for an order that's no longer the active one on this invoice — ignore.
      return ack(orderTrackingId, orderMerchantReference, 200);
    }

    if (transaction.statusCode !== 1) {
      // FAILED / INVALID / REVERSED — nothing to credit. Acknowledge receipt without touching the invoice.
      return ack(orderTrackingId, orderMerchantReference, 200);
    }

    const total = money(invoice.total);
    const newAmountPaid = Math.min(total, money(invoice.amountPaid) + transaction.amount);
    const nowPaidInFull = newAmountPaid >= total;

    const updated = await db
      .update(platformInvoices)
      .set({
        amountPaid: newAmountPaid.toFixed(2),
        status: nowPaidInFull ? "paid" : invoice.status,
        paidAt: nowPaidInFull ? new Date() : invoice.paidAt,
        metadata: {
          ...invoiceMetadata,
          pesapal: { ...(invoiceMetadata.pesapal || {}), confirmationCode: transaction.confirmationCode, confirmedAt: new Date().toISOString() },
        },
        updatedAt: new Date(),
      })
      .where(and(eq(platformInvoices.id, invoice.id), ne(platformInvoices.status, "paid")))
      .returning({ id: platformInvoices.id });

    if (updated.length > 0) {
      await db.insert(auditLogs).values({
        tenantId: invoice.tenantId,
        action: "platform_invoice.paid",
        entity: "platform_invoice",
        entityId: invoice.id,
        metadata: { invoiceNumber: invoice.invoiceNumber, amount: transaction.amount, currency: transaction.currency, orderTrackingId, provider: "pesapal" },
      }).catch(() => null);

      const notifyUserId = invoiceMetadata?.pesapal?.initiatedBy;
      if (notifyUserId) {
        await db.insert(notifications).values({
          tenantId: invoice.tenantId,
          userId: notifyUserId,
          type: "platform_invoice",
          title: nowPaidInFull ? "Invoice paid" : "Payment received",
          message: nowPaidInFull
            ? `Invoice ${invoice.invoiceNumber} has been paid in full via Pesapal.`
            : `A payment of ${transaction.currency} ${transaction.amount.toFixed(2)} was received for invoice ${invoice.invoiceNumber}.`,
          metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, actionUrl: `/billing/platform-invoices/${invoice.id}` },
        }).catch(() => null);
      }
    }

    return ack(orderTrackingId, orderMerchantReference, 200);
  } catch (error) {
    console.error("[pesapal ipn] failed to process notification:", error);
    return ack(orderTrackingId, orderMerchantReference, 500);
  }
}

export async function POST(request: NextRequest) {
  return handleIpn(request);
}

export async function GET(request: NextRequest) {
  return handleIpn(request);
}
