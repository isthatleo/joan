import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const rows = await db.$queryRaw`
      SELECT method, COUNT(*) AS count, COALESCE(SUM(amount::numeric), 0) AS amount
      FROM payments
      WHERE tenant_id = ${tenantId}
      GROUP BY method
      ORDER BY amount DESC
    `;

    const total = (rows as any[]).reduce((sum, row) => sum + Number(row.amount || 0), 0) || 1;
    return NextResponse.json(
      (rows as any[]).map((row) => ({
        method: row.method || "unknown",
        count: Number(row.count || 0),
        amount: Number(row.amount || 0),
        percentage: Math.round((Number(row.amount || 0) / total) * 100),
      }))
    );
  } catch (error) {
    console.error("Error fetching payment method stats:", error);
    return NextResponse.json([], { status: 200 });
  }
}
