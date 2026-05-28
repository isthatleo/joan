import { NextRequest, NextResponse } from "next/server";
import { createEmergencyAlert, getEmergencyAlerts, getTenantBySlug } from "@/lib/receptionist/data";
import { sendTenantCollaborationAlert } from "@/lib/integrations/collaboration";
import { getTenantWorkflowSettings, isWorkflowAutomationAllowed } from "@/lib/tenant-workflows";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const alerts = await getEmergencyAlerts(tenant.id);
    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Failed to fetch emergency alerts:", error);
    return NextResponse.json({ error: "Failed to fetch emergency alerts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const payload = await request.json();
    const alert = await createEmergencyAlert(tenant.id, payload);
    const workflow = await getTenantWorkflowSettings(tenant.id);
    const announcement = [
      `Emergency level: ${alert.severity || payload?.severity || "unknown"}`,
      `Location: ${alert.location || payload?.location || "unspecified"}`,
      `Type: ${alert.type || payload?.type || "general"}`,
    ].join("\n");
    const collaborationResults = isWorkflowAutomationAllowed(workflow, "emergencyTeamNotification", "staffNotifications")
      ? await sendTenantCollaborationAlert(tenant.id, announcement, { title: "Emergency alert raised" })
      : [];
    return NextResponse.json({
      ...alert,
      collaborationResults,
      workflowSuppressed: !isWorkflowAutomationAllowed(workflow, "emergencyTeamNotification", "staffNotifications"),
    });
  } catch (error) {
    console.error("Failed to create emergency alert:", error);
    return NextResponse.json({ error: "Failed to create emergency alert" }, { status: 500 });
  }
}
