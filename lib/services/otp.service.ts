import { db } from "@/lib/db";
import { otps } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export class OTPService {
  /**
   * Generate a random OTP code
   */
  private generateOTPCode(length: number = 6): string {
    const digits = "0123456789";
    let code = "";
    for (let i = 0; i < length; i++) {
      code += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return code;
  }

  /**
   * Create and save OTP for user
   */
  async createOTP(
    tenantId: string,
    userId: string,
    type: "password_reset" | "2fa" | "email_verification",
    expiryMinutes: number = 15
  ) {
    const code = this.generateOTPCode(6);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Check if user already has an unused OTP of this type
    const existingOTP = await db.query.otps.findFirst({
      where: and(eq(otps.userId, userId), eq(otps.type, type), eq(otps.isUsed, false)),
    });

    // If exists, delete the old one
    if (existingOTP) {
      await db.delete(otps).where(eq(otps.id, existingOTP.id));
    }

    // Create new OTP
    const result = await db.insert(otps).values({
      tenantId,
      userId,
      code,
      type,
      expiresAt,
      attempts: 0,
      maxAttempts: 3,
      isUsed: false,
    }).returning();

    return result[0];
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(userId: string, code: string, type: "password_reset" | "2fa" | "email_verification") {
    const otp = await db.query.otps.findFirst({
      where: and(
        eq(otps.userId, userId),
        eq(otps.code, code),
        eq(otps.type, type),
        eq(otps.isUsed, false)
      ),
    });

    if (!otp) {
      return { success: false, error: "Invalid OTP code" };
    }

    if (new Date() > otp.expiresAt) {
      return { success: false, error: "OTP has expired" };
    }

    if (otp.attempts >= otp.maxAttempts) {
      return { success: false, error: "Too many failed attempts. OTP has been locked." };
    }

    // Mark as used
    await db.update(otps).set({ isUsed: true, usedAt: new Date() }).where(eq(otps.id, otp.id));

    return { success: true, otp };
  }

  /**
   * Record failed OTP attempt
   */
  async recordFailedAttempt(userId: string, code: string, type: "password_reset" | "2fa" | "email_verification") {
    const otp = await db.query.otps.findFirst({
      where: and(eq(otps.userId, userId), eq(otps.code, code), eq(otps.type, type)),
    });

    if (otp && !otp.isUsed) {
      const newAttempts = otp.attempts + 1;
      await db
        .update(otps)
        .set({ attempts: newAttempts })
        .where(eq(otps.id, otp.id));

      if (newAttempts >= otp.maxAttempts) {
        return { success: false, error: "Too many failed attempts. OTP has been locked." };
      }
    }

    return { success: false, error: "Invalid OTP code" };
  }

  /**
   * Get active OTP for user
   */
  async getActiveOTP(userId: string, type: "password_reset" | "2fa" | "email_verification") {
    return db.query.otps.findFirst({
      where: and(
        eq(otps.userId, userId),
        eq(otps.type, type),
        eq(otps.isUsed, false)
      ),
    });
  }

  /**
   * Delete expired OTPs
   */
  async cleanupExpiredOTPs() {
    const now = new Date();
    return db
      .delete(otps)
      .where(eq(otps.isUsed, false));
  }
}

