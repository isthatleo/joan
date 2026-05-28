import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, systemAlerts } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);

  try {
    const { searchParams } = new URL(request.url);
    const unresolvedOnly = searchParams.get("resolved") === "false";
    const alerts = await db
      .select()
      .from(systemAlerts)
      .where(unresolvedOnly ? and(eq(systemAlerts.tenantId, access.tenant.id), eq(systemAlerts.isResolved, false)) : eq(systemAlerts.tenantId, access.tenant.id))
      .orderBy(desc(systemAlerts.createdAt))
      .limit(100);

    return NextResponse.json({
      alerts,
      count: alerts.length,
      unresolved: alerts.filter((item) => !item.isResolved).length,
    });
  } catch (error) {
    console.error("Error fetching system alerts:", error);
    return NextResponse.json({ error: "Failed to fetch system alerts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);
  if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const [created] = await db.insert(systemAlerts).values({
      tenantId: access.tenant.id,
      title: body.title,
      message: body.message,
      severity: body.severity || "info",
      type: body.type || "custom",
      metadata: body.metadata || {},
    }).returning();

    await db.insert(auditLogs).values({
      tenantId: access.tenant.id,
      userId: access.user?.id || null,
      action: "tenant.system_alert_created",
      entity: "system_alert",
      entityId: created.id,
      metadata: body,
    });
    return NextResponse.json(created);
  } catch (error) {
    console.error("Error creating system alert:", error);
    return NextResponse.json({ error: "Failed to create system alert" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);
  if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const [updated] = await db.update(systemAlerts).set({
      isResolved: Boolean(body.isResolved),
      resolvedAt: body.isResolved ? new Date() : null,
      updatedAt: new Date(),
    }).where(and(eq(systemAlerts.id, String(body.alertId || "")), eq(systemAlerts.tenantId, access.tenant.id))).returning();

    if (!updated) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    await db.insert(auditLogs).values({
      tenantId: access.tenant.id,
      userId: access.user?.id || null,
      action: updated.isResolved ? "tenant.system_alert_resolved" : "tenant.system_alert_reopened",
      entity: "system_alert",
      entityId: updated.id,
      metadata: { isResolved: updated.isResolved },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating system alert:", error);
    return NextResponse.json({ error: "Failed to update system alert" }, { status: 500 });
  }
}
