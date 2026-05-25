import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";
import { invoiceUpdateSchema } from "@/lib/accountant/route-schemas";
import { getTenantDefaultCurrency, syncPatientCareInvoice } from "@/lib/billing/patient-ledger";

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
    const currency = await getTenantDefaultCurrency(tenantId);

    const result = await db.$queryRaw`
      SELECT
        i.*,
        p.full_name AS patient_name,
        p.email AS patient_email,
        COALESCE(SUM(pay.amount::numeric), 0) AS paid_amount
      FROM invoices i
      LEFT JOIN patients p ON i.patient_id = p.id
      LEFT JOIN payments pay ON pay.invoice_id = i.id AND pay.status = 'completed'
      WHERE i.tenant_id = ${tenantId} AND i.id = ${id}
      GROUP BY i.id, p.full_name, p.email
      LIMIT 1
    `;

    let invoice = (result as any[])[0];
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    if (invoice.description === "Patient care ledger" && invoice.patient_id) {
      await syncPatientCareInvoice(tenantId, invoice.patient_id);
      const refreshed = await db.$queryRaw`
        SELECT
          i.*,
          p.full_name AS patient_name,
          p.email AS patient_email,
          COALESCE(SUM(pay.amount::numeric), 0) AS paid_amount
        FROM invoices i
        LEFT JOIN patients p ON i.patient_id = p.id
        LEFT JOIN payments pay ON pay.invoice_id = i.id AND pay.status = 'completed'
        WHERE i.tenant_id = ${tenantId} AND i.id = ${id}
        GROUP BY i.id, p.full_name, p.email
        LIMIT 1
      `;
      invoice = (refreshed as any[])[0] || invoice;
    }

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
      currency,
      items: (() => {
        try {
          if (!invoice.items) return [];
          if (Array.isArray(invoice.items)) return invoice.items;
          if (typeof invoice.items === "string") return JSON.parse(invoice.items);
          return [];
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

    const jsonResult = await parseJsonBody(request);
    if (!jsonResult.ok) return jsonResult.response;
    const parsed = validateFinancePayload(invoiceUpdateSchema, jsonResult.data);
    if (!parsed.ok) return parsed.response;

    const amount = parsed.data.amount ? Number(parsed.data.amount) : undefined;
    const paidAmount =
      jsonResult.data && typeof jsonResult.data === "object" && "paidAmount" in jsonResult.data
        ? Number((jsonResult.data as Record<string, unknown>).paidAmount ?? 0)
        : undefined;
    const amountDue = parsed.data.amountDue
      ? Number(parsed.data.amountDue)
      : amount != null
        ? Math.max(0, amount - Number(paidAmount ?? 0))
        : undefined;

    const updated = await db.$queryRaw`
      UPDATE invoices
      SET
        total_amount = COALESCE(${amount != null ? String(amount) : null}, total_amount),
        amount = COALESCE(${amount != null ? String(amount) : null}, amount),
        amount_due = COALESCE(${amountDue != null ? String(amountDue) : null}, amount_due),
        status = COALESCE(${parsed.data.status || null}, status),
        due_date = COALESCE(${parsed.data.dueDate || null}, due_date),
        description = COALESCE(${parsed.data.description || null}, description),
        notes = COALESCE(${parsed.data.notes || null}, notes),
        payment_terms = COALESCE(${parsed.data.paymentTerms || null}, payment_terms),
        items = COALESCE(${parsed.data.items ? JSON.stringify(parsed.data.items) : null}, items),
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = ${tenantId} AND id = ${id}
      RETURNING id
    `;

    if (!(updated as any[])[0]?.id) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}
