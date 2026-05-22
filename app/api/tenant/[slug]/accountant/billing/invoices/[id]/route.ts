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
        i.*,
        p.full_name AS patient_name,
        p.email AS patient_email,
        COALESCE(SUM(pay.amount), 0) AS paid_amount
      FROM invoices i
      LEFT JOIN patients p ON i.patient_id = p.id
      LEFT JOIN payments pay ON pay.invoice_id = i.id AND pay.status = 'completed'
      WHERE i.tenant_id = ${tenantId} AND i.id = ${id}
      GROUP BY i.id, p.full_name, p.email
      LIMIT 1
    `;

    const invoice = (result as any[])[0];
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    return NextResponse.json({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      patientId: invoice.patient_id,
      patientName: invoice.patient_name || "Unknown Patient",
      patientEmail: invoice.patient_email || "",
      totalAmount: Number(invoice.amount || 0),
      amountDue: Number(invoice.amount_due || 0),
      paidAmount: Number(invoice.paid_amount || 0),
      status: invoice.status,
      dueDate: invoice.due_date,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at,
      description: invoice.description || "",
      notes: invoice.notes || "",
      paymentTerms: invoice.payment_terms || "",
      items: (() => {
        try {
          return invoice.items ? JSON.parse(invoice.items) : [];
        } catch {
          return [];
        }
      })(),
    });
  } catch (error) {
    console.error("Error fetching invoice detail:", error);
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
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

    const body = await request.json();
    const amount = Number(body.totalAmount ?? body.amount ?? 0);
    const paidAmount = Number(body.paidAmount ?? 0);
    const amountDue = Math.max(0, Number(body.amountDue ?? amount - paidAmount));

    await db.$queryRaw`
      UPDATE invoices
      SET
        amount = ${String(amount)},
        amount_due = ${String(amountDue)},
        status = ${body.status || "draft"},
        due_date = ${body.dueDate || null},
        description = ${body.description || null},
        notes = ${body.notes || null},
        payment_terms = ${body.paymentTerms || null},
        items = ${body.items ? JSON.stringify(body.items) : null},
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = ${tenantId} AND id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}
