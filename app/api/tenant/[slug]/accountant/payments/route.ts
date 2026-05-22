import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";

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
    const params = [tenantId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (method) {
      whereClause += ` AND p.method = $${paramIndex}`;
      params.push(method);
      paramIndex++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      WHERE ${whereClause}
    `;

    const totalResult = await db.$queryRaw(countQuery, params);
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

    params.push(limit, offset);
    const payments = await db.$queryRaw(paymentsQuery, params);

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

    const body = await request.json();
    const {
      invoiceId,
      amount,
      method,
      transactionId,
      notes,
      fee,
      status,
    } = body;

    if (!invoiceId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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
        ${invoiceId},
        ${String(parseFloat(amount))},
        ${method || "credit_card"},
        ${transactionId || null},
        ${notes || null},
        ${fee ? String(parseFloat(fee)) : null},
        ${status || "pending"},
        ${session.user.id},
        ${status === "completed" ? new Date().toISOString() : null}
      )
      RETURNING id, invoice_id
    `;

    // If payment is completed, update invoice amount due
    if (status === "completed") {
      const invoiceResult = await db.$queryRaw`
        SELECT amount, amount_due, status
        FROM invoices
        WHERE id = ${invoiceId}
        LIMIT 1
      `;
      const invoice = invoiceResult[0] as
        | { amount: string | number; amount_due: string | number; status: string }
        | undefined;

      if (invoice) {
        const invoiceAmount = Number(invoice.amount || 0);
        const currentAmountDue = Number(invoice.amount_due || 0);
        const newAmountDue = Math.max(0, currentAmountDue - parseFloat(amount));
        const nextStatus =
          newAmountDue === 0
            ? "paid"
            : newAmountDue < invoiceAmount
              ? "partial"
              : invoice.status;

        await db.$queryRaw`
          UPDATE invoices
          SET amount_due = ${String(newAmountDue)}, status = ${nextStatus}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${invoiceId}
        `;
      }
    }

    return NextResponse.json(paymentInsert[0]);
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}

