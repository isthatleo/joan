import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const slug = resolvedParams.slug;

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Get tenant by slug
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tenantId = tenant.id;

    // Get invoice statistics
    const stats = await db.$queryRaw`
      SELECT
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN status IN ('sent', 'viewed', 'pending') THEN 1 END) as pending_invoices,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices,
          COALESCE(SUM(amount::numeric), 0) as total_revenue,
          COALESCE(AVG(amount::numeric), 0) as average_invoice_value
      FROM invoices
      WHERE tenant_id = ${tenantId}
    `;

    const data = stats[0] as any;

    return NextResponse.json({
      totalInvoices: Number(data.total_invoices || 0),
      paidInvoices: Number(data.paid_invoices || 0),
      pendingInvoices: Number(data.pending_invoices || 0),
      overdueInvoices: Number(data.overdue_invoices || 0),
      totalRevenue: Number(data.total_revenue || 0),
      averageInvoiceValue: Number(data.average_invoice_value || 0),
    });
  } catch (error) {
    console.error("Error fetching invoice stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice statistics" },
      { status: 500 }
    );
  }
}

