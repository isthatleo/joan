import { NextRequest, NextResponse } from "next/server";
import { LabService } from "@/lib/services/lab.service";
import { auth } from "@/lib/auth";

const service = new LabService();

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await service.getLabTechnicianSettings(session.user.id);

    if (!settings) {
      // Return default settings
      return NextResponse.json({
        displayName: session.user.name || "",
        emailNotifications: true,
        labOrderAlerts: true,
        resultReadyAlerts: true,
        inventoryAlerts: true,
        theme: "light",
        itemsPerPage: 25,
        autoRefresh: true,
        refreshInterval: 30,
      });
    }

    return NextResponse.json(settings.settings);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    await service.updateLabTechnicianSettings(session.user.id, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

