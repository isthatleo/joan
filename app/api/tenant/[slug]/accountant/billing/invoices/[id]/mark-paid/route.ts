import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { markInvoicePaidSchema } from "@/lib/accountant/route-schemas";
import { validateFinancePayload } from "@/lib/accountant/finance-api";
import { validatePaymentMethod } from "@/lib/billing-settings";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug, id } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    let payload: unknown = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }
    const parsed = validateFinancePayload(markInvoicePaidSchema, payload);
    if (!parsed.ok) return parsed.response;

    const paymentMethod = parsed.data.method || "cash";
    if (!(await validatePaymentMethod(slug, paymentMethod))) {
      return NextResponse.json({ error: "Payment method is not enabled for this tenant" }, { status: 400 });
    }

    const invoiceRows = await db.$queryRaw`
      SELECT id, amount_due
      FROM invoices
      WHERE tenant_id = ${tenantId} AND id = ${id}
      LIMIT 1
    `;

    const invoice = invoiceRows[0] as { id: string; amount_due: string } | undefined;
    if (!invoice?.id) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const amountDue = Number(invoice.amount_due || 0);

    await db.insert(payments).values({
      tenantId,
      invoiceId: id,
      method: paymentMethod,
      amount: String(amountDue),
      status: "completed",
      transactionId: parsed.data.transactionId || null,
      notes: parsed.data.notes || null,
      createdBy: session.user.id,
      processedAt: parsed.data.paidAt || new Date(),
    });

    await db.$queryRaw`
      UPDATE invoices
      SET amount_due = '0', status = 'paid', updated_at = ${parsed.data.paidAt || new Date().toISOString()}
      WHERE tenant_id = ${tenantId} AND id = ${id}
    `;

    return NextResponse.json({ success: true, method: paymentMethod, amountPaid: amountDue });
  } catch (error) {
    console.error("Error marking invoice paid:", error);
    return NextResponse.json({ error: "Failed to mark invoice paid" }, { status: 500 });
  }
}
