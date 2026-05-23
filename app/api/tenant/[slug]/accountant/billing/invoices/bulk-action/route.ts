import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { invoiceBulkActionSchema } from "@/lib/accountant/route-schemas";
import { parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";
import { sendEmail } from "@/lib/email/send-email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const jsonResult = await parseJsonBody(request);
    if (!jsonResult.ok) return jsonResult.response;
    const parsed = validateFinancePayload(invoiceBulkActionSchema, jsonResult.data);
    if (!parsed.ok) return parsed.response;

    if (parsed.data.action === "mark_paid") {
      for (const id of parsed.data.invoiceIds) {
        await db.$queryRaw`
          UPDATE invoices
          SET amount_due = '0', status = 'paid', updated_at = CURRENT_TIMESTAMP
          WHERE tenant_id = ${tenantId} AND id = ${id}
        `;
      }
    }

    if (parsed.data.action === "send_reminder") {
      let sent = 0;

      for (const id of parsed.data.invoiceIds) {
        const invoiceRows = await db.$queryRaw`
          SELECT i.id, i.amount_due, i.due_date, p.email, p.full_name
          FROM invoices i
          LEFT JOIN patients p ON i.patient_id = p.id
          WHERE i.tenant_id = ${tenantId} AND i.id = ${id}
          LIMIT 1
        `;
        const invoice = (invoiceRows as any[])[0];
        if (!invoice?.email) continue;

        const sendResult = await sendEmail({
          to: invoice.email,
          subject: `Payment reminder for invoice ${id}`,
          tenantSlug: slug,
          templateName: "invoice-reminder",
          template: {
            templateName: "invoice-reminder",
            recipientName: invoice.full_name || "Customer",
            heading: "Invoice payment reminder",
            body: `This is a reminder that invoice ${id} is still outstanding.`,
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

        if (sendResult.ok) {
          sent += 1;
        }
      }

      return NextResponse.json({ success: true, sent });
    }

    return NextResponse.json({ success: true, updated: parsed.data.invoiceIds.length });
  } catch (error) {
    console.error("Error applying invoice bulk action:", error);
    return NextResponse.json({ error: "Failed to apply bulk action" }, { status: 500 });
  }
}
