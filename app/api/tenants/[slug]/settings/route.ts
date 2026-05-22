import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantSettings, tenants, auditLogs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const DEFAULTS = {
  branding: { primaryColor: "#F97316", logoUrl: "" },
  notifications: { emailEnabled: true, smsEnabled: false, pushEnabled: false },
  modules: { appointments: true, pharmacy: true, lab: true, billing: true },
  preferences: { timezone: "UTC", language: "en", currency: "USD" },
};

async function getTenantBySlug(slug: string) {
  return db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const rows = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, tenant.id));
    const out: any = { ...DEFAULTS };
    for (const r of rows) out[r.key] = { ...(out[r.key] || {}), ...(r.value as any) };
    return NextResponse.json(out);
  } catch (e: any) {
    console.error("[tenant settings GET]", e);
    return NextResponse.json({ error: e.message || "Failed to fetch settings" }, { status: 500 });
  }
}

const putSchema = z.record(z.string(), z.any());

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = putSchema.parse(await request.json());
    const changedKeys: string[] = [];

    for (const [key, value] of Object.entries(body)) {
      const existing = await db.select().from(tenantSettings)
        .where(and(eq(tenantSettings.tenantId, tenant.id), eq(tenantSettings.key, key)));
      if (existing.length > 0) {
        await db.update(tenantSettings)
          .set({ value, updatedAt: new Date() })
          .where(eq(tenantSettings.id, existing[0].id));
      } else {
        await db.insert(tenantSettings).values({ tenantId: tenant.id, key, value });
      }
      changedKeys.push(key);
    }

    // Audit
    if (changedKeys.length > 0) {
      await db.insert(auditLogs).values({
        action: "tenant.settings_updated",
        entity: "tenant",
        entityId: tenant.id,
        metadata: { keys: changedKeys, changes: body },
      });
    }

    return NextResponse.json({ message: "Settings updated", changedKeys });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid settings", details: e.errors }, { status: 400 });
    }
    console.error("[tenant settings PUT]", e);
    return NextResponse.json({ error: e.message || "Failed to update settings" }, { status: 500 });
  }
}