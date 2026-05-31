import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantSettings } from "@/lib/db/schema";

export type TenantWorkflowSettings = {
  automationEnabled: boolean;
  appointmentReminders: boolean;
  patientNotifications: boolean;
  staffNotifications: boolean;
  prescriptionAlerts: boolean;
  billingAutomation: boolean;
  reportGeneration: boolean;
  dataBackupEnabled: boolean;
  backupFrequency: "daily" | "weekly" | "monthly";
  autoConfirmAppointments: boolean;
  reminderNotifications: boolean;
  noShowAlerts: boolean;
  followUpScheduling: boolean;
  autoResultNotifications: boolean;
  criticalValueAlerts: boolean;
  resultReviewQueue: boolean;
  autoArchiveOldResults: boolean;
  autoGenerateInvoices: boolean;
  paymentReminders: boolean;
  insuranceClaimAutomation: boolean;
  overdueAccountAlerts: boolean;
  autoWriteOffSmallBalances: boolean;
  monthlyBillingCycle: boolean;
  autoEscalationAlerts: boolean;
  emergencyTeamNotification: boolean;
  ambulanceDispatchIntegration: boolean;
  familyNotificationSystem: boolean;
  emergencyLogGeneration: boolean;
  postIncidentFollowUp: boolean;
  customWorkflows: Array<{
    id: string;
    name: string;
    status: "draft" | "active" | "disabled";
    createdAt: string;
  }>;
};

export const DEFAULT_TENANT_WORKFLOW_SETTINGS: TenantWorkflowSettings = {
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
};

export function normalizeTenantWorkflowSettings(value?: Partial<TenantWorkflowSettings> | Record<string, any> | null): TenantWorkflowSettings {
  const source = value || {};
  const backupFrequency = ["daily", "weekly", "monthly"].includes(String(source.backupFrequency)) ? String(source.backupFrequency) : DEFAULT_TENANT_WORKFLOW_SETTINGS.backupFrequency;
  return {
    ...DEFAULT_TENANT_WORKFLOW_SETTINGS,
    ...source,
    automationEnabled: source.automationEnabled !== false,
    appointmentReminders: source.appointmentReminders !== false,
    patientNotifications: source.patientNotifications !== false,
    staffNotifications: source.staffNotifications !== false,
    prescriptionAlerts: source.prescriptionAlerts !== false,
    billingAutomation: Boolean(source.billingAutomation),
    reportGeneration: Boolean(source.reportGeneration),
    dataBackupEnabled: source.dataBackupEnabled !== false,
    backupFrequency: backupFrequency as TenantWorkflowSettings["backupFrequency"],
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

export async function upsertTenantWorkflowSettings(tenantId: string, value: TenantWorkflowSettings, updatedBy?: string | null) {
  const existing = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "workflow")),
  });

  if (existing) {
    await db.update(tenantSettings).set({ value, updatedAt: new Date(), updatedBy: updatedBy || null }).where(eq(tenantSettings.id, existing.id));
    return;
  }

  await db.insert(tenantSettings).values({ tenantId, key: "workflow", value, updatedBy: updatedBy || null });
}

export function isWorkflowAutomationAllowed(settings: TenantWorkflowSettings, ...flags: Array<keyof TenantWorkflowSettings>) {
  if (!settings.automationEnabled) return false;
  return flags.every((flag) => Boolean(settings[flag]));
}

export async function isTenantWorkflowAutomationAllowed(tenantId: string, ...flags: Array<keyof TenantWorkflowSettings>) {
  const settings = await getTenantWorkflowSettings(tenantId);
  return isWorkflowAutomationAllowed(settings, ...flags);
}
