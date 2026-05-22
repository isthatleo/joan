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

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    // Get billing metrics
    const [
      totalRevenueResult,
      pendingInvoicesResult,
      overdueInvoicesResult,
      totalInvoicesResult,
      averageInvoiceResult,
    ] = await Promise.all([
      // Total revenue
      db.$queryRaw`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payments
        WHERE tenant_id = ${tenantId}
        AND status = 'completed'
      `,

      // Pending invoices count
      db.$queryRaw`
        SELECT COUNT(*) as count
        FROM invoices
        WHERE tenant_id = ${tenantId}
        AND status IN ('sent', 'viewed')
        AND due_date >= CURRENT_DATE
      `,

      // Overdue invoices count
      db.$queryRaw`
        SELECT COUNT(*) as count
        FROM invoices
        WHERE tenant_id = ${tenantId}
        AND status IN ('sent', 'viewed')
        AND due_date < CURRENT_DATE
      `,

      // Total invoices count
      db.$queryRaw`
        SELECT COUNT(*) as count
        FROM invoices
        WHERE tenant_id = ${tenantId}
      `,

      // Average invoice value
      db.$queryRaw`
        SELECT COALESCE(AVG(total_amount), 0) as average
        FROM invoices
        WHERE tenant_id = ${tenantId}
        AND status IN ('paid', 'sent', 'viewed')
      `,
    ]);

    const totalRevenue = Number(totalRevenueResult[0]?.total || 0);
    const pendingInvoices = Number(pendingInvoicesResult[0]?.count || 0);
    const overdueInvoices = Number(overdueInvoicesResult[0]?.count || 0);
    const totalInvoices = Number(totalInvoicesResult[0]?.count || 0);
    const averageInvoiceValue = Number(averageInvoiceResult[0]?.average || 0);

    const metrics = {
      totalRevenue,
      pendingInvoices,
      overdueInvoices,
      totalInvoices,
      averageInvoiceValue,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching billing metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing metrics" },
      { status: 500 }
    );
  }
}

