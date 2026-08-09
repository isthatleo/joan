import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securityEvents } from "@/lib/db/schema";
import { and, eq, desc, gte } from "drizzle-orm";
import { requireAppUser } from "@/lib/api/route-guards";

export interface CreateSecurityEventRequest {
  tenantId: string;
  userId?: string;
  deviceFingerprintId?: string;
  eventType: string;
  severity?: "low" | "medium" | "high" | "critical";
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

function isSuperAdmin(role: string | null) {
  return String(role || "").toLowerCase() === "super_admin";
}

// Create a security event
export async function POST(request: NextRequest) {
  try {
    const access = await requireAppUser(request);
    if (!access.ok) return access.response;

    const body: CreateSecurityEventRequest = await request.json();
    const {
      tenantId,
      userId,
      deviceFingerprintId,
      eventType,
      severity = "medium",
      description,
      ipAddress,
      userAgent,
      metadata,
    } = body;

    if (!tenantId || !eventType) {
      return NextResponse.json(
        { error: "Missing required fields: tenantId, eventType" },
        { status: 400 }
      );
    }
    if (!isSuperAdmin(access.user.role) && tenantId !== access.user.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const event = await db.insert(securityEvents).values({
      tenantId,
      userId,
      deviceFingerprintId,
      eventType,
      severity,
      description,
      ipAddress,
      userAgent,
      metadata,
      isResolved: false,
    });

    return NextResponse.json({
      success: true,
      message: "Security event recorded",
    });
  } catch (error) {
    console.error("[security-events POST]", error);
    return NextResponse.json({ error: "Failed to record security event" }, { status: 500 });
  }
}

// Get security events
export async function GET(request: NextRequest) {
  try {
    const access = await requireAppUser(request);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const userId = searchParams.get("userId");
    const eventType = searchParams.get("eventType");
    const severity = searchParams.get("severity");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");
    const hoursBack = parseInt(searchParams.get("hoursBack") || "24");
    const resolved = searchParams.get("resolved"); // "true", "false", "all"

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
    }
    if (!isSuperAdmin(access.user.role) && tenantId !== access.user.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const conditions = [eq(securityEvents.tenantId, tenantId)];

    if (userId) {
      conditions.push(eq(securityEvents.userId, userId));
    }

    if (eventType) {
      conditions.push(eq(securityEvents.eventType, eventType));
    }

    if (severity) {
      conditions.push(eq(securityEvents.severity, severity as any));
    }

    if (resolved === "true") {
      conditions.push(eq(securityEvents.isResolved, true));
    } else if (resolved === "false") {
      conditions.push(eq(securityEvents.isResolved, false));
    }

    // Add time filter
    const hoursAgo = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    conditions.push(gte(securityEvents.createdAt, hoursAgo));

    const events = await db
      .select()
      .from(securityEvents)
      .where(and(...conditions))
      .orderBy(desc(securityEvents.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[security-events GET]", error);
    return NextResponse.json({ error: "Failed to retrieve security events" }, { status: 500 });
  }
}

// PUT: Resolve a security event
export async function PUT(request: NextRequest) {
  try {
    const access = await requireAppUser(request, ["super_admin", "hospital_admin"]);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    const body = await request.json();
    const { notes } = body;

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const existing = await db.query.securityEvents.findFirst({ where: eq(securityEvents.id, eventId) });
    if (!existing) {
      return NextResponse.json({ error: "Security event not found" }, { status: 404 });
    }
    if (!isSuperAdmin(access.user.role) && existing.tenantId !== access.user.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const event = await db
      .update(securityEvents)
      .set({
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: access.user.id,
        notes,
      })
      .where(eq(securityEvents.id, eventId));

    return NextResponse.json({
      success: true,
      message: "Security event resolved",
    });
  } catch (error) {
    console.error("[security-events PUT]", error);
    return NextResponse.json({ error: "Failed to resolve security event" }, { status: 500 });
  }
}
