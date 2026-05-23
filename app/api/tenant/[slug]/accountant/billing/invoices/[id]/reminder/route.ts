import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";
import { reminderSchema } from "@/lib/accountant/route-schemas";
import { sendEmail } from "@/lib/email/send-email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, id } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const jsonResult = await parseJsonBody(request);
    if (!jsonResult.ok) return jsonResult.response;
    const parsed = validateFinancePayload(reminderSchema, jsonResult.data);
    if (!parsed.ok) return parsed.response;

    const invoiceRows = await db.$queryRaw`
      SELECT i.id, i.amount_due, i.due_date, i.patient_id, p.email, p.full_name
      FROM invoices i
      LEFT JOIN patients p ON i.patient_id = p.id
      WHERE i.id = ${id} AND i.tenant_id = ${tenantId}
      LIMIT 1
    `;
    const invoice = (invoiceRows as any[])[0];

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const to = parsed.data.to || invoice.email;
    if (!to) {
      return NextResponse.json({ error: "No recipient email available for this invoice" }, { status: 409 });
    }

    const sendResult = await sendEmail({
      to,
      subject: `Payment reminder for invoice ${id}`,
      tenantSlug: slug,
      templateName: "invoice-reminder",
      template: {
        templateName: "invoice-reminder",
        recipientName: invoice.full_name || "Customer",
        heading: "Invoice payment reminder",
        body: parsed.data.note || `This is a reminder that invoice ${id} is still outstanding.`,
        variant: "invoice",
        items: [
          { label: "Invoice ID", value: id },
          { label: "Due Date", value: invoice.due_date ? String(invoice.due_date) : "Unspecified" },
          { label: "Amount", value: String(invoice.amount_due || "") },
        ],
      },
      tags: [
        { name: "feature", value: "invoice-reminder" },
        { name: "invoice_id", value: id },
      ],
    });

    if (!sendResult.ok) {
      return sendResult.response;
    }

    return NextResponse.json({ ...sendResult.data, success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to send invoice reminder:", error);
    return NextResponse.json({ error: "Failed to send invoice reminder" }, { status: 500 });
  }
}
