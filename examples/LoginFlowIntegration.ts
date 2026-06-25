// Example: Login Flow Integration
// This shows how to integrate device fingerprinting and activity logging in your auth flow

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getIpAddress } from "@/lib/fingerprinting";

// This would be in your login API route
export async function handleLoginWithTracking(request: NextRequest, email: string, password: string) {
  const ipAddress = getIpAddress(request);
  const userAgent = request.headers.get("user-agent") || "Unknown";

  try {
    // Verify credentials
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      // Log failed login attempt as security event
      await logSecurityEvent({
        tenantId: "unknown", // You might not have tenantId yet
        eventType: "failed_login_attempt",
        severity: "medium",
        description: `Failed login for unknown user (email: ${email})`,
        ipAddress,
        userAgent,
        metadata: {
          reason: "user_not_found",
          email,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        success: false,
        error: "Invalid credentials",
      };
    }

    // Verify password (this is pseudocode, implement your actual verification)
    const passwordValid = await verifyPassword(password, user.passwordHash);

    if (!passwordValid) {
      // Log failed login attempt
      await logSecurityEvent({
        tenantId: user.tenantId,
        userId: user.id,
        eventType: "failed_login_attempt",
        severity: "medium",
        description: "Failed login - invalid password",
        ipAddress,
        userAgent,
        metadata: {
          reason: "invalid_password",
          email,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        success: false,
        error: "Invalid credentials",
      };
    }

    // Password is valid, create session and fingerprint
    // 1. Get/create device fingerprint
    const fingerprintResponse = await createDeviceFingerprint({
      userId: user.id,
      tenantId: user.tenantId,
      userAgent,
      ipAddress,
      screenResolution: "1920x1080", // Get from client
      language: "en", // Get from client
      timezone: "UTC", // Get from client
    });

    const fingerprintId = fingerprintResponse.fingerprintId;

    // 2. Create user session
    const sessionResponse = await createUserSession({
      userId: user.id,
      tenantId: user.tenantId,
      deviceFingerprintId: fingerprintId,
      userAgent,
      ipAddress,
    });

    // 3. Log successful login activity
    await logActivity({
      userId: user.id,
      tenantId: user.tenantId,
      deviceFingerprintId: fingerprintId,
      userSessionId: sessionResponse.sessionId,
      action: "login",
      resource: "auth",
      description: "User login",
      status: "success",
      ipAddress,
      userAgent,
      metadata: {
        email,
        timestamp: new Date().toISOString(),
      },
    });

    // Update user's last seen time
    await db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, user.id));

    return {
      success: true,
      sessionToken: sessionResponse.sessionToken,
      userId: user.id,
      email: user.email,
      fingerprintId,
    };
  } catch (error) {
    console.error("Login error:", error);

    // Log the error as an activity log
    await logActivity({
      userId: "system",
      tenantId: "unknown",
      action: "login",
      resource: "auth",
      description: "Login error",
      status: "failure",
      errorMessage: (error as Error).message,
      ipAddress,
      userAgent,
      metadata: {
        email,
        error: (error as Error).message,
      },
    });

    return {
      success: false,
      error: "Login failed",
    };
  }
}

// Helper functions

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Implement your password verification logic
  // Example using bcrypt:
  // const bcrypt = require("bcryptjs");
  // return bcrypt.compare(password, hash);
  return true; // placeholder
}

async function createDeviceFingerprint(data: any) {
  const response = await fetch("https://joanhealth.tech//api/fingerprinting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

async function createUserSession(data: any) {
  const response = await fetch("https://joanhealth.tech//api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const sessionData = await response.json();
  return {
    sessionId: "placeholder", // Extract from response
    sessionToken: sessionData.sessionToken,
  };
}

async function logActivity(data: any) {
  await fetch("https://joanhealth.tech//api/activity-logging", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function logSecurityEvent(data: any) {
  await fetch("https://joanhealth.tech//api/security-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Example logout flow
export async function handleLogoutWithTracking(
  request: NextRequest,
  userId: string,
  tenantId: string,
  sessionId: string
) {
  const ipAddress = getIpAddress(request);
  const userAgent = request.headers.get("user-agent") || "Unknown";

  try {
    // 1. Close the session
    await fetch(`https://joanhealth.tech//api/sessions?sessionId=${sessionId}&action=logout`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
    });

    // 2. Log logout activity
    await logActivity({
      userId,
      tenantId,
      action: "logout",
      resource: "auth",
      description: "User logout",
      status: "success",
      ipAddress,
      userAgent,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false };
  }
}

// Example: Track sensitive actions
export async function trackSensitiveAction(
  userId: string,
  tenantId: string,
  action: string,
  resourceId: string,
  previousData?: any,
  newData?: any
) {
  await logActivity({
    userId,
    tenantId,
    action,
    resource: "sensitive_data",
    resourceId,
    description: `Sensitive action: ${action} on resource ${resourceId}`,
    previousData,
    newData,
    status: "success",
  });

  // Also check for anomalies or suspicious patterns
  await checkForAnomalies(userId, tenantId, action, resourceId);
}

async function checkForAnomalies(
  userId: string,
  tenantId: string,
  action: string,
  resourceId: string
) {
  // Example anomaly detection
  // This is a placeholder - implement your own logic

  // Check if user has multiple failed login attempts
  // Check if accessing resources from unusual locations
  // Check if accessing resources at unusual times
  // Check if accessing resources they don't normally access

  // If anomalies detected, log security event
  // Example:
  // await logSecurityEvent({
  //   tenantId,
  //   userId,
  //   eventType: "unusual_access_pattern",
  //   severity: "high",
  //   description: "Unusual access pattern detected",
  //   metadata: { action, resourceId },
  // });
}

