import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, tenants, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AuditCategory = "authentication" | "data" | "system" | "security" | "compliance";
type AuditStatus = "success" | "warning" | "error";

function resolveDateFloor(dateRange: string) {
  const now = Date.now();
  switch (dateRange) {
    case "1d":
      return new Date(now - 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now - 90 * 24 * 60 * 60 * 1000);
    case "7d":
    default:
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
  }
}

function classifyCategory(action: string, entity: string | null, metadata: Record<string, unknown>) {
  const text = `${action} ${entity || ""} ${JSON.stringify(metadata || {})}`.toLowerCase();
  if (text.includes("login") || text.includes("logout") || text.includes("auth") || text.includes("session")) {
    return "authentication" satisfies AuditCategory;
  }
  if (text.includes("security") || text.includes("permission") || text.includes("role") || text.includes("call")) {
    return "security" satisfies AuditCategory;
  }
  if (text.includes("compliance") || text.includes("audit") || text.includes("consent")) {
    return "compliance" satisfies AuditCategory;
  }
  if (text.includes("setting") || text.includes("system") || text.includes("tenant") || text.includes("broadcast")) {
    return "system" satisfies AuditCategory;
  }
  return "data" satisfies AuditCategory;
}

function classifyStatus(action: string, metadata: Record<string, unknown>) {
  const text = `${action} ${JSON.stringify(metadata || {})}`.toLowerCase();
  if (text.includes("error") || text.includes("failed") || text.includes("reject")) {
    return "error" satisfies AuditStatus;
  }
  if (text.includes("warning") || text.includes("delete") || text.includes("remove") || text.includes("missed")) {
    return "warning" satisfies AuditStatus;
  }
  return "success" satisfies AuditStatus;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
      columns: { id: true, slug: true, name: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tenantUser = await db.query.users.findFirst({
      where: and(eq(users.tenantId, tenant.id), ilike(users.email, session.user.email), isNull(users.deletedAt)),
      columns: { id: true, role: true },
    });

    if (!tenantUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "all";
    const status = searchParams.get("status") || "all";
    const dateRange = searchParams.get("dateRange") || "7d";

    const since = resolveDateFloor(dateRange);
    const tenantUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.tenantId, tenant.id), isNull(users.deletedAt)));

    const actorMap = new Map(tenantUsers.map((entry) => [entry.id, entry]));

    const whereClauses = [eq(auditLogs.tenantId, tenant.id), gte(auditLogs.createdAt, since)];

    const records = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(...whereClauses))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1000);

    const logs = records
      .map((record) => {
        const metadata = (record.metadata && typeof record.metadata === "object" ? record.metadata : {}) as Record<string, unknown>;
        const actor = record.userId ? actorMap.get(record.userId) : null;
        const categoryValue = classifyCategory(record.action || "", record.entity || null, metadata);
        const statusValue = classifyStatus(record.action || "", metadata);

        return {
          id: record.id,
          timestamp: record.createdAt,
          user: {
            id: actor?.id || record.userId || "system",
            name: actor?.fullName || actor?.email || "System",
            role: actor?.role || "system",
            email: actor?.email || "system@platform.local",
          },
          action: record.action || "Unknown action",
          resource: record.entity || "system",
          resourceId: record.entityId || undefined,
          details:
            typeof metadata.message === "string"
              ? metadata.message
              : typeof metadata.description === "string"
                ? metadata.description
                : `${record.action || "Activity"} recorded on ${record.entity || "system"}.`,
          ipAddress: typeof metadata.ipAddress === "string" ? metadata.ipAddress : "Internal",
          userAgent: typeof metadata.userAgent === "string" ? metadata.userAgent : "System event",
          status: statusValue,
          category: categoryValue,
          oldValue: metadata.oldValue,
          newValue: metadata.newValue,
        };
      })
      .filter((record) => (category === "all" ? true : record.category === category))
      .filter((record) => (status === "all" ? true : record.status === status));

    return NextResponse.json(logs, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[tenant compliance audit GET]", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
