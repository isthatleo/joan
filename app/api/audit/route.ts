import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { z } from "zod";
import { requireAppUser } from "@/lib/api/route-guards";

const auditSchema = z.object({
  action: z.string(),
  entity: z.string(),
  entityId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireAppUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const data = auditSchema.parse(body);

    // Always attribute to the authenticated caller and their own tenant —
    // never a client-supplied tenantId/userId.
    await db.insert(auditLogs).values({
      tenantId: access.user.tenantId || null,
      userId: access.user.id,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId || null,
      metadata: data.metadata || {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[audit] failed:", error);
    return NextResponse.json({ error: "Failed to log audit event" }, { status: 500 });
  }
}
