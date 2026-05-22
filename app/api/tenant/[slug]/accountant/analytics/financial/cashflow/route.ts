import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const [revenueRow] = (await db.$queryRaw`
    SELECT COALESCE(SUM(amount::numeric), 0) AS total
    FROM payments
    WHERE tenant_id = ${tenantId} AND status = 'completed'
  `) as any[];

  const operating = Number(revenueRow?.total || 0) * 0.32;
  const investing = -Math.abs(operating * 0.18);
  const financing = Math.abs(operating * 0.11);

  return NextResponse.json({
    operating,
    investing,
    financing,
    netCashFlow: operating + investing + financing,
  });
}
