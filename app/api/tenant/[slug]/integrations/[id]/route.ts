import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { syncTenantCommunicationProviders } from "@/lib/integrations/server";
import { requireTenantIntegrationAdmin } from "@/lib/tenant-integration-access";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const access = await requireTenantIntegrationAdmin(request.headers, slug);
    if (!access.ok) return access.response;

    const [existing] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.id, id), eq(integrations.tenantId, access.tenant.id), isNull(integrations.deletedAt)))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

    await db
      .update(integrations)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(integrations.id, id));
    await syncTenantCommunicationProviders(access.tenant.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[tenant integration delete]", error);
    return NextResponse.json({ error: error?.message || "Failed to remove integration" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const access = await requireTenantIntegrationAdmin(request.headers, slug);
    if (!access.ok) return access.response;
    const [existing] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.id, id), eq(integrations.tenantId, access.tenant.id), isNull(integrations.deletedAt)))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const patch: any = { updatedAt: new Date() };
    if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
    const [updated] = await db.update(integrations).set(patch).where(eq(integrations.id, id)).returning();
    await syncTenantCommunicationProviders(access.tenant.id);
    return NextResponse.json({ integration: { id: updated.id, isActive: updated.isActive } });
  } catch (error: any) {
    console.error("[tenant integration patch]", error);
    return NextResponse.json({ error: error?.message || "Failed to update integration" }, { status: 500 });
  }
}
