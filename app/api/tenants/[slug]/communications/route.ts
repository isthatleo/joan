import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantSettings, tenants, auditLogs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

async function getTenantBySlug(slug: string) {
  return db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
}

function settingsObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const rows = await db.select().from(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenant.id), eq(tenantSettings.key, "communications")));

    const communications = rows.length > 0 ? rows[0].value : {};
    return NextResponse.json(communications);
  } catch (e) {
    console.error("[tenant communications GET]", e);
    return NextResponse.json({ error: "Failed to fetch communications settings" }, { status: 500 });
  }
}

const updateSchema = z.object({
  emailProvider: z.string().optional(),
  smsProvider: z.string().optional(),
  webhookUrl: z.string().url().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = updateSchema.parse(await request.json());

    const existing = await db.select().from(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenant.id), eq(tenantSettings.key, "communications")));

    if (existing.length > 0) {
      await db.update(tenantSettings)
        .set({
          value: { ...settingsObject(existing[0].value), ...body },
          updatedAt: new Date()
        })
        .where(eq(tenantSettings.id, existing[0].id));
    } else {
      await db.insert(tenantSettings).values({
        tenantId: tenant.id,
        key: "communications",
        value: body,
      });
    }

    // Audit log
    await db.insert(auditLogs).values({
      action: "communications.updated",
      entity: "tenant",
      entityId: tenant.id,
      metadata: { changes: Object.keys(body) },
    });

    return NextResponse.json({ message: "Communications settings updated" });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: e.issues }, { status: 400 });
    }
    console.error("[tenant communications PUT]", e);
    return NextResponse.json({ error: "Failed to update communications settings" }, { status: 500 });
  }
}
