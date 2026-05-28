import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, systemAlerts, systemMetrics } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import { getTenantSystemSettings } from "@/lib/tenant-system-settings";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.max(1, Math.min(90, Number(searchParams.get("days") || "30")));
    const format = searchParams.get("format") || "json";
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [metrics, alerts, settings, auditSummary] = await Promise.all([
      db.select().from(systemMetrics).where(and(eq(systemMetrics.tenantId, access.tenant.id), gte(systemMetrics.timestamp, cutoff))).orderBy(desc(systemMetrics.timestamp)).limit(1000),
      db.select().from(systemAlerts).where(and(eq(systemAlerts.tenantId, access.tenant.id), gte(systemAlerts.createdAt, cutoff))).orderBy(desc(systemAlerts.createdAt)).limit(200),
      getTenantSystemSettings(access.tenant.id),
      db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(and(eq(auditLogs.tenantId, access.tenant.id), gte(auditLogs.createdAt, cutoff))),
    ]);

    const payload = {
      tenant: { id: access.tenant.id, slug: access.tenant.slug, name: access.tenant.name },
      generatedAt: new Date().toISOString(),
      period: { days, start: cutoff.toISOString(), end: new Date().toISOString() },
      settings,
      overview: {
        metrics: metrics.length,
        alerts: alerts.length,
        unresolvedAlerts: alerts.filter((item) => !item.isResolved).length,
        auditEvents: Number(auditSummary[0]?.count || 0),
      },
      metrics,
      alerts,
    };

    if (format === "csv") {
      let csv = "metric,timestamp,value\n";
      metrics.forEach((item) => {
        csv += `cpu,${item.timestamp},${item.cpuUsage || 0}\n`;
        csv += `memory,${item.timestamp},${item.memoryUsage || 0}\n`;
        csv += `disk,${item.timestamp},${item.diskUsage || 0}\n`;
      });
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=\"${slug}-system-report.csv\"`,
        },
      });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error exporting system report:", error);
    return NextResponse.json({ error: "Failed to export system report" }, { status: 500 });
  }
}
