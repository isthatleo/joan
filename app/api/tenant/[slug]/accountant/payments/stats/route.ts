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

    // Get payment statistics
    const [
      totalPaymentsResult,
      completedPaymentsResult,
      pendingPaymentsResult,
      failedPaymentsResult,
      totalAmountResult,
      averagePaymentResult,
      refundTotalResult,
    ] = await Promise.all([
      // Total payments count
      db.$queryRaw`
        SELECT COUNT(*) as count
        FROM payments
        WHERE tenant_id = ${tenantId}
      `,

      // Completed payments count
      db.$queryRaw`
        SELECT COUNT(*) as count
        FROM payments
        WHERE tenant_id = ${tenantId}
        AND status = 'completed'
      `,

      // Pending payments count
      db.$queryRaw`
        SELECT COUNT(*) as count
        FROM payments
        WHERE tenant_id = ${tenantId}
        AND status = 'pending'
      `,

      // Failed payments count
      db.$queryRaw`
        SELECT COUNT(*) as count
        FROM payments
        WHERE tenant_id = ${tenantId}
        AND status = 'failed'
      `,

      // Total amount processed
      db.$queryRaw`
        SELECT COALESCE(SUM(amount::numeric), 0) as total
        FROM payments
        WHERE tenant_id = ${tenantId}
        AND status = 'completed'
      `,

      // Average payment amount
      db.$queryRaw`
        SELECT COALESCE(AVG(amount::numeric), 0) as average
        FROM payments
        WHERE tenant_id = ${tenantId}
        AND status = 'completed'
      `,

      // Total refunds
      db.$queryRaw`
        SELECT COALESCE(SUM(refund_amount::numeric), 0) as total
        FROM payments
        WHERE tenant_id = ${tenantId}
        AND refund_amount::numeric > 0
      `,
    ]);

    const totalPayments = Number(totalPaymentsResult[0]?.count || 0);
    const completedPayments = Number(completedPaymentsResult[0]?.count || 0);
    const pendingPayments = Number(pendingPaymentsResult[0]?.count || 0);
    const failedPayments = Number(failedPaymentsResult[0]?.count || 0);
    const totalAmount = Number(totalAmountResult[0]?.total || 0);
    const averagePayment = Number(averagePaymentResult[0]?.average || 0);
    const refundTotal = Number(refundTotalResult[0]?.total || 0);

    const monthlyRevenue = totalAmount; // Simplified - would calculate based on current month

    const stats = {
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      totalAmount,
      averagePayment,
      monthlyRevenue,
      refundTotal,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching payment stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment statistics" },
      { status: 500 }
    );
  }
}

