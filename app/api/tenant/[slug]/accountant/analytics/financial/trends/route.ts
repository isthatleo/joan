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
      WITH payment_totals AS (
        SELECT
          DATE_TRUNC('month', created_at) AS month_start,
          COALESCE(SUM(amount::numeric), 0) AS revenue
        FROM payments
        WHERE tenant_id = $1
          AND status = 'completed'
          AND created_at >= CURRENT_DATE - $2::interval
        GROUP BY 1
      ),
      expense_totals AS (
        SELECT
          DATE_TRUNC('month', expense_date::timestamp) AS month_start,
          COALESCE(SUM(amount), 0) AS expenses
        FROM expenses
        WHERE tenant_id = $1
          AND deleted_at IS NULL
          AND expense_date >= CURRENT_DATE - $2::interval
        GROUP BY 1
      ),
      months AS (
        SELECT month_start FROM payment_totals
        UNION
        SELECT month_start FROM expense_totals
      )
      SELECT
        TO_CHAR(months.month_start, 'Mon YYYY') AS period,
        COALESCE(payment_totals.revenue, 0) AS revenue,
        COALESCE(expense_totals.expenses, 0) AS expenses
      FROM months
      LEFT JOIN payment_totals ON payment_totals.month_start = months.month_start
      LEFT JOIN expense_totals ON expense_totals.month_start = months.month_start
      ORDER BY months.month_start
    `, [tenantId, interval]);

    const data = (rows as any[]).map((row, index, all) => {
      const revenue = Number(row.revenue || 0);
      const expenses = Number(row.expenses || 0);
      const profit = revenue - expenses;
      const previousProfit = index > 0 ? Number(all[index - 1].revenue || 0) - Number(all[index - 1].expenses || 0) : profit;
      const growth = previousProfit !== 0 ? ((profit - previousProfit) / Math.abs(previousProfit)) * 100 : 0;
      return {
        period: row.period,
        revenue,
        expenses,
        profit,
        growth,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching financial trends:", error);
    return NextResponse.json([], { status: 200 });
  }
}
