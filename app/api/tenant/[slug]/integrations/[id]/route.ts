import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations, tenants } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { syncTenantCommunicationProviders } from "@/lib/integrations/server";

async function getTenant(slug: string) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return tenant ?? null;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug, id } = await params;
  const tenant = await getTenant(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const [existing] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.id, id), eq(integrations.tenantId, tenant.id), isNull(integrations.deletedAt)))
    .limit(1);
  if (!existing) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

  await db
    .update(integrations)
    .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
    .where(eq(integrations.id, id));
  await syncTenantCommunicationProviders(tenant.id);
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug, id } = await params;
  const tenant = await getTenant(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  const [existing] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.id, id), eq(integrations.tenantId, tenant.id), isNull(integrations.deletedAt)))
    .limit(1);
  if (!existing) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

  const body = await request.json();
  const patch: any = { updatedAt: new Date() };
  if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
  const [updated] = await db.update(integrations).set(patch).where(eq(integrations.id, id)).returning();
  await syncTenantCommunicationProviders(tenant.id);
  return NextResponse.json({ integration: { id: updated.id, isActive: updated.isActive } });
}
