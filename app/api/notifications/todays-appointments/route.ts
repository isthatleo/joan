import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { NotificationService } from "@/lib/notification-service";
import { getTenantWorkflowSettings, isWorkflowAutomationAllowed } from "@/lib/tenant-workflows";

export async function POST(request: NextRequest) {
  try {
    // This is a cron-triggered bulk-notification job (potentially platform-wide),
    // not a user-facing action — require the same fail-closed worker secret
    // pattern used elsewhere rather than leaving it callable by anyone.
    const secret = process.env.APPOINTMENT_REMINDER_WORKER_SECRET;
    if (!secret) {
      console.error("[todays-appointments] APPOINTMENT_REMINDER_WORKER_SECRET is not set — refusing to run.");
      return NextResponse.json({ error: "Appointment reminder worker is not configured" }, { status: 503 });
    }
    const provided = request.headers.get("x-appointment-reminder-secret") || "";
    const providedBuf = Buffer.from(provided);
    const secretBuf = Buffer.from(secret);
    const matches = providedBuf.length === secretBuf.length && crypto.timingSafeEqual(providedBuf, secretBuf);
    if (!matches) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";

    if (slug) {
      const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
      if (!tenant) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
      }

      const workflow = await getTenantWorkflowSettings(tenant.id);
      if (!isWorkflowAutomationAllowed(workflow, "appointmentReminders", "reminderNotifications", "patientNotifications")) {
        return NextResponse.json({
          success: true,
          suppressed: true,
          message: "Appointment reminder workflow is disabled for this tenant",
          notifications: 0,
        });
      }
    }

    // Generate notifications for today's appointments
    const notifications = await NotificationService.notifyTodaysAppointments();

    return NextResponse.json({
      success: true,
      message: `Generated ${notifications.length} appointment notifications`,
      notifications: notifications.length
    });
  } catch (error) {
    console.error("Error generating today's appointment notifications:", error);
    return NextResponse.json(
      { error: "Failed to generate appointment notifications" },
      { status: 500 }
    );
  }
}
