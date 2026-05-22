import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userSessions, deviceFingerprints } from "@/lib/db/schema";
import { getIpAddress, generateSessionToken } from "@/lib/fingerprinting";
import { and, eq, desc, gt } from "drizzle-orm";

export interface CreateSessionRequest {
  userId: string;
  tenantId: string;
  deviceFingerprintId?: string;
}

// Create a new session
export async function POST(request: NextRequest) {
  try {
    const body: CreateSessionRequest = await request.json();
    const { userId, tenantId, deviceFingerprintId } = body;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Missing userId or tenantId" }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent") || "Unknown";
    const ipAddress = getIpAddress(request);
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await db.insert(userSessions).values({
      tenantId,
      userId,
      deviceFingerprintId,
      sessionToken,
      ipAddress,
      userAgent,
      isActive: true,
      lastActivityAt: new Date(),
      expiresAt,
      metadata: {
        createdAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      sessionToken,
      expiresAt,
    });
  } catch (error) {
    console.error("[sessions POST]", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

// Get active sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const userId = searchParams.get("userId");
    const action = searchParams.get("action"); // "active", "all"

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
    }

    const conditions = [eq(userSessions.tenantId, tenantId)];

    if (userId) {
      conditions.push(eq(userSessions.userId, userId));
    }

    if (action !== "all") {
      conditions.push(eq(userSessions.isActive, true));
      // Only sessions that haven't expired
      conditions.push(gt(userSessions.expiresAt, new Date()));
    }

    const sessions = await db
      .select()
      .from(userSessions)
      .where(and(...conditions))
      .orderBy(desc(userSessions.lastActivityAt));

    return NextResponse.json({
      success: true,
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error("[sessions GET]", error);
    return NextResponse.json({ error: "Failed to retrieve sessions" }, { status: 500 });
  }
}

// PUT: Update session activity or logout
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const action = searchParams.get("action"); // "update_activity", "logout"

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    if (action === "logout") {
      const session = await db
        .update(userSessions)
        .set({
          isActive: false,
          logoutAt: new Date(),
        })
        .where(eq(userSessions.id, sessionId));

      return NextResponse.json({
        success: true,
        message: "Session closed",
      });
    } else {
      // Update last activity
      const session = await db
        .update(userSessions)
        .set({
          lastActivityAt: new Date(),
        })
        .where(eq(userSessions.id, sessionId));

      return NextResponse.json({
        success: true,
        message: "Session activity updated",
      });
    }
  } catch (error) {
    console.error("[sessions PUT]", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}

