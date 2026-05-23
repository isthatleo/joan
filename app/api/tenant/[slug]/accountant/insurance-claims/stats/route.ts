import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";

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

    const result = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_claims,
        COUNT(*) FILTER (WHERE status IN ('approved', 'paid'))::int AS approved_claims,
        COUNT(*) FILTER (WHERE status = 'denied')::int AS denied_claims,
        COUNT(*) FILTER (WHERE status IN ('submitted', 'under_review', 'appealed'))::int AS pending_claims,
        COALESCE(SUM(claim_amount::numeric), 0) AS total_claimed,
        COALESCE(SUM(approved_amount::numeric), 0) AS total_approved,
        COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(processed_at, submitted_at) - submitted_at)) / 86400), 0) AS avg_processing_days
      FROM claims
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `);

    const row: any = result.rows[0] || {};
    const totalClaims = Number(row.total_claims || 0);
    const approvedClaims = Number(row.approved_claims || 0);

    return NextResponse.json({
      totalClaims,
      approvedClaims,
      deniedClaims: Number(row.denied_claims || 0),
      pendingClaims: Number(row.pending_claims || 0),
      totalClaimed: Number(row.total_claimed || 0),
      totalApproved: Number(row.total_approved || 0),
      averageApprovalRate: totalClaims > 0 ? Math.round((approvedClaims / totalClaims) * 100) : 0,
      averageProcessingTime: Math.round(Number(row.avg_processing_days || 0)),
    });
  } catch (error) {
    console.error("Failed to fetch claim stats:", error);
    return NextResponse.json({ error: "Failed to fetch claim stats" }, { status: 500 });
  }
}
