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

    const { action, paymentIds } = await request.json();
    const ids = Array.isArray(paymentIds) ? paymentIds : [];
    if (!ids.length) return NextResponse.json({ success: true });

    if (action === "retry_failed") {
      for (const id of ids) {
        await db.$queryRaw`
          UPDATE payments
          SET status = 'pending', updated_at = CURRENT_TIMESTAMP
          WHERE tenant_id = ${tenantId} AND id = ${id}
        `;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error applying payment bulk action:", error);
    return NextResponse.json({ error: "Failed to apply bulk action" }, { status: 500 });
  }
}
