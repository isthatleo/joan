import { db } from "@/lib/db";
import { passwordResets, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { OTPService } from "./otp.service";
import crypto from "crypto";

const otpService = new OTPService();

export class PasswordResetService {
  /**
   * Request password reset (initiated by user or admin)
   */
  async requestPasswordReset(
    tenantId: string,
    userId: string,
    requestedByUserId?: string
  ) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const result = await db
      .insert(passwordResets)
      .values({
        tenantId,
        userId,
        requestedBy: requestedByUserId || null,
        status: "pending",
        token,
        expiresAt,
      })
      .returning();

    return result[0];
  }

  /**
   * Generate OTP for password reset request
   */
  async generateResetOTP(tenantId: string, userId: string) {
    const otp = await otpService.createOTP(tenantId, userId, "password_reset", 15);
    return otp;
  }

  /**
   * Get pending reset requests for a user
   */
  async getPendingResets(userId: string) {
    return db.query.passwordResets.findMany({
      where: and(
        eq(passwordResets.userId, userId),
        eq(passwordResets.status, "pending")
      ),
    });
  }

  /**
   * Get all reset requests for admin review
   */
  async getAllResetRequests(tenantId: string, status?: "pending" | "completed" | "expired") {
    const conditions: any[] = [eq(passwordResets.tenantId, tenantId)];

    if (status) {
      conditions.push(eq(passwordResets.status, status));
    }

    return db.query.passwordResets.findMany({
      where: and(...conditions),
    });
  }

  /**
   * Approve password reset request and send OTP to user
   */
  async approveResetRequest(
    resetId: string,
    approvedByUserId: string,
    approvalNotes?: string
  ) {
    const resetRequest = await db.query.passwordResets.findFirst({
      where: eq(passwordResets.id, resetId),
    });

    if (!resetRequest) {
      return { success: false, error: "Reset request not found" };
    }

    // Generate OTP for the user
    const otp = await this.generateResetOTP(resetRequest.tenantId, resetRequest.userId);

    // Update reset status
    await db
      .update(passwordResets)
      .set({
        status: "pending",
        approvedBy: approvedByUserId,
        approvalNotes,
        updatedAt: new Date(),
      })
      .where(eq(passwordResets.id, resetId));

    return {
      success: true,
      otp,
      resetRequest: { ...resetRequest, approvedBy: approvedByUserId },
    };
  }

  /**
   * Complete password reset after OTP verification and new password set
   */
  async completeReset(resetId: string, newPasswordHash: string) {
    const resetRequest = await db.query.passwordResets.findFirst({
      where: eq(passwordResets.id, resetId),
    });

    if (!resetRequest) {
      return { success: false, error: "Reset request not found" };
    }

    // Check if expired
    if (new Date() > resetRequest.expiresAt) {
      await db
        .update(passwordResets)
        .set({ status: "expired" })
        .where(eq(passwordResets.id, resetId));
      return { success: false, error: "Reset request has expired" };
    }

    // Update user password
    await db
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, resetRequest.userId));

    // Mark reset as completed
    await db
      .update(passwordResets)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(passwordResets.id, resetId));

    return { success: true };
  }

  /**
   * Deny password reset request
   */
  async denyResetRequest(resetId: string, deniedByUserId: string, reason?: string) {
    await db
      .update(passwordResets)
      .set({
        status: "expired",
        approvalNotes: reason || "Denied by admin",
        updatedAt: new Date(),
      })
      .where(eq(passwordResets.id, resetId));

    return { success: true };
  }

  /**
   * Check if user has active reset request
   */
  async hasActiveResetRequest(userId: string) {
    const activeRequest = await db.query.passwordResets.findFirst({
      where: and(
        eq(passwordResets.userId, userId),
        eq(passwordResets.status, "pending")
      ),
    });

    return !!activeRequest;
  }
}

