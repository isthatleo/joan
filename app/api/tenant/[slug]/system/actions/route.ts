import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, systemAlerts, systemMetrics, users } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import { getTenantSystemSettings } from "@/lib/tenant-system-settings";
import { sendTenantRuntimeEmail } from "@/lib/integrations/runtime";

function usageStatus(value: number, threshold: number) {
  if (value >= threshold) return "critical";
  if (value >= threshold * 0.85) return "warning";
  return "healthy";
}

async function webhook(url: string, payload: Record<string, any>) {
  if (!url) return { ok: false, skipped: true, reason: "No webhook configured" };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, status: response.status };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Webhook failed" };
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok || !access.tenant) return tenantAccessResponse(access);
    if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "");
    const settings = await getTenantSystemSettings(access.tenant.id);
    const now = new Date();

    if (action === "run-health-check") {
      const [latestMetric] = await db
        .select()
        .from(systemMetrics)
        .where(eq(systemMetrics.tenantId, access.tenant.id))
        .orderBy(desc(systemMetrics.timestamp))
        .limit(1);
      const [activeUsers] = await db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.tenantId, access.tenant.id), eq(users.isActive, true)));
      const [recentAudit] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(and(eq(auditLogs.tenantId, access.tenant.id), gte(auditLogs.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))));
      const [unresolvedAlerts] = await db.select({ count: sql<number>`count(*)` }).from(systemAlerts).where(and(eq(systemAlerts.tenantId, access.tenant.id), eq(systemAlerts.isResolved, false)));

      const cpu = Number(latestMetric?.cpuUsage || 0);
      const memory = Number(latestMetric?.memoryUsage || 0);
      const disk = Number(latestMetric?.diskUsage || 0);
      const checks = [
        { key: "cpu", label: "CPU usage", value: cpu, threshold: settings.cpuThreshold, status: usageStatus(cpu, settings.cpuThreshold) },
        { key: "memory", label: "Memory usage", value: memory, threshold: settings.memoryThreshold, status: usageStatus(memory, settings.memoryThreshold) },
        { key: "disk", label: "Disk usage", value: disk, threshold: settings.diskThreshold, status: usageStatus(disk, settings.diskThreshold) },
        { key: "alerts", label: "Unresolved alerts", value: Number(unresolvedAlerts?.count || 0), threshold: 0, status: Number(unresolvedAlerts?.count || 0) > 0 ? "warning" : "healthy" },
      ];
      const status = checks.some((check) => check.status === "critical") ? "critical" : checks.some((check) => check.status === "warning") ? "warning" : "healthy";
      const payload = {
        checkedAt: now.toISOString(),
        status,
        settings,
        activeUsers: Number(activeUsers?.count || 0),
        auditEvents24h: Number(recentAudit?.count || 0),
        latestMetric: latestMetric || null,
        checks,
      };

      if (settings.healthAlertsEnabled && status !== "healthy") {
        const [alert] = await db.insert(systemAlerts).values({
          tenantId: access.tenant.id,
          title: `System health check ${status}`,
          message: checks.filter((check) => check.status !== "healthy").map((check) => `${check.label}: ${check.value}/${check.threshold}`).join("; "),
          severity: status === "critical" ? "critical" : "warning",
          type: "health_check",
          metadata: payload,
        }).returning();
        payload.latestMetric = { ...(payload.latestMetric as any), generatedAlertId: alert.id };
      }

      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.system_health_checked",
        entity: "system",
        entityId: access.tenant.id,
        metadata: { status, checks },
      });

      return NextResponse.json(payload);
    }

    if (action === "test-alert") {
      const message = `Test alert from ${access.tenant.name || access.tenant.slug} system settings at ${now.toISOString()}`;
      const [alert] = await db.insert(systemAlerts).values({
        tenantId: access.tenant.id,
        title: "System alert test",
        message,
        severity: "info",
        type: "test",
        metadata: { triggeredBy: access.user?.id || null },
      }).returning();

      const [webhookResult, emailResult] = await Promise.all([
        webhook(settings.alertWebhook, { tenant: access.tenant.slug, alert, settings: { healthAlertsEnabled: settings.healthAlertsEnabled } }),
        settings.alertEmail
          ? sendTenantRuntimeEmail(access.tenant.slug, {
              to: settings.alertEmail,
              subject: "System alert test",
              html: `<p>${message}</p>`,
              text: message,
            }).catch((error: any) => ({ ok: false, provider: "email", error: error?.message || "Email failed" }))
          : Promise.resolve({ ok: false, provider: "email", skipped: true, error: "No alert email configured" } as any),
      ]);

      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.system_alert_tested",
        entity: "system_alert",
        entityId: alert.id,
        metadata: { webhookResult, emailResult },
      });

      return NextResponse.json({ alert, webhookResult, emailResult });
    }

    if (action === "clear-resolved-alerts") {
      const resolved = await db.select().from(systemAlerts).where(and(eq(systemAlerts.tenantId, access.tenant.id), eq(systemAlerts.isResolved, true)));
      await db.update(systemAlerts).set({ deletedAt: now, updatedAt: now }).where(and(eq(systemAlerts.tenantId, access.tenant.id), eq(systemAlerts.isResolved, true)));
      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.system_resolved_alerts_cleared",
        entity: "system_alert",
        entityId: access.tenant.id,
        metadata: { count: resolved.length },
      });
      return NextResponse.json({ ok: true, cleared: resolved.length });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    console.error("[tenant system actions]", error);
    return NextResponse.json({ error: error?.message || "System action failed" }, { status: 500 });
  }
}
