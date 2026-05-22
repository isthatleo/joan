import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantSettings, tenants, auditLogs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

async function getTenantBySlug(slug: string) {
  return db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const rows = await db.select().from(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenant.id), eq(tenantSettings.key, "security")));

    const security = rows.length > 0 ? rows[0].value : {};
    return NextResponse.json(security);
  } catch (e) {
    console.error("[tenant security GET]", e);
    return NextResponse.json({ error: "Failed to fetch security settings" }, { status: 500 });
  }
}

const updateSchema = z.object({
  twoFactorRequired: z.boolean().optional(),
  sessionTimeout: z.number().min(15).max(480).optional(),
  ipWhitelistEnabled: z.boolean().optional(),
  ipWhitelist: z.array(z.string()).optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = updateSchema.parse(await request.json());

    const existing = await db.select().from(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenant.id), eq(tenantSettings.key, "security")));

    if (existing.length > 0) {
      await db.update(tenantSettings)
        .set({
          value: { ...existing[0].value, ...body },
          updatedAt: new Date()
        })
        .where(eq(tenantSettings.id, existing[0].id));
    } else {
      await db.insert(tenantSettings).values({
        tenantId: tenant.id,
        key: "security",
        value: body,
      });
    }

    // Audit log
    await db.insert(auditLogs).values({
      action: "security.updated",
      entity: "tenant",
      entityId: tenant.id,
      metadata: { changes: Object.keys(body) },
    });

    return NextResponse.json({ message: "Security settings updated" });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: e.errors }, { status: 400 });
    }
    console.error("[tenant security PUT]", e);
    return NextResponse.json({ error: "Failed to update security settings" }, { status: 500 });
  }
}
