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

    const overdue = await db.$queryRaw`
      SELECT COUNT(*) AS count
      FROM invoices
      WHERE tenant_id = ${tenantId}
      AND due_date < CURRENT_DATE
      AND status NOT IN ('paid', 'cancelled')
    `;
    const pendingPayments = await db.$queryRaw`
      SELECT COUNT(*) AS count
      FROM payments
      WHERE tenant_id = ${tenantId}
      AND status = 'pending'
    `;

    const alerts = [];
    const overdueCount = Number((overdue as any[])[0]?.count || 0);
    const pendingCount = Number((pendingPayments as any[])[0]?.count || 0);

    if (overdueCount > 0) {
      alerts.push({
        id: "overdue-invoices",
        type: "warning",
        title: "Overdue invoices need follow-up",
        message: `${overdueCount} invoice(s) are overdue and should be reviewed.`,
      });
    }

    if (pendingCount > 0) {
      alerts.push({
        id: "pending-payments",
        type: "info",
        title: "Pending payments in queue",
        message: `${pendingCount} payment(s) are waiting for completion.`,
      });
    }

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Error fetching accountant alerts:", error);
    return NextResponse.json([], { status: 200 });
  }
}
