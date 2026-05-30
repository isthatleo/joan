import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantSettings } from "@/lib/db/schema";

export type TenantSystemSettings = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  autoUpdates: boolean;
  telemetryEnabled: boolean;
  healthAlertsEnabled: boolean;
  cpuThreshold: number;
  memoryThreshold: number;
  diskThreshold: number;
  alertEmail: string;
  alertWebhook: string;
};

export const DEFAULT_TENANT_SYSTEM_SETTINGS: TenantSystemSettings = {
  maintenanceMode: false,
  maintenanceMessage: "",
  autoUpdates: false,
  telemetryEnabled: true,
  healthAlertsEnabled: true,
  cpuThreshold: 80,
  memoryThreshold: 85,
  diskThreshold: 90,
  alertEmail: "",
  alertWebhook: "",
};

function clampPercent(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(100, Math.round(parsed)));
}

export function normalizeTenantSystemSettings(value?: Partial<TenantSystemSettings> | Record<string, any> | null): TenantSystemSettings {
  const source = value || {};
  return {
    maintenanceMode: typeof source.maintenanceMode === "boolean" ? source.maintenanceMode : DEFAULT_TENANT_SYSTEM_SETTINGS.maintenanceMode,
    maintenanceMessage: typeof source.maintenanceMessage === "string" ? source.maintenanceMessage : DEFAULT_TENANT_SYSTEM_SETTINGS.maintenanceMessage,
    autoUpdates: typeof source.autoUpdates === "boolean" ? source.autoUpdates : DEFAULT_TENANT_SYSTEM_SETTINGS.autoUpdates,
    telemetryEnabled: typeof source.telemetryEnabled === "boolean" ? source.telemetryEnabled : DEFAULT_TENANT_SYSTEM_SETTINGS.telemetryEnabled,
    healthAlertsEnabled: typeof source.healthAlertsEnabled === "boolean" ? source.healthAlertsEnabled : DEFAULT_TENANT_SYSTEM_SETTINGS.healthAlertsEnabled,
    cpuThreshold: clampPercent(source.cpuThreshold, DEFAULT_TENANT_SYSTEM_SETTINGS.cpuThreshold),
    memoryThreshold: clampPercent(source.memoryThreshold, DEFAULT_TENANT_SYSTEM_SETTINGS.memoryThreshold),
    diskThreshold: clampPercent(source.diskThreshold, DEFAULT_TENANT_SYSTEM_SETTINGS.diskThreshold),
    alertEmail: typeof source.alertEmail === "string" ? source.alertEmail : DEFAULT_TENANT_SYSTEM_SETTINGS.alertEmail,
    alertWebhook: typeof source.alertWebhook === "string" ? source.alertWebhook : DEFAULT_TENANT_SYSTEM_SETTINGS.alertWebhook,
  };
}

export async function getTenantSystemSettings(tenantId: string) {
  const row = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "system")),
  });
  return normalizeTenantSystemSettings((row?.value as Record<string, any>) || {});
}

export async function upsertTenantSystemSettings(tenantId: string, value: TenantSystemSettings, updatedBy?: string | null) {
  const existing = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "system")),
  });
  if (existing) {
    await db.update(tenantSettings).set({ value, updatedAt: new Date(), updatedBy: updatedBy || null }).where(eq(tenantSettings.id, existing.id));
    return;
  }
  await db.insert(tenantSettings).values({ tenantId, key: "system", value, updatedBy: updatedBy || null });
}
