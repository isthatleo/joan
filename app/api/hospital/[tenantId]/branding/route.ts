import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// PUT - Update tenant branding and sync to all dashboards
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Update tenant branding info
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined && body.name !== tenant.name) {
      updateData.name = body.name;
    }

    if (body.logoUrl !== undefined && body.logoUrl !== tenant.logoUrl) {
      updateData.logoUrl = body.logoUrl;
    }

    if (body.slug !== undefined && body.slug !== tenant.slug) {
      updateData.slug = body.slug;
    }

    if (body.contactEmail !== undefined) {
      updateData.contactEmail = body.contactEmail;
    }

    if (body.contactPhone !== undefined) {
      updateData.contactPhone = body.contactPhone;
    }

    await db
      .update(tenants)
      .set(updateData)
      .where(eq(tenants.id, tenantId));

    // Audit log for branding changes
    await db.insert(auditLogs).values({
      action: "tenant.branding_updated",
      entity: "tenant",
      entityId: tenantId,
      metadata: { changes: body },
    });

    // TODO: Trigger a broadcast event to update all connected clients
    // This would typically use WebSockets or a pub/sub system
    // Example: await redis.publish(`tenant:${tenantId}:settings`, JSON.stringify(body))

    return NextResponse.json({
      message: "Tenant branding updated and synced to all dashboards",
      tenant: {
        id: tenant.id,
        name: updateData.name || tenant.name,
        logoUrl: updateData.logoUrl || tenant.logoUrl,
      },
    });
  } catch (error) {
    console.error("[tenant branding PUT]", error);
    return NextResponse.json(
      { error: "Failed to update tenant branding" },
      { status: 500 }
    );
  }
}

// GET - Get tenant branding info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      address: tenant.address,
      city: tenant.city,
      country: tenant.country,
      timezone: tenant.timezone,
      plan: tenant.plan,
      isActive: tenant.isActive,
    });
  } catch (error) {
    console.error("[tenant branding GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant branding" },
      { status: 500 }
    );
  }
}

