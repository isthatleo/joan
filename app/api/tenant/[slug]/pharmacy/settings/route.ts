import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;

    // Mock pharmacist settings
    const settings = {
      notificationsEnabled: true,
      emailAlerts: true,
      lowStockThreshold: 25,
      criticalStockThreshold: 10,
      autoReorder: true,
      reorderLeadTime: 3,
      dispensingQueueRefresh: 10,
      dashboardLayout: "default" as const,
      showAnalytics: true,
      prescriptionValidation: true,
      interactionChecks: true,
      requireSecondVerification: false,
      workingHours: {
        startTime: "08:00",
        endTime: "18:00",
      },
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;
    const settings = await request.json();

    // Mock saving settings
    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      settings,
    });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

