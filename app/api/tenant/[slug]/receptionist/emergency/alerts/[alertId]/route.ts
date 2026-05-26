import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug, updateEmergencyAlert } from "@/lib/receptionist/data";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; alertId: string }> },
) {
  try {
    const { slug, alertId } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const patch = await request.json();
    const alert = await updateEmergencyAlert(tenant.id, alertId, patch);
    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error("Failed to update emergency alert:", error);
    return NextResponse.json({ error: "Failed to update emergency alert" }, { status: 500 });
  }
}
