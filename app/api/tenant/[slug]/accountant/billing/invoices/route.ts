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
    const recent = searchParams.get("recent") === "true";
    const status = searchParams.get("status");
    const patientId = searchParams.get("patientId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");


    let whereClause = "i.tenant_id = $1";
    const params = [tenantId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (patientId) {
      whereClause += ` AND i.patient_id = $${paramIndex}`;
      params.push(patientId);
      paramIndex++;
    }

    if (recent) {
      whereClause += ` AND i.created_at >= CURRENT_DATE - INTERVAL '30 days'`;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM invoices i
      WHERE ${whereClause}
    `;

    const totalResult = await db.$queryRaw(countQuery, params);
    const total = Number(totalResult[0]?.total || 0);

    // Get invoices with pagination
    const offset = (page - 1) * limit;
    const invoicesQuery = `
      SELECT
        i.id,
        i.invoice_number,
        i.amount,
        i.amount_due,
        i.status,
        i.due_date,
        i.created_at as issue_date,
        i.updated_at,
        p.full_name as patient_name,
        p.id as patient_id,
        p.email as patient_email,
        COALESCE(SUM(pay.amount), 0) as paid_amount
      FROM invoices i
      LEFT JOIN patients p ON i.patient_id = p.id
      LEFT JOIN payments pay ON pay.invoice_id = i.id AND pay.status = 'completed'
      WHERE ${whereClause}
      GROUP BY i.id, p.full_name, p.id, p.email
      ORDER BY i.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const invoices = await db.$queryRaw(invoicesQuery, params);

    const formattedInvoices = invoices.map((invoice: any) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      patientName: invoice.patient_name || "Unknown Patient",
      patientId: invoice.patient_id,
      patientEmail: invoice.patient_email,
      totalAmount: Number(invoice.amount),
      amountDue: Number(invoice.amount_due),
      paidAmount: Number(invoice.paid_amount || 0),
      status: invoice.status,
      dueDate: invoice.due_date,
      issueDate: invoice.issue_date,
      updatedAt: invoice.updated_at,
    }));

    return NextResponse.json(formattedInvoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
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
      patientId,
      amount,
      amountDue,
      dueDate,
      description,
      notes,
      paymentTerms,
      items,
      status,
    } = body;

    if (!patientId || !amount || !dueDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const invoiceNumber = `INV-${Date.now()}`;
    const insertResult = await db.$queryRaw`
      INSERT INTO invoices (
        tenant_id,
        patient_id,
        invoice_number,
        amount,
        amount_due,
        status,
        due_date,
        description,
        notes,
        payment_terms,
        items,
        created_by
      )
      VALUES (
        ${tenantId},
        ${patientId},
        ${invoiceNumber},
        ${String(parseFloat(amount))},
        ${String(amountDue ? parseFloat(amountDue) : parseFloat(amount))},
        ${status || "draft"},
        ${dueDate},
        ${description || null},
        ${notes || null},
        ${paymentTerms || null},
        ${items ? JSON.stringify(items) : null},
        ${session.user.id}
      )
      RETURNING id, invoice_number
    `;

    return NextResponse.json(insertResult[0]);
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}

