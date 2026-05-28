import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantSettings } from "@/lib/db/schema";

export const DEFAULT_TENANT_WORKFLOW_SETTINGS = {
  automationEnabled: true,
  appointmentReminders: true,
  patientNotifications: true,
  staffNotifications: true,
  prescriptionAlerts: true,
  billingAutomation: false,
  reportGeneration: false,
  dataBackupEnabled: true,
  backupFrequency: "daily",
  autoConfirmAppointments: true,
  reminderNotifications: true,
  noShowAlerts: true,
  followUpScheduling: false,
  autoResultNotifications: true,
  criticalValueAlerts: true,
  resultReviewQueue: false,
  autoArchiveOldResults: true,
  autoGenerateInvoices: true,
  paymentReminders: true,
  insuranceClaimAutomation: false,
  overdueAccountAlerts: true,
  autoWriteOffSmallBalances: false,
  monthlyBillingCycle: true,
  autoEscalationAlerts: true,
  emergencyTeamNotification: true,
  ambulanceDispatchIntegration: false,
  familyNotificationSystem: true,
  emergencyLogGeneration: true,
  postIncidentFollowUp: false,
  customWorkflows: [] as Array<{
    id: string;
    name: string;
    status: "draft" | "active" | "disabled";
    createdAt: string;
  }>,
} as const;

export type TenantWorkflowSettings = typeof DEFAULT_TENANT_WORKFLOW_SETTINGS;

export function normalizeTenantWorkflowSettings(value?: Partial<TenantWorkflowSettings> | Record<string, any> | null): TenantWorkflowSettings {
  return {
    ...DEFAULT_TENANT_WORKFLOW_SETTINGS,
    ...(value || {}),
    customWorkflows: Array.isArray(value?.customWorkflows)
      ? value!.customWorkflows.map((item: any) => ({
          id: String(item?.id || ""),
          name: String(item?.name || "Custom workflow"),
          status: item?.status === "active" || item?.status === "disabled" ? item.status : "draft",
          createdAt: String(item?.createdAt || new Date().toISOString()),
        })).filter((item: any) => item.id && item.name)
      : [],
  };
}

export async function getTenantWorkflowSettings(tenantId: string) {
  const row = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "workflow")),
  });
  return normalizeTenantWorkflowSettings((row?.value as Record<string, any>) || {});
}

export async function upsertTenantWorkflowSettings(tenantId: string, value: TenantWorkflowSettings) {
  const existing = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "workflow")),
  });

  if (existing) {
    await db.update(tenantSettings).set({ value, updatedAt: new Date() }).where(eq(tenantSettings.id, existing.id));
    return;
  }

  await db.insert(tenantSettings).values({ tenantId, key: "workflow", value });
}

export function isWorkflowAutomationAllowed(settings: TenantWorkflowSettings, ...flags: Array<keyof TenantWorkflowSettings>) {
  if (!settings.automationEnabled) return false;
  return flags.every((flag) => Boolean(settings[flag]));
}

export async function isTenantWorkflowAutomationAllowed(tenantId: string, ...flags: Array<keyof TenantWorkflowSettings>) {
  const settings = await getTenantWorkflowSettings(tenantId);
  return isWorkflowAutomationAllowed(settings, ...flags);
}
