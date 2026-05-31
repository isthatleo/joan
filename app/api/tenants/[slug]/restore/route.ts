import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import { db } from "@/lib/db";
import { auditLogs, tenants } from "@/lib/db/schema";
import { revalidateTenantAccessCache } from "@/lib/tenant-cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok) return tenantAccessResponse(access);
    if (!access.canArchiveTenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenant = access.tenant;
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const [restored] = await db
      .update(tenants)
      .set({
        isActive: true,
        provisioningStatus: "active",
        deletedAt: null,
        scheduledPurgeAt: null,
        updatedAt: new Date(),
      } as any)
      .where(eq(tenants.id, tenant.id))
      .returning();

    await db.insert(auditLogs).values({
      tenantId: tenant.id,
      userId: access.user?.id,
      action: "tenant.restored",
      entity: "tenant",
      entityId: tenant.id,
      metadata: { name: tenant.name, slug: tenant.slug },
    }).catch(() => null);

    revalidateTenantAccessCache(tenant.slug);

    return NextResponse.json({ success: true, tenant: restored });
  } catch (error: any) {
    console.error("Error restoring tenant:", error);
    return NextResponse.json({
      error: "Failed to restore tenant",
      details: error?.message,
    }, { status: 500 });
  }
}
