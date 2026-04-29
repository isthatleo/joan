import { NextRequest, NextResponse } from "next/server";
import { AuditService } from "@/lib/services/audit.service";
import { verifyAuth } from "@/lib/api/auth-middleware";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const service = new AuditService();

const logActionSchema = z.object({
  userId: z.string().optional(),
  action: z.string().min(1),
  entity: z.string().min(1),
  entityId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const entity = searchParams.get("entity") || undefined;
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

    // Get the authenticated user to scope results by their tenant
    const auth = await verifyAuth(request);
    let userTenantId: string | undefined;

    if (auth.authenticated && auth.user?.sub) {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.id, auth.user.sub as string),
        });
        userTenantId = user?.tenantId?.toString();
      } catch {
        userTenantId = undefined;
      }
    }

    // Get single audit log
    if (id) {
      const log = await service.getAuditLog(id);
      if (!log) {
        return NextResponse.json({ error: "Audit log not found" }, { status: 404 });
      }
      return NextResponse.json(log);
    }

    // Get stats
    if (searchParams.get("stats") === "true") {
      if (userId) {
        const stats = await service.getUserActivityStats(userId);
        return NextResponse.json(stats);
      }
      const stats = await service.getActionStats();
      return NextResponse.json(stats);
    }

    // Get all audit logs - attempt to scope by current user's tenant
    // Note: auditLogs table doesn't have tenantId, so we don't filter here
    // Future: Add tenantId to auditLogs schema for proper scoping
    const logs = await service.getAuditLogs({
      userId,
      action,
      entity,
      startDate,
      endDate,
      limit,
      offset,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const validatedData = logActionSchema.parse(data);
    const log = await service.logAction(validatedData);
    return NextResponse.json(log[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    console.error("Error logging action:", error);
    return NextResponse.json({ error: "Failed to log action" }, { status: 500 });
  }
}

