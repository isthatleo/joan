import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deviceFingerprints } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  parseUserAgent,
  generateFingerprint,
  getIpAddress,
  checkVpnProxy,
  checkBotOrSpider,
  getLocationFromIp,
  generateSessionToken,
} from "@/lib/fingerprinting";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tenantId, screenResolution, language, timezone } = body;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Missing userId or tenantId" }, { status: 400 });
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
    let existingDevice = await db.query.deviceFingerprints.findFirst({
      where: and(
        eq(deviceFingerprints.fingerprint, fingerprintId),
        eq(deviceFingerprints.userId, userId),
        eq(deviceFingerprints.tenantId, tenantId)
      ),
    });

    if (existingDevice) {
      // Update last seen time
      await db
        .update(deviceFingerprints)
        .set({
          lastSeenAt: new Date(),
          ipAddress,
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
    const newDevice = await db.insert(deviceFingerprints).values({
      tenantId,
      userId,
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
    });

    return NextResponse.json({
      success: true,
      fingerprintId: newDevice.id,
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const tenantId = searchParams.get("tenantId");

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Missing userId or tenantId" }, { status: 400 });
    }

    const devices = await db.query.deviceFingerprints.findMany({
      where: and(
        eq(deviceFingerprints.userId, userId),
        eq(deviceFingerprints.tenantId, tenantId)
      ),
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

