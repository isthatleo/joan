import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, tenantSettings, userSettings, users } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import { normalizeTenantPreferences } from "@/lib/tenant-preferences";

async function getPreferences(tenantId: string) {
  const row = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "preferences")),
  });
  return normalizeTenantPreferences((row?.value as Record<string, any>) || {});
}

async function getOverview(tenantId: string) {
  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      settings: userSettings.settings,
    })
    .from(users)
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt)));

  const languageOverrides = rows.filter((row) => ((row.settings as any)?.appearance || {}).languageSource === "user");
  return {
    totalUsers: rows.length,
    languageOverrides: languageOverrides.length,
    affectedUsers: Math.max(rows.length - languageOverrides.length, 0),
    sampleOverrides: languageOverrides.slice(0, 5).map((row) => ({
      id: row.id,
      fullName: row.fullName,
      email: row.email,
    })),
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok || !access.tenant) return tenantAccessResponse(access);
    if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "");
    const preferences = normalizeTenantPreferences(body?.preferences || body || {});

    if (action === "export") {
      const overview = await getOverview(access.tenant.id);
      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.preferences_exported",
        entity: "preferences",
        entityId: access.tenant.id,
        metadata: { preferences },
      });
      return NextResponse.json({
        tenant: { id: access.tenant.id, slug: access.tenant.slug, name: access.tenant.name },
        exportedAt: new Date().toISOString(),
        preferences,
        overview,
      });
    }

    if (action === "preview") {
      return NextResponse.json({
        ok: true,
        preferences,
        samples: {
          date: formatPreferenceDate(preferences.dateFormat),
          time: preferences.timeFormat === "24h" ? "14:30" : "2:30 PM",
          number: preferences.numberFormat === "de" ? "1.234,56" : preferences.numberFormat === "eu" ? "1 234,56" : "1,234.56",
          currency: `${preferences.currency} ${preferences.numberFormat === "de" ? "1.234,56" : preferences.numberFormat === "eu" ? "1 234,56" : "1,234.56"}`,
          weekStart: preferences.weekStartDay,
        },
      });
    }

    if (action === "clear-language-overrides") {
      const rows = await db
        .select({
          id: userSettings.id,
          userId: userSettings.userId,
          settings: userSettings.settings,
        })
        .from(userSettings)
        .innerJoin(users, eq(users.id, userSettings.userId))
        .where(and(eq(users.tenantId, access.tenant.id), isNull(users.deletedAt)));
      let changed = 0;
      for (const row of rows) {
        const settings = (row.settings && typeof row.settings === "object" ? row.settings : {}) as Record<string, any>;
        const appearance = { ...(settings.appearance || {}) };
        if (appearance.languageSource !== "user") continue;
        delete appearance.languageSource;
        delete appearance.language;
        await db.update(userSettings).set({
          settings: { ...settings, appearance },
          updatedAt: new Date(),
        }).where(eq(userSettings.id, row.id));
        changed += 1;
      }
      const overview = await getOverview(access.tenant.id);
      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.preferences_language_overrides_cleared",
        entity: "preferences",
        entityId: access.tenant.id,
        metadata: { changed },
      });
      return NextResponse.json({ ok: true, changed, overview });
    }

    if (action === "apply") {
      const persisted = await getPreferences(access.tenant.id);
      const overview = await getOverview(access.tenant.id);
      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.preferences_applied",
        entity: "preferences",
        entityId: access.tenant.id,
        metadata: { preferences: persisted, overview },
      });
      return NextResponse.json({
        ok: true,
        preferences: persisted,
        overview,
        summary: {
          timezone: persisted.timezone,
          language: persisted.language,
          currency: persisted.currency,
          dateFormat: persisted.dateFormat,
          timeFormat: persisted.timeFormat,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    console.error("[tenant preferences action]", error);
    return NextResponse.json({ error: error?.message || "Preference action failed" }, { status: 500 });
  }
}

function formatPreferenceDate(format: string) {
  if (format === "MM/DD/YYYY") return "05/30/2026";
  if (format === "DD/MM/YYYY") return "30/05/2026";
  return "2026-05-30";
}
