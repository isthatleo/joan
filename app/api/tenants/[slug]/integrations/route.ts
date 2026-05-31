import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrations, tenants, auditLogs } from "@/lib/db/schema";
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

    const integrationsList = await db.select().from(integrations).where(eq(integrations.tenantId, tenant.id));
    return NextResponse.json(integrationsList);
  } catch (e) {
    console.error("[tenant integrations GET]", e);
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 });
  }
}

const createSchema = z.object({
  provider: z.string().min(1),
  config: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = createSchema.parse(await request.json());

    // Check if integration already exists
    const existing = await db.select().from(integrations)
      .where(and(eq(integrations.tenantId, tenant.id), eq(integrations.provider, body.provider)));

    if (existing.length > 0) {
      return NextResponse.json({ error: "Integration already exists" }, { status: 409 });
    }

    const [integration] = await db.insert(integrations).values({
      tenantId: tenant.id,
      provider: body.provider,
      config: body.config || {},
      status: "pending",
    }).returning();

    // Audit log
    await db.insert(auditLogs).values({
      action: "integration.created",
      entity: "integration",
      entityId: integration.id,
      metadata: { provider: body.provider },
    });

    return NextResponse.json(integration);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: e.issues }, { status: 400 });
    }
    console.error("[tenant integrations POST]", e);
    return NextResponse.json({ error: "Failed to create integration" }, { status: 500 });
  }
}
