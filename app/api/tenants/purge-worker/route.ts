import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { and, isNotNull, lte, eq } from "drizzle-orm";
import { TenantService } from "@/lib/services/tenant.service";

export const dynamic = "force-dynamic";

/**
 * Hard-purge worker. Deletes any tenant whose `scheduledPurgeAt` has elapsed.
 * Protected by PURGE_WORKER_SECRET (header `x-purge-secret`) when set.
 * Trigger via cron (Vercel cron, GitHub Action, or pg_cron + pg_net).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PURGE_WORKER_SECRET;
  if (secret) {
    const provided = req.headers.get("x-purge-secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const candidates = await db
    .select()
    .from(tenants)
    .where(
      and(
        eq(tenants.provisioningStatus, "archived"),
        isNotNull(tenants.scheduledPurgeAt),
        lte(tenants.scheduledPurgeAt, now),
      ),
    );

  const service = new TenantService();
  const purged: { id: string; slug: string }[] = [];
  const failed: { id: string; slug: string; error: string }[] = [];

  for (const t of candidates) {
    try {
      await service.deleteTenant(t.id);
      purged.push({ id: t.id, slug: t.slug });
    } catch (e: any) {
      failed.push({ id: t.id, slug: t.slug, error: e?.message || "unknown" });
    }
  }

  return NextResponse.json({
    ranAt: now.toISOString(),
    candidates: candidates.length,
    purged,
    failed,
  });
}

export async function GET(req: NextRequest) {
  // Allow GET so cron services that only support GET can still trigger it.
  return POST(req);
}
