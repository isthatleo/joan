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
        ip.provider AS name,
        LOWER(REPLACE(ip.provider, ' ', '-')) AS id,
        COUNT(c.id)::int AS claims_count,
        COALESCE(
          ROUND(
            100.0 * COUNT(c.id) FILTER (WHERE c.status IN ('approved', 'paid')) / NULLIF(COUNT(c.id), 0)
          ),
          0
        )::int AS approval_rate,
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (COALESCE(c.processed_at, c.submitted_at) - c.submitted_at)) / 86400),
          0
        )::int AS average_processing_days
      FROM claims c
      INNER JOIN insurance_policies ip ON c.policy_id = ip.id
      WHERE c.tenant_id = ${tenantId}
        AND c.deleted_at IS NULL
      GROUP BY ip.provider
      ORDER BY claims_count DESC, ip.provider ASC
    `);

    return NextResponse.json(
      result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        claimsCount: Number(row.claims_count || 0),
        approvalRate: Number(row.approval_rate || 0),
        averageProcessingDays: Number(row.average_processing_days || 0),
      }))
    );
  } catch (error) {
    console.error("Failed to fetch claim providers:", error);
    return NextResponse.json({ error: "Failed to fetch claim providers" }, { status: 500 });
  }
}
