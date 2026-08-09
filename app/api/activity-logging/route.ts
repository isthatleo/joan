import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activityLogs, users } from "@/lib/db/schema";
import { getIpAddress } from "@/lib/fingerprinting";
import { auth } from "@/lib/auth";
import { and, eq, desc, gte, ilike, isNull } from "drizzle-orm";

export interface LogActivityRequest {
  deviceFingerprintId?: string;
  userSessionId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  description?: string;
  status?: "success" | "failure" | "pending";
  errorMessage?: string;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
}

async function resolveCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null as any);
  if (!session?.user?.email) return null;
  return db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true, tenantId: true, role: true },
  });
}

export async function POST(request: NextRequest) {
  try {
    const appUser = await resolveCurrentUser(request);
    if (!appUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: LogActivityRequest = await request.json();
    const {
      deviceFingerprintId,
      userSessionId,
      action,
      resource,
      resourceId,
      description,
      status = "success",
      errorMessage,
      previousData,
      newData,
      metadata,
    } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing required field: action" }, { status: 400 });
    }

    // Always attribute the log entry to the authenticated caller and their own
    // tenant — never trust client-supplied userId/tenantId for who did what.
    const userId = appUser.id;
    const tenantId = appUser.tenantId;

    // Extract device info from request headers
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const ipAddress = getIpAddress(request);

    // Parse user agent for basic info
    const ua = userAgent.toLowerCase();
    let browser = "Unknown";
    if (ua.includes("chrome")) browser = "Chrome";
    else if (ua.includes("safari")) browser = "Safari";
    else if (ua.includes("firefox")) browser = "Firefox";
    else if (ua.includes("edg")) browser = "Edge";

    let os = "Unknown";
    if (ua.includes("windows")) os = "Windows";
    else if (ua.includes("mac")) os = "macOS";
    else if (ua.includes("linux")) os = "Linux";
    else if (ua.includes("iphone")) os = "iOS";
    else if (ua.includes("android")) os = "Android";

    let deviceType: "mobile" | "tablet" | "desktop" = "desktop";
    if (ua.includes("mobile") || ua.includes("iphone")) deviceType = "mobile";
    else if (ua.includes("tablet") || ua.includes("ipad")) deviceType = "tablet";

    // Create activity log entry
    await db.insert(activityLogs).values({
      tenantId,
      userId,
      deviceFingerprintId,
      userSessionId,
      action,
      resource,
      resourceId,
      description,
      status,
      errorMessage,
      ipAddress,
      userAgent,
      browser,
      os,
      deviceType,
      previousData,
      newData,
      metadata,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Activity logged successfully",
    });
  } catch (error) {
    console.error("[activity-log POST]", error);
    return NextResponse.json({ error: "Failed to log activity" }, { status: 500 });
  }
}

// Get activity logs with optional filters
export async function GET(request: NextRequest) {
  try {
    const appUser = await resolveCurrentUser(request);
    if (!appUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isSuperAdmin = String(appUser.role || "").toLowerCase() === "super_admin";

    const { searchParams } = new URL(request.url);
    const requestedTenantId = searchParams.get("tenantId");
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const resource = searchParams.get("resource") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");
    const hoursBack = parseInt(searchParams.get("hoursBack") || "24");

    // Non-super-admins may only ever see their own tenant's activity log.
    if (!isSuperAdmin && requestedTenantId && requestedTenantId !== appUser.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = isSuperAdmin ? requestedTenantId : appUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
    }

    // Build where conditions
    const conditions = [eq(activityLogs.tenantId, tenantId)];

    if (userId) {
      conditions.push(eq(activityLogs.userId, userId));
    }

    if (action) {
      conditions.push(eq(activityLogs.action, action));
    }

    if (resource) {
      conditions.push(eq(activityLogs.resource, resource));
    }

    // Add time filter
    const hoursAgo = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    conditions.push(gte(activityLogs.timestamp, hoursAgo));

    const logs = await db
      .select()
      .from(activityLogs)
      .where(and(...conditions))
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[activity-log GET]", error);
    return NextResponse.json({ error: "Failed to retrieve activity logs" }, { status: 500 });
  }
}
