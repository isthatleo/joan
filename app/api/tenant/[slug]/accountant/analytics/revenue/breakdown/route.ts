import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { startDateForAccountantRange } from "@/lib/accountant/analytics";

const COLORS: Record<string, string> = {
  Insurance: "#3b82f6",
  "Self-Pay": "#22c55e",
  Other: "#a855f7",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    const range = new URL(request.url).searchParams.get("range");
    const startDate = startDateForAccountantRange(range);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const rows = await db.$queryRaw`
      SELECT
        CASE
          WHEN method = 'insurance' THEN 'Insurance'
          WHEN method IN ('cash', 'credit_card', 'bank_transfer', 'check') THEN 'Self-Pay'
          ELSE 'Other'
        END AS source,
        COALESCE(SUM(amount::numeric), 0) AS amount,
        COUNT(*) AS transactions
      FROM payments
      WHERE tenant_id = ${tenantId}
        AND status = 'completed'
        AND created_at >= ${startDate}
      GROUP BY 1
      ORDER BY amount DESC
    `;

    const total = (rows as any[]).reduce((sum, row) => sum + Number(row.amount || 0), 0) || 1;
    return NextResponse.json(
      (rows as any[]).map((row) => ({
        source: row.source,
        amount: Number(row.amount || 0),
        percentage: Math.round((Number(row.amount || 0) / total) * 100),
        transactions: Number(row.transactions || 0),
        color: COLORS[row.source] || "#64748b",
      }))
    );
  } catch (error) {
    console.error("Error fetching revenue breakdown:", error);
    return NextResponse.json([], { status: 200 });
  }
}
