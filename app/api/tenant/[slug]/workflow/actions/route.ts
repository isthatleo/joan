import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import {
  getTenantWorkflowSettings,
  isWorkflowAutomationAllowed,
  normalizeTenantWorkflowSettings,
  upsertTenantWorkflowSettings,
} from "@/lib/tenant-workflows";

function buildSummary(settings: ReturnType<typeof normalizeTenantWorkflowSettings>) {
  return {
    appointmentAutomation: {
      autoConfirmAppointments: isWorkflowAutomationAllowed(settings, "autoConfirmAppointments"),
      reminderNotifications: isWorkflowAutomationAllowed(settings, "appointmentReminders", "reminderNotifications", "patientNotifications"),
      noShowAlerts: isWorkflowAutomationAllowed(settings, "noShowAlerts", "staffNotifications"),
      followUpScheduling: isWorkflowAutomationAllowed(settings, "followUpScheduling"),
    },
    labAutomation: {
      autoResultNotifications: isWorkflowAutomationAllowed(settings, "autoResultNotifications", "patientNotifications"),
      criticalValueAlerts: isWorkflowAutomationAllowed(settings, "criticalValueAlerts", "staffNotifications"),
      resultReviewQueue: isWorkflowAutomationAllowed(settings, "resultReviewQueue"),
      autoArchiveOldResults: isWorkflowAutomationAllowed(settings, "autoArchiveOldResults"),
    },
    billingAutomation: {
      autoGenerateInvoices: isWorkflowAutomationAllowed(settings, "billingAutomation", "autoGenerateInvoices"),
      paymentReminders: isWorkflowAutomationAllowed(settings, "billingAutomation", "paymentReminders", "patientNotifications"),
      insuranceClaimAutomation: isWorkflowAutomationAllowed(settings, "billingAutomation", "insuranceClaimAutomation"),
      overdueAccountAlerts: isWorkflowAutomationAllowed(settings, "billingAutomation", "overdueAccountAlerts", "staffNotifications"),
      autoWriteOffSmallBalances: isWorkflowAutomationAllowed(settings, "billingAutomation", "autoWriteOffSmallBalances"),
      monthlyBillingCycle: isWorkflowAutomationAllowed(settings, "billingAutomation", "monthlyBillingCycle"),
    },
    emergencyAutomation: {
      autoEscalationAlerts: isWorkflowAutomationAllowed(settings, "autoEscalationAlerts", "staffNotifications"),
      emergencyTeamNotification: isWorkflowAutomationAllowed(settings, "emergencyTeamNotification", "staffNotifications"),
      ambulanceDispatchIntegration: isWorkflowAutomationAllowed(settings, "ambulanceDispatchIntegration"),
      familyNotificationSystem: isWorkflowAutomationAllowed(settings, "familyNotificationSystem", "patientNotifications"),
      emergencyLogGeneration: isWorkflowAutomationAllowed(settings, "emergencyLogGeneration"),
      postIncidentFollowUp: isWorkflowAutomationAllowed(settings, "postIncidentFollowUp"),
    },
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);
  if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "");

  const current = await getTenantWorkflowSettings(access.tenant.id);

  if (action === "create-custom") {
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Workflow name is required" }, { status: 400 });
    const next = normalizeTenantWorkflowSettings({
      ...current,
      customWorkflows: [
        ...current.customWorkflows,
        {
          id: crypto.randomUUID(),
          name,
          status: "draft",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    await upsertTenantWorkflowSettings(access.tenant.id, next);
    await db.insert(auditLogs).values({
      tenantId: access.tenant.id,
      userId: access.user?.id || null,
      action: "tenant.workflow_custom_created",
      entity: "workflow",
      entityId: access.tenant.id,
      metadata: { name },
    });
    return NextResponse.json({ ok: true, settings: next, summary: buildSummary(next) });
  }

  if (action === "export") {
    await db.insert(auditLogs).values({
      tenantId: access.tenant.id,
      userId: access.user?.id || null,
      action: "tenant.workflow_exported",
      entity: "workflow",
      entityId: access.tenant.id,
      metadata: { exportedAt: new Date().toISOString() },
    });
    return NextResponse.json({
      tenant: { id: access.tenant.id, slug: access.tenant.slug, name: access.tenant.name },
      exportedAt: new Date().toISOString(),
      settings: current,
      summary: buildSummary(current),
    });
  }

  if (action === "simulate") {
    const summary = buildSummary(current);
    const simulated = {
      appointmentAutomation: summary.appointmentAutomation.reminderNotifications
        ? "Appointment reminder jobs will run."
        : "Appointment reminder jobs are suppressed.",
      billingAutomation: summary.billingAutomation.autoGenerateInvoices
        ? "Automatic invoice generation is enabled."
        : "Automatic invoice generation is disabled.",
      reportGeneration: isWorkflowAutomationAllowed(current, "reportGeneration")
        ? "Scheduled report generation is enabled."
        : "Scheduled report generation is disabled.",
      emergencyEscalation: summary.emergencyAutomation.autoEscalationAlerts
        ? "Critical emergencies will auto-escalate."
        : "Critical emergencies will require manual escalation.",
    };
    return NextResponse.json({ ok: true, settings: current, summary, simulated });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
