import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, provisioningRuns } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import { getTenantAuditSettings } from "@/lib/tenant-audit-settings";

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
      return NextResponse.json({
        tenant: { id: access.tenant.id, slug: access.tenant.slug, name: access.tenant.name },
        exportedAt: new Date().toISOString(),
        settings,
        logs,
        provisioning,
      });
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

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing audit action:", error);
    return NextResponse.json({ error: "Failed to process audit action" }, { status: 500 });
  }
}
