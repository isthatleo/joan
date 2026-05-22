import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";

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
