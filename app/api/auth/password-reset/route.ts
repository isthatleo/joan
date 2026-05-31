import { NextRequest, NextResponse } from "next/server";
import { PasswordResetService } from "@/lib/services/password-reset.service";
import { OTPService } from "@/lib/services/otp.service";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const passwordResetService = new PasswordResetService();
const otpService = new OTPService();

const requestResetSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  requestedByUserId: z.string().uuid().optional(),
});

const approveResetSchema = z.object({
  resetId: z.string().uuid(),
  approvedByUserId: z.string().uuid(),
  approvalNotes: z.string().optional(),
});

const completeResetSchema = z.object({
  resetId: z.string().uuid(),
  newPassword: z.string().min(8),
  otpCode: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "request") {
      const data = await request.json();
      const validated = requestResetSchema.parse(data);

      // Check if user already has active reset
      const hasActive = await passwordResetService.hasActiveResetRequest(validated.userId);
      if (hasActive) {
        return NextResponse.json(
          { error: "User already has an active reset request" },
          { status: 400 }
        );
      }

      const resetRequest = await passwordResetService.requestPasswordReset(
        validated.tenantId,
        validated.userId,
        validated.requestedByUserId
      );

      return NextResponse.json({
        success: true,
        resetId: resetRequest.id,
      });
    }

    if (action === "approve") {
      const data = await request.json();
      const validated = approveResetSchema.parse(data);

      const result = await passwordResetService.approveResetRequest(
        validated.resetId,
        validated.approvedByUserId,
        validated.approvalNotes
      );

      if (!result.success) {
        return NextResponse.json(result, { status: 404 });
      }

      // Return OTP details for sending to user
      return NextResponse.json({
        success: true,
        message: "Password reset approved. OTP generated.",
        resetId: validated.resetId,
        // OTP code should be sent via SMS/Email, not returned here in production
      });
    }

    if (action === "complete") {
      const data = await request.json();
      const validated = completeResetSchema.parse(data);

      // Verify OTP first
      const otpResult = await otpService.verifyOTP(
        "", // We need to get userId from reset request
        validated.otpCode,
        "password_reset"
      );

      if (!otpResult.success) {
        return NextResponse.json(
          { error: otpResult.error },
          { status: 400 }
        );
      }

      // Hash the new password (would need bcrypt in production)
      const passwordHash = validated.newPassword; // In production, hash this

      const result = await passwordResetService.completeReset(
        validated.resetId,
        passwordHash
      );

      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: "Password reset completed successfully",
      });
    }

    if (action === "deny") {
      const data = await request.json();
      const { resetId, deniedByUserId, reason } = z
        .object({
          resetId: z.string().uuid(),
          deniedByUserId: z.string().uuid(),
          reason: z.string().optional(),
        })
        .parse(data);

      const result = await passwordResetService.denyResetRequest(
        resetId,
        deniedByUserId,
        reason
      );

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
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
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const status = searchParams.get("status") as
      | "pending"
      | "completed"
      | "expired"
      | undefined;

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    const resetRequests = await passwordResetService.getAllResetRequests(
      tenantId,
      status
    );

    return NextResponse.json({
      success: true,
      requests: resetRequests,
    });
  } catch (error) {
    console.error("Error fetching password resets:", error);
    return NextResponse.json(
      { error: "Failed to fetch password resets" },
      { status: 500 }
    );
  }
}

