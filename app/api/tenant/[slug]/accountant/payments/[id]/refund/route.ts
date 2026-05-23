import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { refundSchema } from "@/lib/accountant/route-schemas";
import { parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";

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

    const jsonResult = await parseJsonBody(request);
    if (!jsonResult.ok) return jsonResult.response;
    const parsed = validateFinancePayload(refundSchema, jsonResult.data);
    if (!parsed.ok) return parsed.response;

    await db.$queryRaw`
      UPDATE payments
      SET refund_amount = ${parsed.data.amount}, status = 'refunded', updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = ${tenantId} AND id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error refunding payment:", error);
    return NextResponse.json({ error: "Failed to refund payment" }, { status: 500 });
  }
}
