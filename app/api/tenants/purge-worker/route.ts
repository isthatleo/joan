import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { TenantService } from "@/lib/services/tenant.service";

export const dynamic = "force-dynamic";

/**
 * Hard-purge worker. Deletes any tenant whose `scheduledPurgeAt` has elapsed.
 * Requires PURGE_WORKER_SECRET (header `x-purge-secret`) to be set — this endpoint
 * performs an irreversible bulk delete, so it fails closed (503) rather than
 * silently running unauthenticated when the secret hasn't been configured.
 * Trigger via cron (Vercel cron, GitHub Action, or pg_cron + pg_net).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PURGE_WORKER_SECRET;
  if (!secret) {
    console.error("[purge-worker] PURGE_WORKER_SECRET is not set — refusing to run.");
    return NextResponse.json({ error: "Purge worker is not configured" }, { status: 503 });
  }

  const provided = req.headers.get("x-purge-secret") || "";
  const providedBuf = Buffer.from(provided);
  const secretBuf = Buffer.from(secret);
  const matches = providedBuf.length === secretBuf.length && crypto.timingSafeEqual(providedBuf, secretBuf);
  if (!matches) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new TenantService();
  return NextResponse.json(await service.purgeDueTenants(50));
}

export async function GET(req: NextRequest) {
  // Allow GET so cron services that only support GET can still trigger it.
  return POST(req);
}
