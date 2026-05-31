import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-billing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function rowsOf<T = any>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  return ((result as any)?.rows || []) as T[];
}

function includes(value: unknown, needle: string) {
  return String(value || "").toLowerCase().includes(needle);
}

function toNumber(value: unknown) {
  return Number(value || 0);
}

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const source = searchParams.get("source") || "all";
    const status = searchParams.get("status") || "all";
    const tenant = searchParams.get("tenant") || "all";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 1000), 1), 2500);

    const [logsResult, tenantResult] = await Promise.all([
      db.execute(sql`
        WITH unified_logs AS (
          SELECT
            a.id::text AS id,
            'audit_logs' AS source,
            a.created_at AS occurred_at,
            a.tenant_id::text AS tenant_id,
            t.name AS tenant_name,
            t.slug AS tenant_slug,
            a.user_id::text AS user_id,
            COALESCE(u.full_name, u.email, 'System') AS actor,
            COALESCE(u.email, '') AS actor_email,
            COALESCE(u.role, 'system') AS actor_role,
            COALESCE(a.action, 'audit_event') AS action,
            COALESCE(a.entity, 'System') AS resource,
            a.entity_id::text AS resource_id,
            'success' AS status,
            NULL::text AS ip_address,
            NULL::text AS user_agent,
            a.metadata AS metadata
          FROM audit_logs a
          LEFT JOIN tenants t ON t.id = a.tenant_id
          LEFT JOIN users u ON u.id = a.user_id
          UNION ALL
          SELECT
            al.id::text AS id,
            'activity_logs' AS source,
            al.timestamp AS occurred_at,
            al.tenant_id::text AS tenant_id,
            t.name AS tenant_name,
            t.slug AS tenant_slug,
            al.user_id::text AS user_id,
            COALESCE(u.full_name, u.email, 'System') AS actor,
            COALESCE(u.email, '') AS actor_email,
            COALESCE(u.role, 'system') AS actor_role,
            al.action AS action,
            COALESCE(al.resource, 'System') AS resource,
            al.resource_id::text AS resource_id,
            COALESCE(al.status, 'success') AS status,
            al.ip_address AS ip_address,
            al.user_agent AS user_agent,
            jsonb_strip_nulls(
              jsonb_build_object(
                'description', al.description,
                'errorMessage', al.error_message,
                'browser', al.browser,
                'os', al.os,
                'deviceType', al.device_type,
                'previousData', al.previous_data,
                'newData', al.new_data,
                'metadata', al.metadata
              )
            ) AS metadata
          FROM activity_logs al
          LEFT JOIN tenants t ON t.id = al.tenant_id
          LEFT JOIN users u ON u.id = al.user_id
          WHERE al.deleted_at IS NULL
        )
        SELECT *
        FROM unified_logs
        ORDER BY occurred_at DESC NULLS LAST
        LIMIT ${limit}
      `),
      db.execute(sql`
        SELECT id::text, name, slug
        FROM tenants
        WHERE deleted_at IS NULL
        ORDER BY name ASC
      `),
    ]);

    let logs = rowsOf(logsResult).map((log: any) => ({
      id: `${log.source}-${log.id}`,
      rawId: log.id,
      source: log.source,
      timestamp: log.occurred_at ? new Date(log.occurred_at).toISOString() : new Date().toISOString(),
      tenantId: log.tenant_id,
      tenantName: log.tenant_name || "Platform",
      tenantSlug: log.tenant_slug || null,
      userId: log.user_id,
      actor: log.actor || "System",
      actorEmail: log.actor_email || "",
      actorRole: log.actor_role || "system",
      action: log.action || "event",
      resource: log.resource || "System",
      resourceId: log.resource_id || null,
      status: String(log.status || "success").toLowerCase(),
      ipAddress: log.ip_address || "N/A",
      userAgent: log.user_agent || "N/A",
      metadata: log.metadata || {},
    }));

    if (source !== "all") {
      logs = logs.filter((log) => log.source === source);
    }
    if (status !== "all") {
      logs = logs.filter((log) => log.status === status);
    }
    if (tenant !== "all") {
      logs = logs.filter((log) => log.tenantId === tenant || log.tenantSlug === tenant);
    }
    if (search) {
      logs = logs.filter((log) =>
        [
          log.actor,
          log.actorEmail,
          log.actorRole,
          log.action,
          log.resource,
          log.resourceId,
          log.tenantName,
          log.tenantSlug,
          log.ipAddress,
          JSON.stringify(log.metadata),
        ].some((value) => includes(value, search))
      );
    }

    const stats = {
      totalEvents: logs.length,
      platformEvents: logs.filter((log) => !log.tenantId).length,
      tenantEvents: logs.filter((log) => Boolean(log.tenantId)).length,
      auditLogEvents: logs.filter((log) => log.source === "audit_logs").length,
      activityLogEvents: logs.filter((log) => log.source === "activity_logs").length,
      failedEvents: logs.filter((log) => log.status !== "success").length,
      uniqueActors: new Set(logs.map((log) => log.userId || log.actorEmail || log.actor)).size,
      uniqueTenants: new Set(logs.filter((log) => log.tenantId).map((log) => log.tenantId)).size,
    };

    const actionBreakdown = Object.values(
      logs.reduce<Record<string, { action: string; count: number }>>((acc, log) => {
        const key = log.action || "event";
        acc[key] = acc[key] || { action: key, count: 0 };
        acc[key].count += 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    const tenantBreakdown = Object.values(
      logs.reduce<Record<string, { tenantName: string; tenantSlug: string | null; count: number; failed: number }>>((acc, log) => {
        const key = log.tenantId || "platform";
        acc[key] = acc[key] || { tenantName: log.tenantName || "Platform", tenantSlug: log.tenantSlug, count: 0, failed: 0 };
        acc[key].count += 1;
        if (log.status !== "success") acc[key].failed += 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        stats,
        logs,
        filters: {
          tenants: rowsOf(tenantResult),
          sources: ["audit_logs", "activity_logs"],
          statuses: Array.from(new Set(logs.map((log) => log.status))).sort(),
        },
        actionBreakdown,
        tenantBreakdown,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[super-admin/audit-logs] failed:", error);
    return NextResponse.json({ error: "Failed to load global audit logs" }, { status: 500 });
  }
}
