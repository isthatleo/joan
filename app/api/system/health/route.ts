import { NextRequest, NextResponse } from "next/server";
import os from "os";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-billing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function rowsOf<T = any>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  return ((result as any)?.rows || []) as T[];
}

function num(value: unknown) {
  return Number(value || 0);
}

function bytesToMb(value: number) {
  return Math.round(value / 1024 / 1024);
}

function serviceStatus(score: number) {
  if (score >= 85) return "operational";
  if (score >= 60) return "degraded";
  return "critical";
}

function scoreFrom(value: number, warning: number, critical: number) {
  if (value <= warning) return 100;
  if (value >= critical) return 35;
  return Math.round(100 - ((value - warning) / Math.max(critical - warning, 1)) * 65);
}

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request);
  if (!guard.ok) return guard.response;

  const startedAt = Date.now();

  try {
    const dbStartedAt = Date.now();
    await db.execute(sql`SELECT 1`);
    const databaseLatency = Date.now() - dbStartedAt;

    const [
      summaryResult,
      tenantMetricsResult,
      alertsResult,
      integrationsResult,
      activityResult,
      databaseResult,
    ] = await Promise.all([
      db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM tenants WHERE deleted_at IS NULL) AS total_tenants,
          (SELECT COUNT(*) FROM tenants WHERE deleted_at IS NULL AND is_active = true) AS active_tenants,
          (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND is_active = true) AS active_users,
          (SELECT COUNT(*) FROM user_sessions WHERE deleted_at IS NULL AND is_active = true AND expires_at > now()) AS active_sessions,
          (SELECT COUNT(*) FROM activity_logs WHERE deleted_at IS NULL AND timestamp >= now() - interval '24 hours') AS events_24h,
          (SELECT COUNT(*) FROM activity_logs WHERE deleted_at IS NULL AND timestamp >= now() - interval '24 hours' AND lower(coalesce(status, 'success')) <> 'success') AS failed_events_24h,
          (SELECT COUNT(*) FROM security_events WHERE deleted_at IS NULL AND coalesce(is_resolved, false) = false) AS open_security_events,
          (SELECT COUNT(*) FROM system_alerts WHERE deleted_at IS NULL AND coalesce(is_resolved, false) = false) AS open_alerts
      `),
      db.execute(sql`
        SELECT
          sm.id,
          sm.tenant_id,
          t.name AS tenant_name,
          t.slug AS tenant_slug,
          sm.cpu_usage,
          sm.memory_usage,
          sm.disk_usage,
          sm.network_io,
          sm.database_size,
          sm.active_users,
          sm.api_response_time,
          sm.uptime,
          sm.timestamp
        FROM system_metrics sm
        INNER JOIN (
          SELECT tenant_id, MAX(timestamp) AS latest_timestamp
          FROM system_metrics
          WHERE deleted_at IS NULL
          GROUP BY tenant_id
        ) latest ON latest.tenant_id = sm.tenant_id AND latest.latest_timestamp = sm.timestamp
        LEFT JOIN tenants t ON t.id = sm.tenant_id
        WHERE sm.deleted_at IS NULL
        ORDER BY sm.timestamp DESC
        LIMIT 50
      `),
      db.execute(sql`
        SELECT
          sa.id,
          sa.title,
          sa.message,
          sa.severity,
          sa.type,
          sa.created_at,
          t.name AS tenant_name,
          t.slug AS tenant_slug
        FROM system_alerts sa
        LEFT JOIN tenants t ON t.id = sa.tenant_id
        WHERE sa.deleted_at IS NULL
          AND coalesce(sa.is_resolved, false) = false
        ORDER BY
          CASE lower(coalesce(sa.severity, 'info'))
            WHEN 'critical' THEN 1
            WHEN 'warning' THEN 2
            ELSE 3
          END,
          sa.created_at DESC
        LIMIT 20
      `),
      db.execute(sql`
        SELECT
          provider,
          status,
          COUNT(*) AS count,
          COUNT(*) FILTER (WHERE coalesce(is_active, false) = true) AS active_count,
          COUNT(*) FILTER (WHERE lower(coalesce(status, 'pending')) = 'error') AS error_count
        FROM integrations
        WHERE deleted_at IS NULL
        GROUP BY provider, status
        ORDER BY error_count DESC, count DESC
        LIMIT 20
      `),
      db.execute(sql`
        SELECT
          al.id,
          al.action,
          al.resource,
          al.status,
          al.description,
          al.timestamp,
          t.name AS tenant_name,
          u.full_name AS actor,
          u.email AS actor_email
        FROM activity_logs al
        LEFT JOIN tenants t ON t.id = al.tenant_id
        LEFT JOIN users u ON u.id = al.user_id
        WHERE al.deleted_at IS NULL
        ORDER BY al.timestamp DESC
        LIMIT 15
      `),
      db.execute(sql`
        SELECT
          pg_database_size(current_database()) AS database_bytes,
          (SELECT COUNT(*) FROM pg_stat_activity) AS database_connections
      `),
    ]);

    const summary = rowsOf(summaryResult)[0] || {};
    const tenantMetrics = rowsOf(tenantMetricsResult);
    const databaseStats = rowsOf(databaseResult)[0] || {};
    const memory = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = Math.round(((totalMemory - freeMemory) / Math.max(totalMemory, 1)) * 100);
    const cpuCount = os.cpus().length || 1;
    const cpuUsage = Math.round(Math.min(100, Math.max(0, (os.loadavg()[0] / cpuCount) * 100)));
    const avgTenantCpu = tenantMetrics.length
      ? Math.round(tenantMetrics.reduce((sum: number, row: any) => sum + num(row.cpu_usage), 0) / tenantMetrics.length)
      : cpuUsage;
    const avgTenantMemory = tenantMetrics.length
      ? Math.round(tenantMetrics.reduce((sum: number, row: any) => sum + num(row.memory_usage), 0) / tenantMetrics.length)
      : memoryUsage;
    const avgTenantDisk = tenantMetrics.length
      ? Math.round(tenantMetrics.reduce((sum: number, row: any) => sum + num(row.disk_usage), 0) / tenantMetrics.length)
      : 0;
    const avgApiLatency = tenantMetrics.length
      ? Math.round(tenantMetrics.reduce((sum: number, row: any) => sum + num(row.api_response_time), 0) / tenantMetrics.length)
      : Date.now() - startedAt;
    const events24h = num(summary.events_24h);
    const failedEvents24h = num(summary.failed_events_24h);
    const failureRate = events24h ? Number(((failedEvents24h / events24h) * 100).toFixed(2)) : 0;

    const databaseScore = scoreFrom(databaseLatency, 120, 800);
    const apiScore = scoreFrom(avgApiLatency, 250, 1500);
    const memoryScore = scoreFrom(memoryUsage, 70, 92);
    const cpuScore = scoreFrom(cpuUsage, 65, 90);
    const eventScore = scoreFrom(failureRate, 2, 10);
    const alertScore = scoreFrom(num(summary.open_alerts), 3, 20);
    const overallScore = Math.round((databaseScore + apiScore + memoryScore + cpuScore + eventScore + alertScore) / 6);
    const status = serviceStatus(overallScore);

    const services = [
      {
        key: "database",
        name: "Neon PostgreSQL",
        status: serviceStatus(databaseScore),
        score: databaseScore,
        latency: databaseLatency,
        details: `${num(databaseStats.database_connections)} active DB connections`,
      },
      {
        key: "api",
        name: "API Gateway",
        status: serviceStatus(apiScore),
        score: apiScore,
        latency: avgApiLatency,
        details: `${events24h.toLocaleString()} events in the last 24 hours`,
      },
      {
        key: "runtime",
        name: "Next.js Runtime",
        status: serviceStatus(Math.round((cpuScore + memoryScore) / 2)),
        score: Math.round((cpuScore + memoryScore) / 2),
        latency: Date.now() - startedAt,
        details: `Node ${process.version}, ${cpuCount} CPU cores`,
      },
      {
        key: "integrations",
        name: "Tenant Integrations",
        status: rowsOf(integrationsResult).some((row: any) => num(row.error_count) > 0) ? "degraded" : "operational",
        score: rowsOf(integrationsResult).some((row: any) => num(row.error_count) > 0) ? 72 : 96,
        latency: 0,
        details: `${rowsOf(integrationsResult).reduce((sum: number, row: any) => sum + num(row.active_count), 0)} active integrations`,
      },
    ];

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        status,
        score: overallScore,
        version: process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version || "1.0.0",
        uptime: {
          processSeconds: Math.round(process.uptime()),
          systemSeconds: Math.round(os.uptime()),
          label: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
        },
        resources: {
          cpuUsage,
          avgTenantCpu,
          memoryUsage,
          avgTenantMemory,
          avgTenantDisk,
          totalMemoryMb: bytesToMb(totalMemory),
          freeMemoryMb: bytesToMb(freeMemory),
          processMemoryMb: {
            rss: bytesToMb(memory.rss),
            heapTotal: bytesToMb(memory.heapTotal),
            heapUsed: bytesToMb(memory.heapUsed),
            external: bytesToMb(memory.external),
          },
          databaseSizeMb: bytesToMb(num(databaseStats.database_bytes)),
          databaseConnections: num(databaseStats.database_connections),
          apiLatency: avgApiLatency,
          failureRate,
        },
        platform: {
          totalTenants: num(summary.total_tenants),
          activeTenants: num(summary.active_tenants),
          activeUsers: num(summary.active_users),
          activeSessions: num(summary.active_sessions),
          events24h,
          failedEvents24h,
          openSecurityEvents: num(summary.open_security_events),
          openAlerts: num(summary.open_alerts),
        },
        services,
        tenantMetrics: tenantMetrics.map((row: any) => ({
          id: row.id,
          tenantId: row.tenant_id,
          tenantName: row.tenant_name || "Unknown tenant",
          tenantSlug: row.tenant_slug || null,
          cpuUsage: num(row.cpu_usage),
          memoryUsage: num(row.memory_usage),
          diskUsage: num(row.disk_usage),
          networkIo: num(row.network_io),
          databaseSize: row.database_size || "N/A",
          activeUsers: num(row.active_users),
          apiResponseTime: num(row.api_response_time),
          uptime: row.uptime || "N/A",
          timestamp: row.timestamp,
        })),
        alerts: rowsOf(alertsResult),
        integrations: rowsOf(integrationsResult),
        recentActivity: rowsOf(activityResult),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[system/health] failed:", error);
    return NextResponse.json({ error: "Failed to fetch system health" }, { status: 500 });
  }
}
