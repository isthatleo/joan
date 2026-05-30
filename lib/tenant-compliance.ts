import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantSettings } from "@/lib/db/schema";

export const DEFAULT_TENANT_COMPLIANCE_SETTINGS: {
  hipaaMode: boolean;
  gdprMode: boolean;
  whoGuidelineMode: boolean;
  minimumNecessaryAccess: boolean;
  auditLoggingEnabled: boolean;
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  phiAccessControls: boolean;
  breachNotificationSystem: boolean;
  dataSubjectRights: boolean;
  consentManagement: boolean;
  dataPortability: boolean;
  privacyByDesign: boolean;
  trainingTracking: boolean;
  annualHipaaTraining: boolean;
  gdprAwarenessTraining: boolean;
  securityAwarenessTraining: boolean;
  automatedTrainingReminders: boolean;
  certificationManagement: boolean;
  businessAssociateAgreementTracking: boolean;
  incidentResponsePlanActive: boolean;
  crossBorderTransferReview: boolean;
  whoClinicalSafetyChecklist: boolean;
  interoperabilityStandardsCheck: boolean;
  patientRecordsRetentionYears: number;
  auditLogsRetentionYears: number;
  billingRecordsRetentionYears: number;
  consentRecordsRetentionYears: number;
  nextComplianceReviewAt: string;
  lastComplianceReviewAt: string;
  lastComplianceScore: number;
} = {
  hipaaMode: true,
  gdprMode: false,
  whoGuidelineMode: true,
  minimumNecessaryAccess: true,
  auditLoggingEnabled: true,
  encryptionAtRest: true,
  encryptionInTransit: true,
  phiAccessControls: true,
  breachNotificationSystem: true,
  dataSubjectRights: true,
  consentManagement: true,
  dataPortability: true,
  privacyByDesign: true,
  trainingTracking: true,
  annualHipaaTraining: true,
  gdprAwarenessTraining: true,
  securityAwarenessTraining: true,
  automatedTrainingReminders: true,
  certificationManagement: false,
  businessAssociateAgreementTracking: true,
  incidentResponsePlanActive: true,
  crossBorderTransferReview: false,
  whoClinicalSafetyChecklist: true,
  interoperabilityStandardsCheck: true,
  patientRecordsRetentionYears: 7,
  auditLogsRetentionYears: 7,
  billingRecordsRetentionYears: 7,
  consentRecordsRetentionYears: 7,
  nextComplianceReviewAt: "",
  lastComplianceReviewAt: "",
  lastComplianceScore: 0,
};

export type TenantComplianceSettings = typeof DEFAULT_TENANT_COMPLIANCE_SETTINGS;

function asPositiveInt(value: unknown, fallback: number) {
  const next = typeof value === "string" ? Number(value) : value;
  return typeof next === "number" && Number.isFinite(next) && next > 0 ? Math.min(50, Math.floor(next)) : fallback;
}

export function normalizeTenantComplianceSettings(
  value?: Partial<TenantComplianceSettings> | Record<string, any> | null,
): TenantComplianceSettings {
  return {
    ...DEFAULT_TENANT_COMPLIANCE_SETTINGS,
    ...(value || {}),
    patientRecordsRetentionYears: asPositiveInt(value?.patientRecordsRetentionYears, DEFAULT_TENANT_COMPLIANCE_SETTINGS.patientRecordsRetentionYears),
    auditLogsRetentionYears: asPositiveInt(value?.auditLogsRetentionYears, DEFAULT_TENANT_COMPLIANCE_SETTINGS.auditLogsRetentionYears),
    billingRecordsRetentionYears: asPositiveInt(value?.billingRecordsRetentionYears, DEFAULT_TENANT_COMPLIANCE_SETTINGS.billingRecordsRetentionYears),
    consentRecordsRetentionYears: asPositiveInt(value?.consentRecordsRetentionYears, DEFAULT_TENANT_COMPLIANCE_SETTINGS.consentRecordsRetentionYears),
    lastComplianceScore: typeof value?.lastComplianceScore === "number" ? value.lastComplianceScore : DEFAULT_TENANT_COMPLIANCE_SETTINGS.lastComplianceScore,
  };
}

export async function getTenantComplianceSettings(tenantId: string) {
  const row = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "compliance")),
  });
  return normalizeTenantComplianceSettings((row?.value as Record<string, any>) || {});
}

export async function upsertTenantComplianceSettings(tenantId: string, value: TenantComplianceSettings, updatedBy?: string | null) {
  const existing = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "compliance")),
  });

  if (existing) {
    await db.update(tenantSettings).set({ value, updatedAt: new Date(), updatedBy: updatedBy || null }).where(eq(tenantSettings.id, existing.id));
    return;
  }

  await db.insert(tenantSettings).values({ tenantId, key: "compliance", value, updatedBy: updatedBy || null });
}
