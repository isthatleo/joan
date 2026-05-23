import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { startDateForAccountantRange } from "@/lib/accountant/analytics";

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
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "12months";

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Calculate date range
    const startDate = startDateForAccountantRange(range);

    // Get revenue metrics
    const [
      totalRevenueResult,
      monthlyGrowthResult,
      averageTransactionResult,
      topRevenueSourceResult,
      collectionRateResult,
      outstandingBalanceResult,
      projectedRevenueResult,
    ] = await Promise.all([
      // Total revenue in period
      db.$queryRaw`
        SELECT COALESCE(SUM(amount::numeric), 0) as total
        FROM payments
        WHERE tenant_id = ${tenantId}
        AND status = 'completed'
        AND created_at >= ${startDate}
      `,

      // Monthly growth calculation
      db.$queryRaw`
        SELECT
          COALESCE(
            (SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN amount::numeric END) -
             SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE - interval '1 month')
                          AND created_at < date_trunc('month', CURRENT_DATE) THEN amount::numeric END)) /
            NULLIF(SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE - interval '1 month')
                               AND created_at < date_trunc('month', CURRENT_DATE) THEN amount::numeric END), 0) * 100,
            0
          ) as growth
        FROM payments
        WHERE tenant_id = ${tenantId}
        AND status = 'completed'
        AND created_at >= ${startDate}
      `,

      // Average transaction value
      db.$queryRaw`
        SELECT COALESCE(AVG(amount::numeric), 0) as average
        FROM payments
        WHERE tenant_id = ${tenantId}
        AND status = 'completed'
        AND created_at >= ${startDate}
      `,

      // Top revenue source (simplified - would need more complex logic)
      db.$queryRaw`
        SELECT 'Insurance' as source
      `,

      // Collection rate
      db.$queryRaw`
        SELECT
          CASE
            WHEN COUNT(*) > 0 THEN
              ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END)::decimal / COUNT(*) * 100, 1)
            ELSE 0
          END as rate
        FROM payments
        WHERE tenant_id = ${tenantId}
        AND created_at >= ${startDate}
      `,

      // Outstanding balance
      db.$queryRaw`
        SELECT COALESCE(SUM(amount_due::numeric), 0) as total
        FROM invoices
        WHERE tenant_id = ${tenantId}
        AND status IN ('sent', 'viewed', 'overdue')
      `,

      // Projected revenue (simplified calculation)
      db.$queryRaw`
        SELECT COALESCE(AVG(monthly_total) * 1.05, 0) as projected
        FROM (
          SELECT SUM(amount::numeric) as monthly_total
          FROM payments
          WHERE tenant_id = ${tenantId}
          AND status = 'completed'
          AND created_at >= date_trunc('month', CURRENT_DATE - interval '3 months')
          GROUP BY date_trunc('month', created_at)
          ORDER BY date_trunc('month', created_at) DESC
          LIMIT 3
        ) monthly
      `,
    ]);

    const totalRevenue = Number(totalRevenueResult[0]?.total || 0);
    const monthlyGrowth = Number(monthlyGrowthResult[0]?.growth || 0);
    const averageTransactionValue = Number(averageTransactionResult[0]?.average || 0);
    const topRevenueSource = topRevenueSourceResult[0]?.source || "Insurance";
    const collectionRate = Number(collectionRateResult[0]?.rate || 0);
    const outstandingBalance = Number(outstandingBalanceResult[0]?.total || 0);
    const projectedRevenue = Number(projectedRevenueResult[0]?.projected || 0);

    const metrics = {
      totalRevenue,
      monthlyGrowth,
      averageTransactionValue,
      topRevenueSource,
      collectionRate,
      outstandingBalance,
      projectedRevenue,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching revenue metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue metrics" },
      { status: 500 }
    );
  }
}

