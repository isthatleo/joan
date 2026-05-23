import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { systemAlerts, tenants } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const resolved = searchParams.get("resolved");

    // Get tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get alerts
    let query = db
      .select()
      .from(systemAlerts)
      .where(eq(systemAlerts.tenantId, tenant.id));

    if (resolved === "false") {
      query = query.where(eq(systemAlerts.isResolved, false));
    }

    const alerts = await query.orderBy(desc(systemAlerts.createdAt));

    return NextResponse.json({
      alerts,
      count: alerts.length,
      unresolved: alerts.filter((a) => !a.isResolved).length,
    });
  } catch (error) {
    console.error("Error fetching system alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch system alerts" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    // Get tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Create alert
    const alert = await db
      .insert(systemAlerts)
      .values({
        tenantId: tenant.id,
        title: body.title,
        message: body.message,
        severity: body.severity || "info",
        type: body.type,
        metadata: body.metadata,
      })
      .returning();

    return NextResponse.json(alert[0]);
  } catch (error) {
    console.error("Error creating system alert:", error);
    return NextResponse.json(
      { error: "Failed to create system alert" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const body = await request.json();
    const { alertId, isResolved } = body;

    // Update alert
    const alert = await db
      .update(systemAlerts)
      .set({
        isResolved,
        resolvedAt: isResolved ? new Date() : null,
      })
      .where(eq(systemAlerts.id, alertId))
      .returning();

    return NextResponse.json(alert[0]);
  } catch (error) {
    console.error("Error updating system alert:", error);
    return NextResponse.json(
      { error: "Failed to update system alert" },
      { status: 500 }
    );
  }
}

