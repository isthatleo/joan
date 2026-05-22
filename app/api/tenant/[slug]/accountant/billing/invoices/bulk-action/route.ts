import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";

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

    const { action, invoiceIds } = await request.json();
    const ids = Array.isArray(invoiceIds) ? invoiceIds : [];
    if (!ids.length) return NextResponse.json({ success: true });

    if (action === "mark_paid") {
      for (const id of ids) {
        await db.$queryRaw`
          UPDATE invoices
          SET amount_due = '0', status = 'paid', updated_at = CURRENT_TIMESTAMP
          WHERE tenant_id = ${tenantId} AND id = ${id}
        `;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error applying invoice bulk action:", error);
    return NextResponse.json({ error: "Failed to apply bulk action" }, { status: 500 });
  }
}
