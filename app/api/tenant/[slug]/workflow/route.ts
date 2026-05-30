import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import {
  getTenantWorkflowSettings,
  normalizeTenantWorkflowSettings,
  upsertTenantWorkflowSettings,
} from "@/lib/tenant-workflows";

function buildWorkflowOverview(settings: ReturnType<typeof normalizeTenantWorkflowSettings>) {
  const flags = [
    settings.autoConfirmAppointments,
    settings.reminderNotifications,
    settings.noShowAlerts,
    settings.followUpScheduling,
    settings.autoResultNotifications,
    settings.criticalValueAlerts,
    settings.resultReviewQueue,
    settings.autoArchiveOldResults,
    settings.autoGenerateInvoices,
    settings.paymentReminders,
    settings.insuranceClaimAutomation,
    settings.overdueAccountAlerts,
    settings.autoWriteOffSmallBalances,
    settings.monthlyBillingCycle,
    settings.autoEscalationAlerts,
    settings.emergencyTeamNotification,
    settings.ambulanceDispatchIntegration,
    settings.familyNotificationSystem,
    settings.emergencyLogGeneration,
    settings.postIncidentFollowUp,
  ];

  return {
    enabledAutomations: flags.filter(Boolean).length,
    disabledAutomations: flags.filter((value) => !value).length,
    customWorkflows: settings.customWorkflows.length,
    backupFrequency: settings.backupFrequency,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok || !access.tenant) return tenantAccessResponse(access);

    const settings = await getTenantWorkflowSettings(access.tenant.id);
    return NextResponse.json({
      tenant: { id: access.tenant.id, slug: access.tenant.slug, name: access.tenant.name },
      settings,
      overview: buildWorkflowOverview(settings),
    });
  } catch (error: any) {
    console.error("[tenant workflow:get]", error);
    return NextResponse.json({ error: error?.message || "Failed to load workflow settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok || !access.tenant) return tenantAccessResponse(access);
    if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const settings = normalizeTenantWorkflowSettings(body?.settings || body || {});
    await upsertTenantWorkflowSettings(access.tenant.id, settings, access.user?.id || null);
    await db.insert(auditLogs).values({
      tenantId: access.tenant.id,
      userId: access.user?.id || null,
      action: "tenant.workflow_updated",
      entity: "workflow",
      entityId: access.tenant.id,
      metadata: { settings },
    });

    return NextResponse.json({
      ok: true,
      settings,
      overview: buildWorkflowOverview(settings),
    });
  } catch (error: any) {
    console.error("[tenant workflow:put]", error);
    return NextResponse.json({ error: error?.message || "Failed to save workflow settings" }, { status: 500 });
  }
}
