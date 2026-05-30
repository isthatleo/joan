import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, provisioningRuns } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import { getTenantAuditSettings } from "@/lib/tenant-audit-settings";
import { uploadTenantObjectToStorageProviders } from "@/lib/integrations/runtime";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);
  if (!access.canViewAudit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "");
    const sinceDays = Math.max(1, Math.min(365, Number(body?.days || 30)));
    const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

    if (action === "export") {
      const [settings, logs, provisioning] = await Promise.all([
        getTenantAuditSettings(access.tenant.id),
        db.select().from(auditLogs).where(and(eq(auditLogs.tenantId, access.tenant.id), gte(auditLogs.createdAt, cutoff))).orderBy(desc(auditLogs.createdAt)).limit(500),
        db.select().from(provisioningRuns).where(and(eq(provisioningRuns.tenantId, access.tenant.id), gte(provisioningRuns.startedAt, cutoff))).orderBy(desc(provisioningRuns.startedAt)).limit(200),
      ]);
      const payload = {
        id: crypto.randomUUID(),
        tenant: { id: access.tenant.id, slug: access.tenant.slug, name: access.tenant.name },
        exportedAt: new Date().toISOString(),
        settings,
        logs,
        provisioning,
        format: settings.exportFormat,
      };
      const storageDeliveries = settings.immutableSnapshots
        ? await uploadTenantObjectToStorageProviders(access.tenant.slug, {
            key: `audit-snapshots/${access.tenant.slug}/${payload.exportedAt.slice(0, 10)}/${payload.id}.json`,
            content: JSON.stringify(payload, null, 2),
            contentType: "application/json",
            metadata: {
              tenantId: access.tenant.id,
              exportId: payload.id,
              logs: String(logs.length),
              provisioning: String(provisioning.length),
            },
          })
        : [];
      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.audit_exported",
        entity: "audit",
        entityId: access.tenant.id,
        metadata: { exportId: payload.id, logs: logs.length, provisioning: provisioning.length, storageDeliveries },
      });
      return NextResponse.json({ ...payload, storageDeliveries });
    }

    if (action === "integrity-check") {
      const logs = await db.select().from(auditLogs).where(eq(auditLogs.tenantId, access.tenant.id)).orderBy(desc(auditLogs.createdAt)).limit(200);
      const findings = [
        logs.some((item) => !item.action) ? "Some audit events are missing action names." : null,
        logs.some((item) => !item.createdAt) ? "Some audit events are missing timestamps." : null,
        logs.length === 0 ? "No tenant audit events are present yet." : null,
      ].filter(Boolean);

      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.audit_integrity_checked",
        entity: "audit",
        entityId: access.tenant.id,
        metadata: { findings, totalEvents: logs.length },
      });

      return NextResponse.json({
        checkedAt: new Date().toISOString(),
        totalEvents: logs.length,
        ok: findings.length === 0,
        findings,
      });
    }

    if (action === "anomaly-scan") {
      const logs = await db.select().from(auditLogs).where(and(eq(auditLogs.tenantId, access.tenant.id), gte(auditLogs.createdAt, cutoff))).orderBy(desc(auditLogs.createdAt)).limit(1000);
      const byUser = new Map<string, number>();
      const byAction = new Map<string, number>();
      const findings: string[] = [];
      logs.forEach((log) => {
        if (log.userId) byUser.set(log.userId, (byUser.get(log.userId) || 0) + 1);
        if (log.action) byAction.set(log.action, (byAction.get(log.action) || 0) + 1);
        if (String(log.action || "").includes("failed")) findings.push(`Failed event observed: ${log.action}`);
      });
      [...byUser.entries()].filter(([, count]) => count > 100).forEach(([userId, count]) => findings.push(`High activity volume from user ${userId}: ${count} events.`));
      [...byAction.entries()].filter(([, count]) => count > 200).forEach(([actionName, count]) => findings.push(`High action frequency for ${actionName}: ${count} events.`));
      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.audit_anomaly_scanned",
        entity: "audit",
        entityId: access.tenant.id,
        metadata: { days: sinceDays, findings: findings.slice(0, 25), scannedEvents: logs.length },
      });
      return NextResponse.json({
        scannedAt: new Date().toISOString(),
        scannedEvents: logs.length,
        ok: findings.length === 0,
        findings: findings.slice(0, 25),
        topUsers: [...byUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([userId, count]) => ({ userId, count })),
        topActions: [...byAction.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([actionName, count]) => ({ actionName, count })),
      });
    }

    if (action === "retention-preview") {
      const settings = await getTenantAuditSettings(access.tenant.id);
      const retentionCutoff = new Date(Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000);
      const [expiredLogs, expiredRuns] = await Promise.all([
        db.select().from(auditLogs).where(and(eq(auditLogs.tenantId, access.tenant.id), lt(auditLogs.createdAt, retentionCutoff))).orderBy(desc(auditLogs.createdAt)).limit(100),
        db.select().from(provisioningRuns).where(and(eq(provisioningRuns.tenantId, access.tenant.id), lt(provisioningRuns.startedAt, retentionCutoff))).orderBy(desc(provisioningRuns.startedAt)).limit(100),
      ]);
      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.audit_retention_previewed",
        entity: "audit",
        entityId: access.tenant.id,
        metadata: { retentionDays: settings.retentionDays, expiredLogs: expiredLogs.length, expiredProvisioningRuns: expiredRuns.length },
      });
      return NextResponse.json({
        previewedAt: new Date().toISOString(),
        retentionDays: settings.retentionDays,
        cutoff: retentionCutoff.toISOString(),
        expiredLogs: expiredLogs.length,
        expiredProvisioningRuns: expiredRuns.length,
        sample: { logs: expiredLogs.slice(0, 5), provisioning: expiredRuns.slice(0, 5) },
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing audit action:", error);
    return NextResponse.json({ error: "Failed to process audit action" }, { status: 500 });
  }
}
