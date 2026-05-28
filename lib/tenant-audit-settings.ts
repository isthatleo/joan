import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantSettings } from "@/lib/db/schema";

export const DEFAULT_TENANT_AUDIT_SETTINGS = {
  retentionDays: 365,
  logAuthentication: true,
  logClinicalActions: true,
  logFinancialActions: true,
  logConfigurationChanges: true,
  exportFormat: "json",
  anomalyDetection: true,
  immutableSnapshots: true,
} as const;

export type TenantAuditSettings = {
  retentionDays: number;
  logAuthentication: boolean;
  logClinicalActions: boolean;
  logFinancialActions: boolean;
  logConfigurationChanges: boolean;
  exportFormat: string;
  anomalyDetection: boolean;
  immutableSnapshots: boolean;
};

export function normalizeTenantAuditSettings(value?: Partial<TenantAuditSettings> | Record<string, any> | null): TenantAuditSettings {
  const source = value || {};
  return {
    retentionDays: typeof source.retentionDays === "number" && Number.isFinite(source.retentionDays) ? Math.max(30, Math.floor(source.retentionDays)) : DEFAULT_TENANT_AUDIT_SETTINGS.retentionDays,
    logAuthentication: typeof source.logAuthentication === "boolean" ? source.logAuthentication : DEFAULT_TENANT_AUDIT_SETTINGS.logAuthentication,
    logClinicalActions: typeof source.logClinicalActions === "boolean" ? source.logClinicalActions : DEFAULT_TENANT_AUDIT_SETTINGS.logClinicalActions,
    logFinancialActions: typeof source.logFinancialActions === "boolean" ? source.logFinancialActions : DEFAULT_TENANT_AUDIT_SETTINGS.logFinancialActions,
    logConfigurationChanges: typeof source.logConfigurationChanges === "boolean" ? source.logConfigurationChanges : DEFAULT_TENANT_AUDIT_SETTINGS.logConfigurationChanges,
    exportFormat: typeof source.exportFormat === "string" && source.exportFormat.trim() ? source.exportFormat.trim() : DEFAULT_TENANT_AUDIT_SETTINGS.exportFormat,
    anomalyDetection: typeof source.anomalyDetection === "boolean" ? source.anomalyDetection : DEFAULT_TENANT_AUDIT_SETTINGS.anomalyDetection,
    immutableSnapshots: typeof source.immutableSnapshots === "boolean" ? source.immutableSnapshots : DEFAULT_TENANT_AUDIT_SETTINGS.immutableSnapshots,
  };
}

export async function getTenantAuditSettings(tenantId: string) {
  const row = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "audit")),
  });
  return normalizeTenantAuditSettings((row?.value as Record<string, any>) || {});
}

export async function upsertTenantAuditSettings(tenantId: string, value: TenantAuditSettings) {
  const existing = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "audit")),
  });
  if (existing) {
    await db.update(tenantSettings).set({ value, updatedAt: new Date() }).where(eq(tenantSettings.id, existing.id));
    return;
  }
  await db.insert(tenantSettings).values({ tenantId, key: "audit", value });
}
