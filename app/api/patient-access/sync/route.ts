import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { syncDeferredPatientPortalAccesses } from "@/lib/receptionist/access";

export const dynamic = "force-dynamic";

/**
 * Provisions deferred patient portal credentials once under-aged patients reach
 * the tenant-configured legal adult age. Trigger daily from production cron.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.PATIENT_ACCESS_SYNC_SECRET;
  if (secret && request.headers.get("x-patient-access-sync-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeTenants = await db.query.tenants.findMany({
    where: and(eq(tenants.isActive, true), isNull(tenants.deletedAt)),
    columns: { id: true, slug: true },
  });

  const results: Array<{ tenantId: string; slug: string; provisioned: number; error?: string }> = [];
  for (const tenant of activeTenants) {
    try {
      const result = await syncDeferredPatientPortalAccesses(tenant.id);
      results.push({ tenantId: tenant.id, slug: tenant.slug, provisioned: result.provisioned });
    } catch (error: any) {
      results.push({ tenantId: tenant.id, slug: tenant.slug, provisioned: 0, error: error?.message || "unknown" });
    }
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    tenants: activeTenants.length,
    provisioned: results.reduce((sum, result) => sum + result.provisioned, 0),
    results,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
