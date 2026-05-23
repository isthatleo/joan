import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";

function normalizeMethod(value: string) {
  return value.trim().toLowerCase();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; method: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, method } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const normalizedMethod = normalizeMethod(decodeURIComponent(method));

    const summaryRows = await db.$queryRaw`
      SELECT
        p.method,
        COUNT(*)::int AS total_count,
        COUNT(*) FILTER (WHERE p.status = 'completed')::int AS completed_count,
        COUNT(*) FILTER (WHERE p.status = 'pending')::int AS pending_count,
        COUNT(*) FILTER (WHERE p.status = 'failed')::int AS failed_count,
        COUNT(*) FILTER (WHERE p.status = 'refunded')::int AS refunded_count,
        COALESCE(SUM(p.amount::numeric), 0) AS total_amount,
        COALESCE(AVG(p.amount::numeric), 0) AS average_amount,
        COALESCE(SUM(COALESCE(p.fee::numeric, 0)), 0) AS total_fees,
        COALESCE(SUM(COALESCE(p.refund_amount::numeric, 0)), 0) AS refund_total
      FROM payments p
      WHERE p.tenant_id = ${tenantId}
        AND LOWER(p.method) = ${normalizedMethod}
      GROUP BY p.method
      LIMIT 1
    `;

    const summary = (summaryRows as any[])[0];
    if (!summary) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    const recentRows = await db.$queryRaw`
      SELECT
        p.id,
        p.invoice_id,
        p.amount,
        p.status,
        p.transaction_id,
        p.created_at,
        p.processed_at,
        COALESCE(pt.full_name, TRIM(CONCAT(COALESCE(pt.first_name, ''), ' ', COALESCE(pt.last_name, ''))), 'Unknown Patient') AS patient_name
      FROM payments p
      LEFT JOIN invoices i ON i.id = p.invoice_id
      LEFT JOIN patients pt ON pt.id = i.patient_id
      WHERE p.tenant_id = ${tenantId}
        AND LOWER(p.method) = ${normalizedMethod}
      ORDER BY p.created_at DESC
      LIMIT 8
    `;

    return NextResponse.json({
      method: summary.method,
      totalCount: Number(summary.total_count || 0),
      completedCount: Number(summary.completed_count || 0),
      pendingCount: Number(summary.pending_count || 0),
      failedCount: Number(summary.failed_count || 0),
      refundedCount: Number(summary.refunded_count || 0),
      totalAmount: Number(summary.total_amount || 0),
      averageAmount: Number(summary.average_amount || 0),
      totalFees: Number(summary.total_fees || 0),
      refundTotal: Number(summary.refund_total || 0),
      recentPayments: (recentRows as any[]).map((row) => ({
        id: row.id,
        invoiceId: row.invoice_id,
        patientName: row.patient_name,
        amount: Number(row.amount || 0),
        status: row.status,
        transactionId: row.transaction_id || null,
        createdAt: row.created_at,
        processedAt: row.processed_at || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching payment method detail:", error);
    return NextResponse.json({ error: "Failed to fetch payment method detail" }, { status: 500 });
  }
}
