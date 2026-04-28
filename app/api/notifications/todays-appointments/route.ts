import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/lib/notification-service";

export async function POST(request: NextRequest) {
  try {
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
