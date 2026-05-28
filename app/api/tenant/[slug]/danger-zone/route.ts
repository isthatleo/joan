import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, tenantSettings, tenants } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";

async function getDangerZoneSettings(tenantId: string) {
  const row = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "dangerZone")),
  });
  return {
    archiveGraceDays: Number((row?.value as any)?.archiveGraceDays || 30),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);

  try {
    const settings = await getDangerZoneSettings(access.tenant.id);
    return NextResponse.json({
      tenant: {
        id: access.tenant.id,
        slug: access.tenant.slug,
        name: access.tenant.name,
        isActive: access.tenant.isActive,
        provisioningStatus: access.tenant.provisioningStatus,
        scheduledPurgeAt: (access.tenant as any).scheduledPurgeAt || null,
        deletedAt: access.tenant.deletedAt || null,
      },
      settings,
      restoreAuthority: "super_admin",
    });
  } catch (error) {
    console.error("Error fetching danger zone state:", error);
    return NextResponse.json({ error: "Failed to fetch danger zone state" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);

  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "export-snapshot") {
      if (!access.canViewAudit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const recentAudit = await db.select().from(auditLogs).where(eq(auditLogs.tenantId, access.tenant.id)).limit(100);
      return NextResponse.json({
        tenant: {
          id: access.tenant.id,
          slug: access.tenant.slug,
          name: access.tenant.name,
          plan: access.tenant.plan,
          isActive: access.tenant.isActive,
        },
        exportedAt: new Date().toISOString(),
        recentAudit,
      });
    }

    if (action === "suspend") {
      if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const [updated] = await db.update(tenants).set({
        isActive: false,
        provisioningStatus: "suspended",
        updatedAt: new Date(),
      }).where(eq(tenants.id, access.tenant.id)).returning();
      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.suspended",
        entity: "tenant",
        entityId: access.tenant.id,
        metadata: { slug: access.tenant.slug },
      });
      return NextResponse.json({ ok: true, tenant: updated });
    }

    if (action === "reactivate") {
      if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const [updated] = await db.update(tenants).set({
        isActive: true,
        provisioningStatus: "completed",
        updatedAt: new Date(),
      }).where(eq(tenants.id, access.tenant.id)).returning();
      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.reactivated",
        entity: "tenant",
        entityId: access.tenant.id,
        metadata: { slug: access.tenant.slug },
      });
      return NextResponse.json({ ok: true, tenant: updated });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing danger zone action:", error);
    return NextResponse.json({ error: "Failed to process danger zone action" }, { status: 500 });
  }
}
