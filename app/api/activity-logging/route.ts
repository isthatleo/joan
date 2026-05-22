import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";
import { getIpAddress } from "@/lib/fingerprinting";
import { and, eq, desc, gte } from "drizzle-orm";

export interface LogActivityRequest {
  userId: string;
  tenantId: string;
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

export async function POST(request: NextRequest) {
  try {
    const body: LogActivityRequest = await request.json();
    const {
      userId,
      tenantId,
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

    if (!userId || !tenantId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: userId, tenantId, action" },
        { status: 400 }
      );
    }

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
    const log = await db.insert(activityLogs).values({
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
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");
    const resource = searchParams.get("resource");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");
    const hoursBack = parseInt(searchParams.get("hoursBack") || "24");

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

