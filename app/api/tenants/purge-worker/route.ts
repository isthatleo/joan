import { NextRequest, NextResponse } from "next/server";
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

  const service = new TenantService();
  return NextResponse.json(await service.purgeDueTenants(50));
}

export async function GET(req: NextRequest) {
  // Allow GET so cron services that only support GET can still trigger it.
  return POST(req);
}
