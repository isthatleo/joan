import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { intervalForAccountantRange } from "@/lib/accountant/analytics";

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

  const [operatingRow] = (await db.$queryRaw`
    SELECT
      COALESCE((SELECT SUM(amount::numeric) FROM payments WHERE tenant_id = ${tenantId} AND status = 'completed' AND created_at >= CURRENT_DATE - ${interval}::interval), 0)
      - COALESCE((SELECT SUM(amount) FROM expenses WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND expense_date >= CURRENT_DATE - ${interval}::interval), 0)
      AS total
  `) as any[];

  const [investingRow] = (await db.$queryRaw`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE tenant_id = ${tenantId}
      AND deleted_at IS NULL
      AND expense_date >= CURRENT_DATE - ${interval}::interval
      AND LOWER(COALESCE(category, '')) IN ('equipment', 'capital', 'capital expenditure', 'investment', 'infrastructure')
  `) as any[];

  const [financingRow] = (await db.$queryRaw`
    SELECT COALESCE(SUM(
      CASE
        WHEN LOWER(COALESCE(credit_account, '')) ~ '(loan|equity|capital|financing)' THEN amount
        WHEN LOWER(COALESCE(debit_account, '')) ~ '(loan|equity|capital|financing)' THEN -amount
        ELSE 0
      END
    ), 0) AS total
    FROM journal_entries
    WHERE tenant_id = ${tenantId}
      AND deleted_at IS NULL
      AND entry_date >= CURRENT_DATE - ${interval}::interval
  `) as any[];

  const operating = Number(operatingRow?.total || 0);
  const investing = -Math.abs(Number(investingRow?.total || 0));
  const financing = Number(financingRow?.total || 0);

  return NextResponse.json({
    operating,
    investing,
    financing,
    netCashFlow: operating + investing + financing,
  });
}
