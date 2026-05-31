import { NextRequest, NextResponse } from "next/server";
import { TenantService } from "@/lib/services/tenant.service";
import { db } from "@/lib/db";
import { auditLogs, tenants as tenantsTable, userSessions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import { revalidateTenantAccessCache } from "@/lib/tenant-cache";
import { inferCountryFromCity } from "@/lib/address-city-inference";
import { requireSuperAdmin } from "@/lib/platform-billing";

const service = new TenantService();
const ARCHIVE_GRACE_DAYS = 60;
const ARCHIVE_GRACE_MS = ARCHIVE_GRACE_DAYS * 24 * 60 * 60 * 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok) return tenantAccessResponse(access);
    return NextResponse.json(access.tenant);
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json({ error: "Failed to fetch tenant" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok) return tenantAccessResponse(access);
    if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const data = await request.json();
    if (data && typeof data === "object" && !data.country && data.city) {
      data.country = inferCountryFromCity(data.city) || data.country;
    }

    // First get the tenant by slug to get its ID
    const tenant = access.tenant;
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const updatedTenant = await service.updateTenant(tenant.id, data);
    if (!updatedTenant.length) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    revalidateTenantAccessCache(tenant.slug);
    if (updatedTenant[0]?.slug && updatedTenant[0].slug !== tenant.slug) {
      revalidateTenantAccessCache(updatedTenant[0].slug);
    }
    return NextResponse.json(updatedTenant[0]);
  } catch (error) {
    console.error("Error updating tenant:", error);
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const purge = url.searchParams.get("purge") === "true";
    const force = url.searchParams.get("force") === "true";
    const access = await getTenantAccess(request, slug);

    let tenant = access.tenant;
    let actorId = access.user?.id;
    let canArchiveTenant = access.ok && access.canArchiveTenant;

    if (!access.ok && purge) {
      const superAdmin = await requireSuperAdmin(request);
      if (!superAdmin.ok) return superAdmin.response;
      tenant = await db.query.tenants.findFirst({ where: eq(tenantsTable.slug, slug.toLowerCase()) });
      actorId = superAdmin.user.id;
      canArchiveTenant = true;
    } else if (!access.ok) {
      return tenantAccessResponse(access);
    }

    if (!canArchiveTenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    if (purge) {
      if (!force) {
        const scheduledPurgeAt = (tenant as any).scheduledPurgeAt as Date | null;
        if (!scheduledPurgeAt) {
          return NextResponse.json({
            error: "Tenant must be archived with a scheduled purge timestamp before hard purge.",
          }, { status: 400 });
        }
        const waitMs = new Date(scheduledPurgeAt).getTime() - Date.now();
        if (waitMs > 0) {
          const daysLeft = Math.ceil(waitMs / (24 * 60 * 60 * 1000));
          return NextResponse.json({
            error: `Hard purge unavailable for ${daysLeft} more day(s). Pass force=true to override.`,
          }, { status: 400 });
        }
      }
      await db.insert(auditLogs).values({
        userId: actorId,
        action: force ? "tenant.force_purged" : "tenant.purged",
        entity: "tenant",
        entityId: tenant.id,
        metadata: { name: tenant.name, slug: tenant.slug, force },
      }).catch(() => {});
      await service.deleteTenant(tenant.id);
      revalidateTenantAccessCache(tenant.slug);
      return NextResponse.json({ success: true, mode: force ? "force_purged" : "purged" });
    }

    // Soft delete: deactivate + archive
    const scheduledPurgeAt = new Date(Date.now() + ARCHIVE_GRACE_MS);
    await db.update(tenantsTable).set({
      isActive: false,
      provisioningStatus: "archived",
      deletedAt: new Date(),
      scheduledPurgeAt,
      updatedAt: new Date(),
    } as any).where(eq(tenantsTable.id, tenant.id));

    await db.update(userSessions).set({
      isActive: false,
      logoutAt: new Date(),
      updatedAt: new Date(),
    } as any).where(eq(userSessions.tenantId, tenant.id)).catch(() => null);

    await db.execute(sql`
      DELETE FROM "session"
      WHERE "userId" IN (
        SELECT au.id
        FROM "user" au
        INNER JOIN users app_user ON lower(app_user.email) = lower(au.email)
        WHERE app_user.tenant_id = ${tenant.id}
      )
    `).catch(() => null);

    // Audit
    await db.insert(auditLogs).values({
      tenantId: tenant.id,
      userId: actorId,
      action: "tenant.archived",
      entity: "tenant",
      entityId: tenant.id,
      metadata: { name: tenant.name, slug: tenant.slug, scheduledPurgeAt },
    });

    revalidateTenantAccessCache(tenant.slug);

    return NextResponse.json({
      success: true,
      mode: "archived",
      graceDays: ARCHIVE_GRACE_DAYS,
      scheduledPurgeAt,
    });
  } catch (error: any) {
    console.error("Error deleting tenant:", error);
    return NextResponse.json({
      error: "Failed to delete tenant",
      details: error?.message,
    }, { status: 500 });
  }
}

// Handle PATCH for specific actions
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { action } = await request.json();

    // First get the tenant by slug to get its ID
    const tenant = await service.getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    switch (action) {
      case "suspend":
        const suspended = await service.suspendTenant(tenant.id);
        revalidateTenantAccessCache(tenant.slug);
        return NextResponse.json(suspended[0]);
      case "activate":
        const activated = await service.activateTenant(tenant.id);
        revalidateTenantAccessCache(tenant.slug);
        return NextResponse.json(activated[0]);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error performing tenant action:", error);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
