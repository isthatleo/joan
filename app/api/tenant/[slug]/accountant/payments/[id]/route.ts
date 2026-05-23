import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";
import { paymentUpdateSchema } from "@/lib/accountant/route-schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug, id } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const result = await db.$queryRaw`
      SELECT
        p.*,
        i.invoice_number,
        i.patient_id,
        pat.full_name AS patient_name,
        pat.email AS patient_email
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN patients pat ON i.patient_id = pat.id
      WHERE p.tenant_id = ${tenantId} AND p.id = ${id}
      LIMIT 1
    `;

    const payment = (result as any[])[0];
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    return NextResponse.json({
      id: payment.id,
      invoiceId: payment.invoice_id,
      invoiceNumber: payment.invoice_number,
      patientId: payment.patient_id,
      patientName: payment.patient_name || "Unknown Patient",
      patientEmail: payment.patient_email || "",
      amount: Number(payment.amount || 0),
      method: payment.method,
      status: payment.status,
      transactionId: payment.transaction_id,
      createdAt: payment.created_at,
      processedAt: payment.processed_at,
      notes: payment.notes || "",
      fee: payment.fee ? Number(payment.fee) : 0,
      refundAmount: payment.refund_amount ? Number(payment.refund_amount) : 0,
    });
  } catch (error) {
    console.error("Error fetching payment detail:", error);
    return NextResponse.json({ error: "Failed to fetch payment" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug, id } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const jsonResult = await parseJsonBody(request);
    if (!jsonResult.ok) return jsonResult.response;
    const parsed = validateFinancePayload(paymentUpdateSchema, jsonResult.data);
    if (!parsed.ok) return parsed.response;

    const existingResult = await db.$queryRaw`
      SELECT p.id, p.invoice_id, p.amount, p.status, i.amount AS invoice_amount, i.amount_due, i.status AS invoice_status, i.due_date
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE p.tenant_id = ${tenantId} AND p.id = ${id}
      LIMIT 1
    `;
    const existing = (existingResult as any[])[0];
    if (!existing) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    const nextAmount = parsed.data.amount != null ? Number(parsed.data.amount) : Number(existing.amount || 0);
    const nextStatus = parsed.data.status || existing.status;
    const previousContribution = existing.status === "completed" ? Number(existing.amount || 0) : 0;
    const nextContribution = nextStatus === "completed" ? nextAmount : 0;

    const updated = await db.$queryRaw`
      UPDATE payments
      SET
        amount = COALESCE(${parsed.data.amount || null}, amount),
        method = COALESCE(${parsed.data.method || null}, method),
        status = COALESCE(${parsed.data.status || null}, status),
        transaction_id = COALESCE(${parsed.data.transactionId || null}, transaction_id),
        notes = COALESCE(${parsed.data.notes || null}, notes),
        fee = COALESCE(${parsed.data.fee || null}, fee),
        processed_at = CASE
          WHEN COALESCE(${parsed.data.status || null}, status) = 'completed' AND processed_at IS NULL THEN CURRENT_TIMESTAMP
          ELSE processed_at
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = ${tenantId} AND id = ${id}
      RETURNING id
    `;

    if (!(updated as any[])[0]?.id) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (existing.invoice_id) {
      const invoiceAmount = Number(existing.invoice_amount || 0);
      const currentAmountDue = Number(existing.amount_due || 0);
      const recomputedAmountDue = Math.min(
        invoiceAmount,
        Math.max(0, currentAmountDue + previousContribution - nextContribution)
      );
      const nextInvoiceStatus =
        recomputedAmountDue === 0
          ? "paid"
          : recomputedAmountDue < invoiceAmount
            ? "partial"
            : new Date(existing.due_date) < new Date()
              ? "overdue"
              : "sent";

      await db.$queryRaw`
        UPDATE invoices
        SET amount_due = ${String(recomputedAmountDue)}, status = ${nextInvoiceStatus}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existing.invoice_id}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}
