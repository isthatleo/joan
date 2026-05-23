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

    const [revenueRow] = (await db.$queryRaw`
      SELECT COALESCE(SUM(amount::numeric), 0) AS total
      FROM payments
      WHERE tenant_id = ${tenantId}
        AND status = 'completed'
        AND created_at >= CURRENT_DATE - ${interval}::interval
    `) as any[];
    const [receivableRow] = (await db.$queryRaw`
      SELECT COALESCE(SUM(amount_due::numeric), 0) AS total
      FROM invoices
      WHERE tenant_id = ${tenantId}
        AND status NOT IN ('paid', 'cancelled')
        AND created_at >= CURRENT_DATE - ${interval}::interval
    `) as any[];
    const [expensesRow] = (await db.$queryRaw`
      SELECT COALESCE(SUM(amount::numeric), 0) AS total
      FROM expenses
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND expense_date >= CURRENT_DATE - ${interval}::interval
    `) as any[];
    const [payableRow] = (await db.$queryRaw`
      SELECT COALESCE(SUM((amount::numeric - amount_paid::numeric)), 0) AS total
      FROM accounts_payable
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND status <> 'paid'
        AND due_date >= CURRENT_DATE - ${interval}::interval
    `) as any[];

    const totalRevenue = Number(revenueRow?.total || 0);
    const accountsReceivable = Number(receivableRow?.total || 0);
    const totalExpenses = Number(expensesRow?.total || 0);
    const accountsPayable = Number(payableRow?.total || 0);
    const netProfit = totalRevenue - totalExpenses;

    return NextResponse.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin: totalRevenue ? (netProfit / totalRevenue) * 100 : 0,
      accountsReceivable,
      accountsPayable,
      cashFlow: netProfit,
      debtToEquity: accountsReceivable > 0 ? accountsPayable / accountsReceivable : 0,
      returnOnAssets: totalRevenue ? (netProfit / totalRevenue) * 100 : 0,
      currentRatio: accountsPayable > 0 ? accountsReceivable / accountsPayable : 0,
    });
  } catch (error) {
    console.error("Error fetching financial metrics:", error);
    return NextResponse.json({ error: "Failed to fetch financial metrics" }, { status: 500 });
  }
}
