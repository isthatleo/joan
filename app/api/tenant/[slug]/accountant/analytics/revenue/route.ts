import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { intervalForAccountantRange } from "@/lib/accountant/analytics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const range = new URL(request.url).searchParams.get("range");
    const interval = intervalForAccountantRange(range);

    const rows = await db.$queryRaw(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS period,
        COALESCE(SUM(amount::numeric), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN method = 'insurance' THEN amount::numeric ELSE 0 END), 0) AS insurance_revenue,
        COALESCE(SUM(CASE WHEN method IN ('cash', 'credit_card', 'bank_transfer', 'check') THEN amount::numeric ELSE 0 END), 0) AS self_pay_revenue,
        COALESCE(SUM(CASE WHEN method NOT IN ('insurance', 'cash', 'credit_card', 'bank_transfer', 'check') THEN amount::numeric ELSE 0 END), 0) AS other_revenue,
        COUNT(*) AS transaction_count,
        COALESCE(AVG(amount::numeric), 0) AS average_transaction
      FROM payments
      WHERE tenant_id = $1
        AND status = 'completed'
        AND created_at >= CURRENT_DATE - $2::interval
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `, [tenantId, interval]);

    const data = (rows as any[]).map((row, index, all) => {
      const current = Number(row.total_revenue || 0);
      const previous = index > 0 ? Number(all[index - 1].total_revenue || 0) : current;
      const growth = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      return {
        period: row.period,
        totalRevenue: current,
        insuranceRevenue: Number(row.insurance_revenue || 0),
        selfPayRevenue: Number(row.self_pay_revenue || 0),
        otherRevenue: Number(row.other_revenue || 0),
        transactionCount: Number(row.transaction_count || 0),
        averageTransaction: Number(row.average_transaction || 0),
        growth,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching revenue analytics:", error);
    return NextResponse.json([], { status: 200 });
  }
}
