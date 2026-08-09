import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userSessions, users } from "@/lib/db/schema";
import { getIpAddress, generateSessionToken } from "@/lib/fingerprinting";
import { and, desc, eq, gt, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";

export interface CreateSessionRequest {
  userId: string;
  tenantId?: string | null;
  deviceFingerprintId?: string;
}

async function resolveCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (!session?.user?.email) return null;

  return db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true, tenantId: true, role: true },
  });
}

// Create a new session
export async function POST(request: NextRequest) {
  try {
    const appUser = await resolveCurrentUser(request);
    if (!appUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateSessionRequest = await request.json();
    const { userId, tenantId, deviceFingerprintId } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (userId !== appUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const effectiveTenantId = tenantId || appUser.tenantId || null;

    const userAgent = request.headers.get("user-agent") || "Unknown";
    const ipAddress = getIpAddress(request);
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(userSessions).values({
      tenantId: effectiveTenantId,
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
    const appUser = await resolveCurrentUser(request);
    if (!appUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isSuperAdmin = String(appUser.role || "").toLowerCase() === "super_admin";

    const { searchParams } = new URL(request.url);
    const requestedTenantId = searchParams.get("tenantId");
    const userId = searchParams.get("userId");
    const action = searchParams.get("action"); // "active", "all"

    if (!isSuperAdmin && requestedTenantId && requestedTenantId !== appUser.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Non-admins may only ever list their own sessions.
    if (!isSuperAdmin && userId && userId !== appUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = isSuperAdmin ? requestedTenantId : appUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
    }

    const conditions = [eq(userSessions.tenantId, tenantId)];

    const scopedUserId = isSuperAdmin ? userId : appUser.id;
    if (scopedUserId) {
      conditions.push(eq(userSessions.userId, scopedUserId));
    }

    if (action !== "all") {
      conditions.push(eq(userSessions.isActive, true));
      // Only sessions that haven't expired
      conditions.push(gt(userSessions.expiresAt, new Date()));
    }

    // Never return the raw session token in a listing response.
    const sessions = await db
      .select({
        id: userSessions.id,
        tenantId: userSessions.tenantId,
        userId: userSessions.userId,
        deviceFingerprintId: userSessions.deviceFingerprintId,
        ipAddress: userSessions.ipAddress,
        userAgent: userSessions.userAgent,
        isActive: userSessions.isActive,
        lastActivityAt: userSessions.lastActivityAt,
        expiresAt: userSessions.expiresAt,
        logoutAt: userSessions.logoutAt,
        createdAt: userSessions.createdAt,
      })
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
    const appUser = await resolveCurrentUser(request);
    if (!appUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isSuperAdmin = String(appUser.role || "").toLowerCase() === "super_admin";

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const action = searchParams.get("action"); // "update_activity", "logout"

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const target = await db.query.userSessions.findFirst({ where: eq(userSessions.id, sessionId) });
    if (!target) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (!isSuperAdmin && target.userId !== appUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "logout") {
      await db
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
      await db
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

