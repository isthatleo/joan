import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const recent = searchParams.get("recent") === "true";
    const status = searchParams.get("status");
    const patientId = searchParams.get("patientId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

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
      amount: Number(invoice.amount),
      amountDue: Number(invoice.amount_due),
      paidAmount: Number(invoice.paid_amount || 0),
      status: invoice.status,
      dueDate: invoice.due_date,
      issueDate: invoice.issue_date,
      updatedAt: invoice.updated_at,
    }));

    return NextResponse.json({
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      tenantId,
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

    if (!tenantId || !patientId || !amount || !dueDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    // Create invoice
    const invoice = await db.invoice.create({
      data: {
        tenantId,
        patientId,
        invoiceNumber,
        amount: parseFloat(amount),
        amountDue: amountDue ? parseFloat(amountDue) : parseFloat(amount),
        status: status || "draft",
        dueDate: new Date(dueDate),
        description,
        notes,
        paymentTerms,
        items: items ? JSON.stringify(items) : null,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}

