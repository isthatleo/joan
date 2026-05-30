import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, tenantSettings, userSettings, users } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import { DEFAULT_TENANT_PREFERENCES, normalizeTenantPreferences } from "@/lib/tenant-preferences";

async function getPreferenceOverview(tenantId: string) {
  const userRows = await db
    .select({
      id: users.id,
      settings: userSettings.settings,
    })
    .from(users)
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt)));

  const languageOverrides = userRows.filter((row) => {
    const appearance = ((row.settings as any)?.appearance || {}) as Record<string, any>;
    return appearance.languageSource === "user";
  }).length;

  return {
    totalUsers: userRows.length,
    languageOverrides,
    inheritingLanguage: Math.max(userRows.length - languageOverrides, 0),
  };
}

async function upsertPreferences(tenantId: string, value: Record<string, any>, updatedBy?: string | null) {
  const existing = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "preferences")),
  });

  if (existing) {
    await db.update(tenantSettings).set({ value, updatedAt: new Date(), updatedBy: updatedBy || null }).where(eq(tenantSettings.id, existing.id));
    return;
  }

  await db.insert(tenantSettings).values({ tenantId, key: "preferences", value, updatedBy: updatedBy || null });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok || !access.tenant) return tenantAccessResponse(access);

    const preferences = normalizeTenantPreferences(((await db.query.tenantSettings.findFirst({
      where: and(eq(tenantSettings.tenantId, access.tenant.id), eq(tenantSettings.key, "preferences")),
    }))?.value as Record<string, any>) || DEFAULT_TENANT_PREFERENCES);
    const overview = await getPreferenceOverview(access.tenant.id);

    return NextResponse.json({
      tenant: { id: access.tenant.id, slug: access.tenant.slug, name: access.tenant.name },
      preferences,
      overview,
    });
  } catch (error: any) {
    console.error("[tenant preferences:get]", error);
    return NextResponse.json({ error: error?.message || "Failed to load tenant preferences" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok || !access.tenant) return tenantAccessResponse(access);
    if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const preferences = normalizeTenantPreferences(body?.preferences || body || {});
    await upsertPreferences(access.tenant.id, preferences, access.user?.id || null);
    await db.insert(auditLogs).values({
      tenantId: access.tenant.id,
      userId: access.user?.id || null,
      action: "tenant.preferences_updated",
      entity: "preferences",
      entityId: access.tenant.id,
      metadata: { preferences },
    });

    return NextResponse.json({ ok: true, preferences, overview: await getPreferenceOverview(access.tenant.id) });
  } catch (error: any) {
    console.error("[tenant preferences:put]", error);
    return NextResponse.json({ error: error?.message || "Failed to save tenant preferences" }, { status: 500 });
  }
}
