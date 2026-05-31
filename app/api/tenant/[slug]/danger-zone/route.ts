import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, tenantSettings, tenants } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import { createTenantBackupSnapshot } from "@/lib/tenant-backups";
import { revalidateTenantAccessCache } from "@/lib/tenant-cache";

async function getDangerZoneSettings(tenantId: string) {
  const row = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "dangerZone")),
  });
  return {
    archiveGraceDays: Math.max(1, Math.min(365, Number((row?.value as any)?.archiveGraceDays || 30))),
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
      const backup = await createTenantBackupSnapshot(access.tenant.id, access.user?.id || null);
      const recentAudit = await db.select().from(auditLogs).where(eq(auditLogs.tenantId, access.tenant.id)).limit(100);
      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.danger_snapshot_exported",
        entity: "tenant",
        entityId: access.tenant.id,
        metadata: { backupId: backup.manifest.id, storageDeliveries: backup.manifest.storageDeliveries },
      });
      return NextResponse.json({
        tenant: {
          id: access.tenant.id,
          slug: access.tenant.slug,
          name: access.tenant.name,
          plan: access.tenant.plan,
          isActive: access.tenant.isActive,
        },
        exportedAt: new Date().toISOString(),
        backup,
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
      revalidateTenantAccessCache(access.tenant.slug);
      return NextResponse.json({ ok: true, tenant: updated });
    }

    if (action === "reactivate") {
      if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const [updated] = await db.update(tenants).set({
        isActive: true,
        provisioningStatus: "completed",
        deletedAt: null,
        scheduledPurgeAt: null,
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
      revalidateTenantAccessCache(access.tenant.slug);
      return NextResponse.json({ ok: true, tenant: updated });
    }

    if (action === "archive") {
      if (!access.canArchiveTenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (body.confirmSlug !== access.tenant.slug) {
        return NextResponse.json({ error: `Type the tenant slug "${access.tenant.slug}" to confirm` }, { status: 400 });
      }
      const settings = await getDangerZoneSettings(access.tenant.id);
      const backup = await createTenantBackupSnapshot(access.tenant.id, access.user?.id || null);
      const scheduledPurgeAt = new Date(Date.now() + settings.archiveGraceDays * 24 * 60 * 60 * 1000);
      const [updated] = await db.update(tenants).set({
        isActive: false,
        provisioningStatus: "archived",
        deletedAt: new Date(),
        scheduledPurgeAt,
        updatedAt: new Date(),
      } as any).where(eq(tenants.id, access.tenant.id)).returning();

      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.archived",
        entity: "tenant",
        entityId: access.tenant.id,
        metadata: {
          slug: access.tenant.slug,
          scheduledPurgeAt,
          archiveGraceDays: settings.archiveGraceDays,
          backupId: backup.manifest.id,
          storageDeliveries: backup.manifest.storageDeliveries,
        },
      });
      revalidateTenantAccessCache(access.tenant.slug);
      return NextResponse.json({
        ok: true,
        mode: "archived",
        tenant: updated,
        scheduledPurgeAt,
        backup,
      });
    }

    if (action === "save-settings") {
      if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const settings = {
        archiveGraceDays: Math.max(1, Math.min(365, Number(body.archiveGraceDays || 30))),
      };
      const existing = await db.query.tenantSettings.findFirst({
        where: and(eq(tenantSettings.tenantId, access.tenant.id), eq(tenantSettings.key, "dangerZone")),
      });
      if (existing) {
        await db.update(tenantSettings).set({ value: settings, updatedAt: new Date(), updatedBy: access.user?.id || null }).where(eq(tenantSettings.id, existing.id));
      } else {
        await db.insert(tenantSettings).values({ tenantId: access.tenant.id, key: "dangerZone", value: settings, updatedBy: access.user?.id || null });
      }
      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.danger_settings_updated",
        entity: "tenant",
        entityId: access.tenant.id,
        metadata: settings,
      });
      return NextResponse.json({ ok: true, settings });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing danger zone action:", error);
    return NextResponse.json({ error: "Failed to process danger zone action" }, { status: 500 });
  }
}
