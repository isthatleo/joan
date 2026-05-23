import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { markInvoicePaidSchema } from "@/lib/accountant/route-schemas";
import { validateFinancePayload } from "@/lib/accountant/finance-api";

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

    await db.$queryRaw`
      UPDATE invoices
      SET amount_due = '0', status = 'paid', updated_at = ${parsed.data.paidAt || new Date().toISOString()}
      WHERE tenant_id = ${tenantId} AND id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking invoice paid:", error);
    return NextResponse.json({ error: "Failed to mark invoice paid" }, { status: 500 });
  }
}
