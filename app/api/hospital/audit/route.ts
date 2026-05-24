import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, tenants, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getLogType(action: string) {
  const normalized = String(action || "").toLowerCase();
  if (normalized.includes("delete") || normalized.includes("remove") || normalized.includes("missed")) {
    return "warning" as const;
  }
  if (normalized.includes("error") || normalized.includes("fail") || normalized.includes("reject")) {
    return "error" as const;
  }
  return "info" as const;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedTenantId = searchParams.get("tenantId");
    const role = searchParams.get("role") || "hospital_admin";
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await db.query.users.findFirst({
      where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
      columns: { id: true, tenantId: true, role: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let effectiveTenantId: string | null | undefined = requestedTenantId || currentUser.tenantId;
    if (role === "super_admin") {
      effectiveTenantId = requestedTenantId || undefined;
    } else if (!effectiveTenantId) {
      return NextResponse.json({ error: "tenantId is required for hospital_admin" }, { status: 400 });
    }

    const whereClauses = effectiveTenantId ? [eq(auditLogs.tenantId, effectiveTenantId)] : [];

    const logs = await db
      .select({
        id: auditLogs.id,
        tenantId: auditLogs.tenantId,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        userId: users.id,
        userFullName: users.fullName,
        userEmail: users.email,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .leftJoin(tenants, eq(auditLogs.tenantId, tenants.id))
      .where(whereClauses.length > 0 ? and(...whereClauses) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ value: count() })
      .from(auditLogs)
      .where(whereClauses.length > 0 ? and(...whereClauses) : undefined);

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      tenantId: log.tenantId,
      tenantName: log.tenantName || "System",
      tenantSlug: log.tenantSlug || undefined,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      actor: log.userEmail || log.userFullName || "System",
      userId: log.userId || undefined,
      timestamp: log.createdAt,
      metadata: log.metadata,
      type: getLogType(log.action || ""),
    }));

    return NextResponse.json({
      logs: formattedLogs,
      total: totalResult[0]?.value ?? formattedLogs.length,
    });
  } catch (error) {
    console.error("[hospital audit GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
