import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const range = searchParams.get("range") || "12months";

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case "3months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case "6months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case "12months":
        startDate = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
        break;
      case "24months":
        startDate = new Date(now.getFullYear() - 2, now.getMonth() + 1, 1);
        break;
      default:
        startDate = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
    }

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
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payments
        WHERE tenant_id = ${tenantId}
        AND status = 'completed'
        AND created_at >= ${startDate}
      `,

      // Monthly growth calculation
      db.$queryRaw`
        SELECT
          COALESCE(
            (SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN amount END) -
             SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE - interval '1 month')
                          AND created_at < date_trunc('month', CURRENT_DATE) THEN amount END)) /
            NULLIF(SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE - interval '1 month')
                               AND created_at < date_trunc('month', CURRENT_DATE) THEN amount END), 0) * 100,
            0
          ) as growth
        FROM payments
        WHERE tenant_id = ${tenantId}
        AND status = 'completed'
        AND created_at >= ${startDate}
      `,

      // Average transaction value
      db.$queryRaw`
        SELECT COALESCE(AVG(amount), 0) as average
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
        SELECT COALESCE(SUM(amount_due), 0) as total
        FROM invoices
        WHERE tenant_id = ${tenantId}
        AND status IN ('sent', 'viewed', 'overdue')
      `,

      // Projected revenue (simplified calculation)
      db.$queryRaw`
        SELECT COALESCE(AVG(monthly_total) * 1.05, 0) as projected
        FROM (
          SELECT SUM(amount) as monthly_total
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

