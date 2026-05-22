import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function getTenantBySlug(slug: string) {
  return db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    // Get alert configuration from tenant metadata or return defaults
    const alertConfig = (tenant as any).alertConfig || {
      cpuThreshold: 80,
      memoryThreshold: 85,
      diskThreshold: 90,
      databaseConnectionsThreshold: 100,
      responseTimeThreshold: 500,
      enabled: true,
      emailAlerts: true,
      slackAlerts: false,
    };

    return NextResponse.json(alertConfig);
  } catch (e) {
    console.error("[tenant alerts GET]", e);
    return NextResponse.json({ error: "Failed to fetch alert configuration" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = await request.json();

    // Update tenant with new alert configuration
    await db
      .update(tenants)
      .set({
        metadata: {
          ...(tenant as any).metadata,
          alertConfig: body,
          lastAlertConfigUpdate: new Date().toISOString(),
        },
      } as any)
      .where(eq(tenants.id, tenant.id));

    return NextResponse.json({
      success: true,
      message: "Alert configuration updated successfully",
      config: body,
    });
  } catch (e) {
    console.error("[tenant alerts PUT]", e);
    return NextResponse.json({ error: "Failed to update alert configuration" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const { action } = await request.json();

    if (action === "reset") {
      // Reset to default alert configuration
      const defaultConfig = {
        cpuThreshold: 80,
        memoryThreshold: 85,
        diskThreshold: 90,
        databaseConnectionsThreshold: 100,
        responseTimeThreshold: 500,
        enabled: true,
        emailAlerts: true,
        slackAlerts: false,
      };

      await db
        .update(tenants)
        .set({
          metadata: {
            ...(tenant as any).metadata,
            alertConfig: defaultConfig,
            lastAlertConfigUpdate: new Date().toISOString(),
          },
        } as any)
        .where(eq(tenants.id, tenant.id));

      return NextResponse.json({
        success: true,
        message: "Alert configuration reset to defaults",
        config: defaultConfig,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("[tenant alerts POST]", e);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

