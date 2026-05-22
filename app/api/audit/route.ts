import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { z } from "zod";
import { currentUser } from "@clerk/nextjs/server";

const auditSchema = z.object({
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = auditSchema.parse(body);
    const user = await currentUser();

    await db.insert(auditLogs).values({
      tenantId: data.tenantId || null,
      userId: data.userId || user?.id || null,
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
