import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";
import { invoiceCreateSchema } from "@/lib/accountant/route-schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const recent = searchParams.get("recent") === "true";
    const status = searchParams.get("status");
    const patientId = searchParams.get("patientId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    let whereClause = "i.tenant_id = $1";
    const queryParams: Array<string | number> = [tenantId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND i.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (patientId) {
      whereClause += ` AND i.patient_id = $${paramIndex}`;
      queryParams.push(patientId);
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

    const totalResult = await db.$queryRaw(countQuery, queryParams);
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
        COALESCE(SUM(pay.amount::numeric), 0) as paid_amount
      FROM invoices i
      LEFT JOIN patients p ON i.patient_id = p.id
      LEFT JOIN payments pay ON pay.invoice_id = i.id AND pay.status = 'completed'
      WHERE ${whereClause}
      GROUP BY i.id, p.full_name, p.id, p.email
      ORDER BY i.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const invoices = await db.$queryRaw(invoicesQuery, queryParams);

    const formattedInvoices = invoices.map((invoice: any) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      patientName: invoice.patient_name || "Unknown Patient",
      patientId: invoice.patient_id,
      patientEmail: invoice.patient_email,
      amount: Number(invoice.amount),
      amountDue: Number(invoice.amount_due),
      paidAmount: Number(invoice.paid_amount || 0),
      status: invoice.status,
      dueDate: invoice.due_date,
      issueDate: invoice.issue_date,
      updatedAt: invoice.updated_at,
    }));

    return NextResponse.json(recent ? formattedInvoices : {
      invoices: formattedInvoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
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

    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const jsonResult = await parseJsonBody(request);
    if (!jsonResult.ok) return jsonResult.response;
    const parsed = validateFinancePayload(invoiceCreateSchema, jsonResult.data);
    if (!parsed.ok) return parsed.response;

    const invoiceNumber = `INV-${Date.now()}`;

    const created = await db.$queryRaw`
      INSERT INTO invoices (
        tenant_id,
        patient_id,
        invoice_number,
        total_amount,
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
        ${parsed.data.patientId},
        ${invoiceNumber},
        ${parsed.data.amount},
        ${parsed.data.amount},
        ${parsed.data.amountDue || parsed.data.amount},
        ${parsed.data.status},
        ${parsed.data.dueDate},
        ${parsed.data.description || null},
        ${parsed.data.notes || null},
        ${parsed.data.paymentTerms || null},
        ${parsed.data.items ? JSON.stringify(parsed.data.items) : null},
        ${session.user.id}
      )
      RETURNING id, invoice_number
    `;

    return NextResponse.json(created[0], { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}

