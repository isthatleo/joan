import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrations, tenants, auditLogs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

async function getTenantBySlug(slug: string) {
  return db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; integrationId: string }> }
) {
  try {
    const { slug, integrationId } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const [integration] = await db.select().from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.tenantId, tenant.id)));

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    return NextResponse.json(integration);
  } catch (e) {
    console.error("[tenant integration GET]", e);
    return NextResponse.json({ error: "Failed to fetch integration" }, { status: 500 });
  }
}

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  apiKeyEncrypted: z.string().optional(),
  apiSecretEncrypted: z.string().optional(),
  accountId: z.string().optional(),
  accountName: z.string().optional(),
  config: z.record(z.string(), z.any()).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; integrationId: string }> }
) {
  try {
    const { slug, integrationId } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = updateSchema.parse(await request.json());

    const [existing] = await db.select().from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.tenantId, tenant.id)));

    if (!existing) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    const [updated] = await db.update(integrations)
      .set({
        ...body,
        lastTestedAt: body.isActive ? new Date() : existing.lastTestedAt,
        status: body.isActive ? "active" : existing.status,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, integrationId))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      action: "integration.updated",
      entity: "integration",
      entityId: integrationId,
      metadata: { provider: existing.provider, changes: Object.keys(body) },
    });

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: e.issues }, { status: 400 });
    }
    console.error("[tenant integration PUT]", e);
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; integrationId: string }> }
) {
  try {
    const { slug, integrationId } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const [existing] = await db.select().from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.tenantId, tenant.id)));

    if (!existing) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    await db.delete(integrations).where(eq(integrations.id, integrationId));

    // Audit log
    await db.insert(auditLogs).values({
      action: "integration.deleted",
      entity: "integration",
      entityId: integrationId,
      metadata: { provider: existing.provider },
    });

    return NextResponse.json({ message: "Integration deleted" });
  } catch (e) {
    console.error("[tenant integration DELETE]", e);
    return NextResponse.json({ error: "Failed to delete integration" }, { status: 500 });
  }
}
