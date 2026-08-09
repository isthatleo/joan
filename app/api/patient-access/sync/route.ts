import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { syncDeferredPatientPortalAccesses } from "@/lib/receptionist/access";

export const dynamic = "force-dynamic";

/**
 * Provisions deferred patient portal credentials once under-aged patients reach
 * the tenant-configured legal adult age. Trigger daily from production cron.
 * Requires PATIENT_ACCESS_SYNC_SECRET to be set — fails closed (503) rather than
 * silently running unauthenticated when it hasn't been configured.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.PATIENT_ACCESS_SYNC_SECRET;
  if (!secret) {
    console.error("[patient-access/sync] PATIENT_ACCESS_SYNC_SECRET is not set — refusing to run.");
    return NextResponse.json({ error: "Patient access sync is not configured" }, { status: 503 });
  }
  const provided = request.headers.get("x-patient-access-sync-secret") || "";
  const providedBuf = Buffer.from(provided);
  const secretBuf = Buffer.from(secret);
  const matches = providedBuf.length === secretBuf.length && crypto.timingSafeEqual(providedBuf, secretBuf);
  if (!matches) {
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
