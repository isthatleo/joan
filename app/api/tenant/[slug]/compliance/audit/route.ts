import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function resolveDateFloor(dateRange: string) {
  const now = Date.now();
  if (dateRange === "1d") return new Date(now - 86400000);
  if (dateRange === "30d") return new Date(now - 30 * 86400000);
  if (dateRange === "90d") return new Date(now - 90 * 86400000);
  if (dateRange === "1y") return new Date(now - 365 * 86400000);
  return new Date(now - 7 * 86400000);
}

function categoryFor(action: string, entity?: string | null, metadata?: Record<string, unknown>) {
  const text = `${action} ${entity || ""} ${JSON.stringify(metadata || {})}`.toLowerCase();
  if (text.includes("login") || text.includes("logout") || text.includes("auth") || text.includes("session")) return "authentication";
  if (text.includes("role") || text.includes("permission") || text.includes("security") || text.includes("password")) return "security";
  if (text.includes("audit") || text.includes("compliance") || text.includes("consent")) return "compliance";
  if (text.includes("setting") || text.includes("tenant") || text.includes("department") || text.includes("broadcast")) return "system";
  return "data";
}

function statusFor(action: string, metadata?: Record<string, unknown>) {
  const text = `${action} ${JSON.stringify(metadata || {})}`.toLowerCase();
  if (text.includes("failed") || text.includes("error") || text.includes("reject")) return "error";
  if (text.includes("delete") || text.includes("deactivate") || text.includes("void") || text.includes("cancel")) return "warning";
  return "success";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "all";
    const status = searchParams.get("status") || "all";
    const dateRange = searchParams.get("dateRange") || "7d";
    const limit = Math.min(Number(searchParams.get("limit") || 1000), 5000);
    const since = resolveDateFloor(dateRange);

    const [tenantUsers, records] = await Promise.all([
      db.select({ id: users.id, fullName: users.fullName, email: users.email, role: users.role, avatar: users.avatar }).from(users).where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt))),
      db
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
        .where(and(eq(auditLogs.tenantId, tenantId), gte(auditLogs.createdAt, since)))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit),
    ]);

    const actorMap = new Map(tenantUsers.map((user) => [user.id, user]));
    const logs = records.map((record) => {
      const metadata = (record.metadata && typeof record.metadata === "object" ? record.metadata : {}) as Record<string, unknown>;
      const actor = record.userId ? actorMap.get(record.userId) : null;
      const categoryValue = categoryFor(record.action || "", record.entity, metadata);
      const statusValue = statusFor(record.action || "", metadata);
      return {
        id: record.id,
        timestamp: record.createdAt ? new Date(record.createdAt).toISOString() : "",
        user: {
          id: actor?.id || record.userId || "system",
          name: actor?.fullName || actor?.email || "System",
          role: actor?.role || "system",
          email: actor?.email || "system@tenant.local",
          avatar: actor?.avatar || "",
        },
        action: record.action || "unknown.action",
        resource: record.entity || "system",
        resourceId: record.entityId || "",
        details: typeof metadata.message === "string" ? metadata.message : typeof metadata.description === "string" ? metadata.description : `${record.action || "Activity"} on ${record.entity || "system"}`,
        ipAddress: typeof metadata.ipAddress === "string" ? metadata.ipAddress : "Internal",
        userAgent: typeof metadata.userAgent === "string" ? metadata.userAgent : "System event",
        status: statusValue,
        category: categoryValue,
        metadata,
        oldValue: metadata.oldValue,
        newValue: metadata.newValue,
      };
    }).filter((log) => category === "all" || log.category === category).filter((log) => status === "all" || log.status === status);

    const byCategory = logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {});
    const byUser = logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.user.name] = (acc[log.user.name] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      logs,
      stats: {
        total: logs.length,
        success: logs.filter((log) => log.status === "success").length,
        warning: logs.filter((log) => log.status === "warning").length,
        error: logs.filter((log) => log.status === "error").length,
        uniqueUsers: new Set(logs.map((log) => log.user.id)).size,
        categories: byCategory,
        topUsers: Object.entries(byUser).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8),
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[tenant compliance audit GET]", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
