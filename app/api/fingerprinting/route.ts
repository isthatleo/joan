import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deviceFingerprints, users } from "@/lib/db/schema";
import { eq, and, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  parseUserAgent,
  generateFingerprint,
  getIpAddress,
  checkVpnProxy,
  checkBotOrSpider,
  getLocationFromIp,
  generateSessionToken,
} from "@/lib/fingerprinting";

async function resolveCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (!session?.user?.email) return null;
  return db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true, tenantId: true, email: true },
  });
}

export async function POST(request: NextRequest) {
  try {
    const appUser = await resolveCurrentUser(request);
    if (!appUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, tenantId, screenResolution, language, timezone } = body;
    const effectiveUserId = userId || appUser.id;
    const effectiveTenantId = tenantId || appUser.tenantId || null;

    if (effectiveUserId !== appUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Extract device info from request
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const ipAddress = getIpAddress(request);

    const deviceInfo = parseUserAgent(userAgent);
    const { isVpn, isProxy } = await checkVpnProxy(ipAddress);
    const isBotOrSpider = checkBotOrSpider(userAgent);
    const location = await getLocationFromIp(ipAddress);

    // Generate fingerprint
    const fingerprintId = await generateFingerprint({
      ...deviceInfo,
      screenResolution,
      language,
      timezone,
    });

    // Check if device already exists
    const existingDevice = await db.query.deviceFingerprints.findFirst({
      where: effectiveTenantId
        ? and(
            eq(deviceFingerprints.fingerprint, fingerprintId),
            eq(deviceFingerprints.userId, effectiveUserId),
            eq(deviceFingerprints.tenantId, effectiveTenantId)
          )
        : and(
            eq(deviceFingerprints.fingerprint, fingerprintId),
            eq(deviceFingerprints.userId, effectiveUserId),
            isNull(deviceFingerprints.tenantId)
          ),
    });

    if (existingDevice) {
      // Update last seen time
      await db
        .update(deviceFingerprints)
        .set({
          lastSeenAt: new Date(),
          ...location,
        })
        .where(eq(deviceFingerprints.id, existingDevice.id));

      return NextResponse.json({
        success: true,
        fingerprintId: existingDevice.id,
        isNewDevice: false,
        fingerprint: fingerprintId,
      });
    }

    // Create new device fingerprint record
    const [newDevice] = await db.insert(deviceFingerprints).values({
      tenantId: effectiveTenantId,
      userId: effectiveUserId,
      fingerprint: fingerprintId,
      userAgent,
      browser: deviceInfo.browser,
      browserVersion: deviceInfo.browserVersion,
      os: deviceInfo.os,
      osVersion: deviceInfo.osVersion,
      deviceType: deviceInfo.deviceType,
      ipAddress,
      country: location.country,
      city: location.city,
      timezone: location.timezone || timezone,
      screenResolution,
      language,
      isVpn,
      isProxy,
      isBotOrSpider,
      metadata: { timestamp: new Date().toISOString() },
    }).returning({ id: deviceFingerprints.id });

    return NextResponse.json({
      success: true,
      fingerprintId: newDevice?.id,
      isNewDevice: true,
      fingerprint: fingerprintId,
    });
  } catch (error) {
    console.error("[fingerprint POST]", error);
    return NextResponse.json({ error: "Failed to process fingerprint" }, { status: 500 });
  }
}

// Get device fingerprints for a user
export async function GET(request: NextRequest) {
  try {
    const appUser = await resolveCurrentUser(request);
    if (!appUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || appUser.id;
    const tenantId = searchParams.get("tenantId");

    if (userId !== appUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const conditions = [eq(deviceFingerprints.userId, userId)];
    if (tenantId) conditions.push(eq(deviceFingerprints.tenantId, tenantId));

    const devices = await db.query.deviceFingerprints.findMany({
      where: and(...conditions),
    });

    return NextResponse.json({
      success: true,
      devices,
      count: devices.length,
    });
  } catch (error) {
    console.error("[fingerprint GET]", error);
    return NextResponse.json({ error: "Failed to retrieve fingerprints" }, { status: 500 });
  }
}

