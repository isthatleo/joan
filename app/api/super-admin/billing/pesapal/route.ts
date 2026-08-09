import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/platform-billing";
import { getPesapalConfig, savePesapalConfig, toPublicConfig } from "@/lib/billing/pesapal";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const configSchema = z.object({
  consumerKey: z.string().trim().min(1, "Consumer key is required"),
  consumerSecret: z.string().trim().min(1, "Consumer secret is required"),
  environment: z.enum(["sandbox", "production"]),
});

export async function GET(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;

  const config = await getPesapalConfig();
  return NextResponse.json({ pesapal: toPublicConfig(config) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PUT(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Pesapal configuration", details: parsed.error.issues }, { status: 400 });
  }

  const saved = await savePesapalConfig({ ...parsed.data, updatedBy: access.user.id });

  await db.insert(auditLogs).values({
    userId: access.user.id,
    action: "platform.pesapal.configured",
    entity: "platform_settings",
    metadata: { environment: saved.environment, consumerKeyMasked: saved.consumerKey.slice(0, 4) + "…" },
  }).catch(() => null);

  return NextResponse.json({ pesapal: toPublicConfig(saved) });
}
