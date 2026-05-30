import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import { createTenantBackupSnapshot } from "@/lib/tenant-backups";
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

function buildOverview(settings: ReturnType<typeof normalizeTenantWorkflowSettings>) {
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
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
      await upsertTenantWorkflowSettings(access.tenant.id, next, access.user?.id || null);
      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.workflow_custom_created",
        entity: "workflow",
        entityId: access.tenant.id,
        metadata: { name },
      });
      return NextResponse.json({ ok: true, settings: next, overview: buildOverview(next), summary: buildSummary(next) });
    }

    if (action === "update-custom") {
      const id = String(body?.id || "");
      const status = body?.status === "active" || body?.status === "disabled" || body?.status === "draft" ? body.status : null;
      const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : null;
      if (!id) return NextResponse.json({ error: "Workflow id is required" }, { status: 400 });
      const existing = current.customWorkflows.find((item) => item.id === id);
      if (!existing) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
      const next = normalizeTenantWorkflowSettings({
        ...current,
        customWorkflows: current.customWorkflows.map((item) => item.id === id ? { ...item, name: name || item.name, status: status || item.status } : item),
      });
      await upsertTenantWorkflowSettings(access.tenant.id, next, access.user?.id || null);
      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.workflow_custom_updated",
        entity: "workflow",
        entityId: access.tenant.id,
        metadata: { id, name: name || existing.name, status: status || existing.status },
      });
      return NextResponse.json({ ok: true, settings: next, overview: buildOverview(next), summary: buildSummary(next) });
    }

    if (action === "duplicate-custom") {
      const id = String(body?.id || "");
      const existing = current.customWorkflows.find((item) => item.id === id);
      if (!existing) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
      const duplicate = {
        ...existing,
        id: crypto.randomUUID(),
        name: `${existing.name} Copy`,
        status: "draft" as const,
        createdAt: new Date().toISOString(),
      };
      const next = normalizeTenantWorkflowSettings({ ...current, customWorkflows: [...current.customWorkflows, duplicate] });
      await upsertTenantWorkflowSettings(access.tenant.id, next, access.user?.id || null);
      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.workflow_custom_duplicated",
        entity: "workflow",
        entityId: access.tenant.id,
        metadata: { sourceId: id, duplicateId: duplicate.id },
      });
      return NextResponse.json({ ok: true, settings: next, overview: buildOverview(next), summary: buildSummary(next) });
    }

    if (action === "delete-custom") {
      const id = String(body?.id || "");
      const existing = current.customWorkflows.find((item) => item.id === id);
      if (!existing) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
      const next = normalizeTenantWorkflowSettings({
        ...current,
        customWorkflows: current.customWorkflows.filter((item) => item.id !== id),
      });
      await upsertTenantWorkflowSettings(access.tenant.id, next, access.user?.id || null);
      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.workflow_custom_deleted",
        entity: "workflow",
        entityId: access.tenant.id,
        metadata: { id, name: existing.name },
      });
      return NextResponse.json({ ok: true, settings: next, overview: buildOverview(next), summary: buildSummary(next) });
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
        overview: buildOverview(current),
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
        customWorkflows: `${current.customWorkflows.filter((item) => item.status === "active").length} active custom workflow(s) will execute.`,
        backups: isWorkflowAutomationAllowed(current, "dataBackupEnabled")
          ? `Tenant backups will run ${current.backupFrequency}.`
          : "Tenant backups are disabled.",
      };
      return NextResponse.json({ ok: true, settings: current, overview: buildOverview(current), summary, simulated });
    }

    if (action === "run-backup") {
      if (!isWorkflowAutomationAllowed(current, "dataBackupEnabled")) {
        return NextResponse.json({ error: "Tenant backup automation is disabled" }, { status: 400 });
      }

      const result = await createTenantBackupSnapshot(access.tenant.id, access.user?.id || null);
      await db.insert(auditLogs).values({
        tenantId: access.tenant.id,
        userId: access.user?.id || null,
        action: "tenant.workflow_backup_created",
        entity: "workflow_backup",
        entityId: access.tenant.id,
        metadata: result.manifest,
      });

      return NextResponse.json({
        ok: true,
        settings: current,
        overview: buildOverview(current),
        summary: buildSummary(current),
        ...result,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    console.error("[tenant workflow action]", error);
    return NextResponse.json({ error: error?.message || "Workflow action failed" }, { status: 500 });
  }
}
