import { NextRequest, NextResponse } from "next/server";
import { AuditService } from "@/lib/services/audit.service";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, userRoles, roles } from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { z } from "zod";

const service = new AuditService();

const logActionSchema = z.object({
  action: z.string().min(1),
  entity: z.string().min(1),
  entityId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

async function resolveCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null as any);
  if (!session?.user?.email) return null;
  const appUser = await db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
  });
  if (!appUser?.id) return null;

  const roleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, appUser.id))
    .catch(() => []);
  const isSuperAdmin = String(appUser.role || "").toLowerCase() === "super_admin" || roleRows.some((r) => r.roleName === "super_admin");

  return { appUser, isSuperAdmin };
}

export async function GET(request: NextRequest) {
  try {
    const current = await resolveCurrentUser(request);
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action") || undefined;
    const entity = searchParams.get("entity") || undefined;
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

    // The audit_logs table has no tenantId column to scope by, so — short of that
    // schema change — only a super admin (who is meant to see platform-wide activity
    // anyway) or a user looking up their own activity may read this endpoint.
    const requestedUserId = searchParams.get("userId") || undefined;
    if (!current.isSuperAdmin && requestedUserId !== current.appUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const userId = current.isSuperAdmin ? requestedUserId : current.appUser.id;

    // Get single audit log
    if (id) {
      const log = await service.getAuditLog(id);
      if (!log) {
        return NextResponse.json({ error: "Audit log not found" }, { status: 404 });
      }
      if (!current.isSuperAdmin && log.userId !== current.appUser.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json(log);
    }

    // Get stats
    if (searchParams.get("stats") === "true") {
      if (userId) {
        const stats = await service.getUserActivityStats(userId);
        return NextResponse.json(stats);
      }
      if (!current.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const stats = await service.getActionStats();
      return NextResponse.json(stats);
    }

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
    const current = await resolveCurrentUser(request);
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await request.json();
    const validatedData = logActionSchema.parse(data);
    // Always attribute the entry to the authenticated caller — never trust a
    // client-supplied userId for who performed the action.
    const log = await service.logAction({ ...validatedData, userId: current.appUser.id });
    return NextResponse.json(log[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error logging action:", error);
    return NextResponse.json({ error: "Failed to log action" }, { status: 500 });
  }
}
