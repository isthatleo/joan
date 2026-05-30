import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import {
  getTenantComplianceSettings,
  normalizeTenantComplianceSettings,
  upsertTenantComplianceSettings,
} from "@/lib/tenant-compliance";

async function getComplianceOverview(tenantId: string) {
  const staffCount = await db.select({ count: users.id }).from(users).where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt)));
  const recentEvents = await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.tenantId, tenantId), eq(auditLogs.entity, "compliance")))
    .orderBy(desc(auditLogs.createdAt))
    .limit(25);

  return {
    staffCount: staffCount.length,
    recentComplianceEvents: recentEvents.length,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok || !access.tenant) return tenantAccessResponse(access);

    const [settings, overview] = await Promise.all([
      getTenantComplianceSettings(access.tenant.id),
      getComplianceOverview(access.tenant.id),
    ]);

    return NextResponse.json({
      tenant: { id: access.tenant.id, slug: access.tenant.slug, name: access.tenant.name },
      settings,
      overview,
    });
  } catch (error: any) {
    console.error("[tenant compliance settings:get]", error);
    return NextResponse.json({ error: error?.message || "Failed to load compliance settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok || !access.tenant) return tenantAccessResponse(access);
    if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const settings = normalizeTenantComplianceSettings(body?.settings || body || {});
    await upsertTenantComplianceSettings(access.tenant.id, settings, access.user?.id || null);
    await db.insert(auditLogs).values({
      tenantId: access.tenant.id,
      userId: access.user?.id || null,
      action: "tenant.compliance_updated",
      entity: "compliance",
      entityId: access.tenant.id,
      metadata: { settings },
    });

    return NextResponse.json({ ok: true, settings, overview: await getComplianceOverview(access.tenant.id) });
  } catch (error: any) {
    console.error("[tenant compliance settings:put]", error);
    return NextResponse.json({ error: error?.message || "Failed to save compliance settings" }, { status: 500 });
  }
}
