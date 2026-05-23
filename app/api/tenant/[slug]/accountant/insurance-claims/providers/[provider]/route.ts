import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";

function normalizeProvider(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; provider: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, provider } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const normalizedProvider = normalizeProvider(decodeURIComponent(provider));

    const summaryRows = await db.$queryRaw`
      SELECT
        ip.provider AS provider_name,
        COUNT(c.id)::int AS total_claims,
        COUNT(c.id) FILTER (WHERE c.status IN ('approved', 'paid'))::int AS approved_claims,
        COUNT(c.id) FILTER (WHERE c.status = 'denied')::int AS denied_claims,
        COUNT(c.id) FILTER (WHERE c.status IN ('submitted', 'under_review', 'appealed'))::int AS pending_claims,
        COALESCE(SUM(c.claim_amount::numeric), 0) AS total_claimed,
        COALESCE(SUM(c.approved_amount::numeric), 0) AS total_approved,
        COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(c.processed_at, c.submitted_at) - c.submitted_at)) / 86400), 0) AS average_processing_days
      FROM claims c
      INNER JOIN insurance_policies ip ON c.policy_id = ip.id
      WHERE c.tenant_id = ${tenantId}
        AND c.deleted_at IS NULL
        AND LOWER(REPLACE(ip.provider, ' ', '-')) = ${normalizedProvider}
      GROUP BY ip.provider
      LIMIT 1
    `;

    const summary = (summaryRows as any[])[0];
    if (!summary) {
      return NextResponse.json({ error: "Insurance provider not found" }, { status: 404 });
    }

    const recentRows = await db.$queryRaw`
      SELECT
        c.id,
        c.invoice_id,
        c.claim_amount,
        c.approved_amount,
        c.status,
        c.submitted_at,
        c.processed_at,
        c.denial_reason,
        ip.policy_number,
        COALESCE(p.full_name, TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), 'Unknown Patient') AS patient_name
      FROM claims c
      INNER JOIN insurance_policies ip ON c.policy_id = ip.id
      LEFT JOIN invoices i ON i.id = c.invoice_id
      LEFT JOIN patients p ON COALESCE(i.patient_id, ip.patient_id) = p.id
      WHERE c.tenant_id = ${tenantId}
        AND c.deleted_at IS NULL
        AND LOWER(REPLACE(ip.provider, ' ', '-')) = ${normalizedProvider}
      ORDER BY COALESCE(c.submitted_at, c.created_at) DESC
      LIMIT 8
    `;

    return NextResponse.json({
      provider: summary.provider_name,
      totalClaims: Number(summary.total_claims || 0),
      approvedClaims: Number(summary.approved_claims || 0),
      deniedClaims: Number(summary.denied_claims || 0),
      pendingClaims: Number(summary.pending_claims || 0),
      totalClaimed: Number(summary.total_claimed || 0),
      totalApproved: Number(summary.total_approved || 0),
      averageProcessingDays: Math.round(Number(summary.average_processing_days || 0)),
      recentClaims: (recentRows as any[]).map((row) => ({
        id: row.id,
        invoiceId: row.invoice_id,
        policyNumber: row.policy_number,
        patientName: row.patient_name,
        claimAmount: Number(row.claim_amount || 0),
        approvedAmount: row.approved_amount != null ? Number(row.approved_amount) : null,
        status: row.status,
        submittedAt: row.submitted_at,
        processedAt: row.processed_at || null,
        denialReason: row.denial_reason || null,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch insurance provider detail:", error);
    return NextResponse.json({ error: "Failed to fetch insurance provider detail" }, { status: 500 });
  }
}
