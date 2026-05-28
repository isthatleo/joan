import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { NotificationService } from "@/lib/notification-service";
import { getTenantWorkflowSettings, isWorkflowAutomationAllowed } from "@/lib/tenant-workflows";

export async function POST(request: NextRequest) {
  try {
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
