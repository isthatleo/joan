import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, provisioningRuns } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import { getTenantAuditSettings, normalizeTenantAuditSettings, upsertTenantAuditSettings } from "@/lib/tenant-audit-settings";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);
  if (!access.canViewAudit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const settings = await getTenantAuditSettings(access.tenant.id);
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [auditCount, provisioningCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(and(eq(auditLogs.tenantId, access.tenant.id), gte(auditLogs.createdAt, cutoff))),
      db.select({ count: sql<number>`count(*)` }).from(provisioningRuns).where(and(eq(provisioningRuns.tenantId, access.tenant.id), gte(provisioningRuns.startedAt, cutoff))),
    ]);
    return NextResponse.json({
      settings,
      overview: {
        recentAuditEvents: Number(auditCount[0]?.count || 0),
        recentProvisioningEvents: Number(provisioningCount[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching audit settings:", error);
    return NextResponse.json({ error: "Failed to fetch audit settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);
  if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json().catch(() => ({}));
    const settings = normalizeTenantAuditSettings(body);
    await upsertTenantAuditSettings(access.tenant.id, settings, access.user?.id || null);
    await db.insert(auditLogs).values({
      tenantId: access.tenant.id,
      userId: access.user?.id || null,
      action: "tenant.audit_settings_updated",
      entity: "audit",
      entityId: access.tenant.id,
      metadata: settings,
    });
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("Error saving audit settings:", error);
    return NextResponse.json({ error: "Failed to save audit settings" }, { status: 500 });
  }
}
