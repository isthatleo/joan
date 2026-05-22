import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { systemConfigurations, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;

    // Get tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get configurations
    const configs = await db
      .select()
      .from(systemConfigurations)
      .where(eq(systemConfigurations.tenantId, tenant.id));

    // Convert to key-value map
    const configMap = Object.fromEntries(
      configs.map((c) => [c.key, c.value])
    );

    // Set defaults if not exists
    const defaults = {
      cpu_threshold: 80,
      memory_threshold: 85,
      disk_threshold: 90,
      alert_email: null,
      alert_webhook: null,
    };

    return NextResponse.json({
      config: { ...defaults, ...configMap },
      configs,
    });
  } catch (error) {
    console.error("Error fetching system config:", error);
    return NextResponse.json(
      { error: "Failed to fetch system config" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const body = await request.json();

    // Get tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Upsert configuration
    const existing = await db
      .select()
      .from(systemConfigurations)
      .where(
        (c) =>
          c.tenantId === tenant.id && c.key === body.key
      );

    let config;
    if (existing.length > 0) {
      config = await db
        .update(systemConfigurations)
        .set({
          value: body.value,
          description: body.description,
        })
        .where(eq(systemConfigurations.id, existing[0].id))
        .returning();
    } else {
      config = await db
        .insert(systemConfigurations)
        .values({
          tenantId: tenant.id,
          key: body.key,
          value: body.value,
          description: body.description,
        })
        .returning();
    }

    return NextResponse.json(config[0]);
  } catch (error) {
    console.error("Error saving system config:", error);
    return NextResponse.json(
      { error: "Failed to save system config" },
      { status: 500 }
    );
  }
}

