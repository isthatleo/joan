import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { intervalForAccountantRange } from "@/lib/accountant/analytics";

type RatioStatus = "good" | "warning" | "critical";

function ratioStatus(value: number, benchmark: number, direction: "above" | "below"): RatioStatus {
  if (direction === "above") {
    if (value >= benchmark) return "good";
    if (value >= benchmark * 0.75) return "warning";
    return "critical";
  }

  if (value <= benchmark) return "good";
  if (value <= benchmark * 1.25) return "warning";
  return "critical";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
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
  const [expenseRow] = (await db.$queryRaw`
    SELECT COALESCE(SUM(amount::numeric), 0) AS total
    FROM expenses
    WHERE tenant_id = ${tenantId}
      AND deleted_at IS NULL
      AND expense_date >= CURRENT_DATE - ${interval}::interval
  `) as any[];
  const [receivableRow] = (await db.$queryRaw`
    SELECT COALESCE(SUM(amount_due::numeric), 0) AS total
    FROM invoices
    WHERE tenant_id = ${tenantId}
      AND status NOT IN ('paid', 'cancelled')
      AND created_at >= CURRENT_DATE - ${interval}::interval
  `) as any[];
  const [payableRow] = (await db.$queryRaw`
    SELECT COALESCE(SUM((amount::numeric - amount_paid::numeric)), 0) AS total
    FROM accounts_payable
    WHERE tenant_id = ${tenantId}
      AND deleted_at IS NULL
      AND status <> 'paid'
      AND due_date >= CURRENT_DATE - ${interval}::interval
  `) as any[];
  const [assetRow] = (await db.$queryRaw`
    SELECT COALESCE(SUM(amount_due::numeric), 0) + COALESCE((
      SELECT SUM(amount::numeric)
      FROM payments
      WHERE tenant_id = ${tenantId}
        AND status = 'completed'
        AND created_at >= CURRENT_DATE - ${interval}::interval
    ), 0) AS total
    FROM invoices
    WHERE tenant_id = ${tenantId}
      AND created_at >= CURRENT_DATE - ${interval}::interval
  `) as any[];

  const revenue = Number(revenueRow?.total || 0);
  const expenses = Number(expenseRow?.total || 0);
  const receivables = Number(receivableRow?.total || 0);
  const payables = Number(payableRow?.total || 0);
  const assets = Math.max(Number(assetRow?.total || 0), revenue);
  const profit = revenue - expenses;

  const currentRatio = payables > 0 ? receivables / payables : receivables > 0 ? receivables : 0;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const debtRatio = assets > 0 ? (payables / assets) * 100 : 0;
  const returnOnAssets = assets > 0 ? (profit / assets) * 100 : 0;

  return NextResponse.json([
    {
      name: "Current Ratio",
      value: Number(currentRatio.toFixed(2)),
      benchmark: 1.5,
      status: ratioStatus(currentRatio, 1.5, "above"),
      description: "Short-term liquidity coverage from receivables vs payables",
    },
    {
      name: "Profit Margin",
      value: Number(profitMargin.toFixed(1)),
      benchmark: 15,
      status: ratioStatus(profitMargin, 15, "above"),
      description: "Net profit generated from collected revenue in the selected period",
    },
    {
      name: "Debt Ratio",
      value: Number(debtRatio.toFixed(1)),
      benchmark: 35,
      status: ratioStatus(debtRatio, 35, "below"),
      description: "Outstanding payables relative to tracked current assets",
    },
    {
      name: "Return on Assets",
      value: Number(returnOnAssets.toFixed(1)),
      benchmark: 10,
      status: ratioStatus(returnOnAssets, 10, "above"),
      description: "Efficiency of converting tracked assets into profit",
    },
  ]);
}
