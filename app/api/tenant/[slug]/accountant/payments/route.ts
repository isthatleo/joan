import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";
import { paymentCreateSchema } from "@/lib/accountant/route-schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const slug = resolvedParams.slug;

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const method = searchParams.get("method");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");


    let whereClause = "p.tenant_id = $1";
    const queryParams: Array<string | number> = [tenantId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (method) {
      whereClause += ` AND p.method = $${paramIndex}`;
      queryParams.push(method);
      paramIndex++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      WHERE ${whereClause}
    `;

    const totalResult = await db.$queryRaw(countQuery, queryParams);
    const total = Number(totalResult[0]?.total || 0);

    // Get payments with pagination
    const offset = (page - 1) * limit;
    const paymentsQuery = `
      SELECT
        p.id,
        p.invoice_id,
        p.amount,
        p.method,
        p.status,
        p.transaction_id,
        p.created_at,
        p.processed_at,
        p.notes,
        p.fee,
        p.refund_amount,
        i.patient_id,
        pat.full_name as patient_name
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN patients pat ON i.patient_id = pat.id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const payments = await db.$queryRaw(paymentsQuery, queryParams);

    const formattedPayments = payments.map((payment: any) => ({
      id: payment.id,
      invoiceId: payment.invoice_id,
      patientId: payment.patient_id,
      patientName: payment.patient_name || "Unknown Patient",
      amount: Number(payment.amount),
      method: payment.method,
      status: payment.status,
      transactionId: payment.transaction_id,
      processedAt: payment.processed_at,
      createdAt: payment.created_at,
      notes: payment.notes,
      fee: payment.fee ? Number(payment.fee) : undefined,
      refundAmount: payment.refund_amount ? Number(payment.refund_amount) : undefined,
    }));

    return NextResponse.json(formattedPayments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const slug = resolvedParams.slug;

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const jsonResult = await parseJsonBody(request);
    if (!jsonResult.ok) return jsonResult.response;
    const parsed = validateFinancePayload(paymentCreateSchema, jsonResult.data);
    if (!parsed.ok) return parsed.response;

    const paymentInsert = await db.$queryRaw`
      INSERT INTO payments (
        tenant_id,
        invoice_id,
        amount,
        method,
        transaction_id,
        notes,
        fee,
        status,
        created_by,
        processed_at
      )
      VALUES (
        ${tenantId},
        ${parsed.data.invoiceId},
        ${parsed.data.amount},
        ${parsed.data.method},
        ${parsed.data.transactionId || null},
        ${parsed.data.notes || null},
        ${parsed.data.fee || null},
        ${parsed.data.status},
        ${session.user.id},
        ${parsed.data.status === "completed" ? new Date().toISOString() : null}
      )
      RETURNING id, invoice_id
    `;

    // If payment is completed, update invoice amount due
    if (parsed.data.status === "completed") {
      const invoiceResult = await db.$queryRaw`
        SELECT amount, amount_due, status
        FROM invoices
        WHERE id = ${parsed.data.invoiceId}
        LIMIT 1
      `;
      const invoice = invoiceResult[0] as
        | { amount: string | number; amount_due: string | number; status: string }
        | undefined;

      if (invoice) {
        const invoiceAmount = Number(invoice.amount || 0);
        const currentAmountDue = Number(invoice.amount_due || 0);
        const newAmountDue = Math.max(0, currentAmountDue - Number(parsed.data.amount || 0));
        const nextStatus =
          newAmountDue === 0
            ? "paid"
            : newAmountDue < invoiceAmount
              ? "partial"
              : invoice.status;

        await db.$queryRaw`
          UPDATE invoices
          SET amount_due = ${String(newAmountDue)}, status = ${nextStatus}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${parsed.data.invoiceId}
        `;
      }
    }

    return NextResponse.json(paymentInsert[0], { status: 201 });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}

