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

    // Get current date info for calculations
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch financial metrics
    const [
      totalRevenueResult,
      pendingInvoicesResult,
      pendingPaymentsResult,
      totalPatientsResult,
      outstandingBalanceResult,
      collectionsData,
      averagePaymentTimeResult,
    ] = await Promise.all([
      // Total revenue year to date
      db.$queryRaw`
        SELECT COALESCE(SUM(amount::numeric), 0) as total
        FROM payments
        WHERE tenant_id = ${tenantId}
        AND status = 'completed'
        AND created_at >= ${startOfYear}
      `,

      // Pending invoices count
      db.$queryRaw`
        SELECT COUNT(*) as count
        FROM invoices
        WHERE tenant_id = ${tenantId}
        AND status IN ('sent', 'viewed')
        AND due_date >= CURRENT_DATE
      `,

      // Pending payments count
      db.$queryRaw`
        SELECT COUNT(*) as count
        FROM payments
        WHERE tenant_id = ${tenantId}
        AND status = 'pending'
      `,

      // Total patients count
      db.$queryRaw`
        SELECT COUNT(*) as count
        FROM patients
        WHERE tenant_id = ${tenantId}
      `,

      // Outstanding balance
      db.$queryRaw`
        SELECT COALESCE(SUM(amount_due::numeric), 0) as total
        FROM invoices
        WHERE tenant_id = ${tenantId}
        AND status IN ('sent', 'viewed', 'overdue')
      `,

      // Collections rate data
      db.$queryRaw`
        SELECT
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as collected,
          COUNT(*) as total
        FROM payments
        WHERE tenant_id = ${tenantId}
        AND created_at >= ${startOfMonth}
      `,

      // Average payment time
      db.$queryRaw`
        SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (p.created_at - i.created_at))/86400), 0) as avg_days
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.id
        WHERE p.tenant_id = ${tenantId}
        AND p.status = 'completed'
        AND p.created_at >= ${startOfMonth}
      `,
    ]);

    const totalRevenue = Number(totalRevenueResult[0]?.total || 0);
    const pendingInvoices = Number(pendingInvoicesResult[0]?.count || 0);
    const pendingPayments = Number(pendingPaymentsResult[0]?.count || 0);
    const totalPatients = Number(totalPatientsResult[0]?.count || 0);
    const outstandingBalance = Number(outstandingBalanceResult[0]?.total || 0);

    const collections = collectionsData[0];
    const collectionsRate = collections.total > 0
      ? Math.round((collections.collected / collections.total) * 100)
      : 0;

    const averagePaymentTime = Math.round(Number(averagePaymentTimeResult[0]?.avg_days || 0));

    // Calculate revenue growth (comparing to previous period)
    const previousPeriodStart = new Date(startOfYear);
    previousPeriodStart.setFullYear(previousPeriodStart.getFullYear() - 1);

    const previousRevenueResult = await db.$queryRaw`
      SELECT COALESCE(SUM(amount::numeric), 0) as total
      FROM payments
      WHERE tenant_id = ${tenantId}
      AND status = 'completed'
      AND created_at >= ${previousPeriodStart}
      AND created_at < ${startOfYear}
    `;

    const previousRevenue = Number(previousRevenueResult[0]?.total || 0);
    const revenueGrowth = previousRevenue > 0
      ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100)
      : 0;

    const metrics = {
      totalRevenue,
      revenueGrowth,
      pendingInvoices,
      pendingPayments,
      totalPatients,
      collectionsRate,
      outstandingBalance,
      averagePaymentTime,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching accountant dashboard metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard metrics" },
      { status: 500 }
    );
  }
}

