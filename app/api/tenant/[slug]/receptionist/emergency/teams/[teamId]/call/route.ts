import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug, updateEmergencyAlert } from "@/lib/receptionist/data";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; teamId: string }> },
) {
  try {
    const { slug, teamId } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { alertId } = await request.json();
    if (alertId) {
      await updateEmergencyAlert(tenant.id, alertId, {
        status: "responding",
        assignedTeam: teamId,
        eta: "3 minutes",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Emergency team called successfully",
      teamId,
      alertId,
    });
  } catch (error) {
    console.error("Failed to call emergency team:", error);
    return NextResponse.json({ error: "Failed to call emergency team" }, { status: 500 });
  }
}
