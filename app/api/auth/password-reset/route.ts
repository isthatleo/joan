import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordResets, roles, userRoles, users } from "@/lib/db/schema";
import { PasswordResetService } from "@/lib/services/password-reset.service";
import { OTPService } from "@/lib/services/otp.service";
import { z } from "zod";

const passwordResetService = new PasswordResetService();
const otpService = new OTPService();

const requestResetSchema = z.object({
  userId: z.string().uuid(),
});

const approveResetSchema = z.object({
  resetId: z.string().uuid(),
  approvalNotes: z.string().optional(),
});

const completeResetSchema = z.object({
  resetId: z.string().uuid(),
  token: z.string().min(1),
  newPassword: z.string().min(8),
  otpCode: z.string(),
});

const denyResetSchema = z.object({
  resetId: z.string().uuid(),
  reason: z.string().optional(),
});

async function resolveStaffUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null as any);
  if (!session?.user?.email) return null;
  const appUser = await db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
  });
  if (!appUser?.id) return null;

  const roleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, appUser.id))
    .catch(() => []);
  const assigned = new Set([appUser.role, ...roleRows.map((r) => r.roleName)].map((r) => String(r || "").toLowerCase()));

  return {
    appUser,
    isSuperAdmin: assigned.has("super_admin"),
    isHospitalAdmin: assigned.has("hospital_admin"),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // "complete" is performed by the end user themselves, using the reset token
    // that was sent to them out-of-band (email/SMS) plus their OTP — it does not
    // require a staff session, but it does require possession of that token.
    if (action === "complete") {
      const data = await request.json();
      const validated = completeResetSchema.parse(data);

      const resetRequest = await db.query.passwordResets.findFirst({
        where: eq(passwordResets.id, validated.resetId),
      });
      if (!resetRequest || !resetRequest.userId) {
        return NextResponse.json({ error: "Reset request not found" }, { status: 404 });
      }
      if (resetRequest.status !== "pending") {
        return NextResponse.json({ error: "This reset request is no longer pending" }, { status: 400 });
      }
      // The random token is the actual capability secret here — resetId alone is
      // an enumerable database id and must never be sufficient on its own.
      if (!resetRequest.token || resetRequest.token !== validated.token) {
        return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 401 });
      }

      const otpResult = await otpService.verifyOTP(resetRequest.userId, validated.otpCode, "password_reset");
      if (!otpResult.success) {
        return NextResponse.json({ error: otpResult.error }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(validated.newPassword, 12);
      const result = await passwordResetService.completeReset(validated.resetId, passwordHash);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: "Password reset completed successfully",
      });
    }

    // Every other action manages someone else's account and requires staff auth.
    const staff = await resolveStaffUser(request);
    if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!staff.isSuperAdmin && !staff.isHospitalAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "request") {
      const data = await request.json();
      const validated = requestResetSchema.parse(data);

      const targetUser = await db.query.users.findFirst({ where: eq(users.id, validated.userId) });
      if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (!staff.isSuperAdmin && targetUser.tenantId !== staff.appUser.tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const hasActive = await passwordResetService.hasActiveResetRequest(validated.userId);
      if (hasActive) {
        return NextResponse.json({ error: "User already has an active reset request" }, { status: 400 });
      }

      const resetRequest = await passwordResetService.requestPasswordReset(
        targetUser.tenantId || "",
        validated.userId,
        staff.appUser.id
      );

      return NextResponse.json({
        success: true,
        resetId: resetRequest.id,
      });
    }

    if (action === "approve") {
      const data = await request.json();
      const validated = approveResetSchema.parse(data);

      const existing = await db.query.passwordResets.findFirst({ where: eq(passwordResets.id, validated.resetId) });
      if (!existing) return NextResponse.json({ error: "Reset request not found" }, { status: 404 });
      if (!staff.isSuperAdmin && existing.tenantId !== staff.appUser.tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const result = await passwordResetService.approveResetRequest(
        validated.resetId,
        staff.appUser.id,
        validated.approvalNotes
      );

      if (!result.success) {
        return NextResponse.json(result, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: "Password reset approved. OTP generated.",
        resetId: validated.resetId,
        // OTP code is delivered via SMS/Email, never returned here.
      });
    }

    if (action === "deny") {
      const data = await request.json();
      const validated = denyResetSchema.parse(data);

      const existing = await db.query.passwordResets.findFirst({ where: eq(passwordResets.id, validated.resetId) });
      if (!existing) return NextResponse.json({ error: "Reset request not found" }, { status: 404 });
      if (!staff.isSuperAdmin && existing.tenantId !== staff.appUser.tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const result = await passwordResetService.denyResetRequest(validated.resetId, staff.appUser.id, validated.reason);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Failed to process password reset" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const staff = await resolveStaffUser(request);
    if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!staff.isSuperAdmin && !staff.isHospitalAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const requestedTenantId = searchParams.get("tenantId");
    const status = searchParams.get("status") as "pending" | "completed" | "expired" | undefined;

    if (!requestedTenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }
    if (!staff.isSuperAdmin && requestedTenantId !== staff.appUser.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resetRequests = await passwordResetService.getAllResetRequests(requestedTenantId, status);
    // Never leak the raw capability token in a listing response.
    const sanitized = resetRequests.map(({ token, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      requests: sanitized,
    });
  } catch (error) {
    console.error("Error fetching password resets:", error);
    return NextResponse.json(
      { error: "Failed to fetch password resets" },
      { status: 500 }
    );
  }
}
