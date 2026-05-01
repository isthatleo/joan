import { NextRequest, NextResponse } from "next/server";
import { OTPService } from "@/lib/services/otp.service";
import { PasswordResetService } from "@/lib/services/password-reset.service";
import { z } from "zod";

const otpService = new OTPService();
const passwordResetService = new PasswordResetService();

const createOTPSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(["password_reset", "2fa", "email_verification"]),
  expiryMinutes: z.number().optional(),
});

const verifyOTPSchema = z.object({
  userId: z.string().uuid(),
  code: z.string(),
  type: z.enum(["password_reset", "2fa", "email_verification"]),
});

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "create") {
      const data = await request.json();
      const validated = createOTPSchema.parse(data);
      const otp = await otpService.createOTP(
        validated.tenantId,
        validated.userId,
        validated.type,
        validated.expiryMinutes
      );

      return NextResponse.json({
        success: true,
        otp: {
          id: otp.id,
          expiresAt: otp.expiresAt,
          type: otp.type,
          // Don't return the actual code to frontend, only confirmation
        },
      });
    }

    if (action === "verify") {
      const data = await request.json();
      const validated = verifyOTPSchema.parse(data);
      const result = await otpService.verifyOTP(
        validated.userId,
        validated.code,
        validated.type
      );

      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "record-failure") {
      const data = await request.json();
      const { userId, code, type } = z
        .object({
          userId: z.string().uuid(),
          code: z.string(),
          type: z.enum(["password_reset", "2fa", "email_verification"]),
        })
        .parse(data);

      const result = await otpService.recordFailedAttempt(userId, code, type);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("OTP error:", error);
    return NextResponse.json(
      { error: "Failed to process OTP request" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type") as
      | "password_reset"
      | "2fa"
      | "email_verification";

    if (!userId || !type) {
      return NextResponse.json(
        { error: "userId and type are required" },
        { status: 400 }
      );
    }

    const otp = await otpService.getActiveOTP(userId, type);
    return NextResponse.json({ otp: !!otp, expiresAt: otp?.expiresAt });
  } catch (error) {
    console.error("Error fetching OTP:", error);
    return NextResponse.json(
      { error: "Failed to fetch OTP" },
      { status: 500 }
    );
  }
}

