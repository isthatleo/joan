import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantSettings } from "@/lib/db/schema";
import { getCachedTenantSecurityValue } from "@/lib/tenant-cache";

export type TenantSecuritySettings = {
  twoFactorRequired: boolean;
  sessionTimeout: number;
  ipWhitelistEnabled: boolean;
  ipWhitelist: string[];
  passwordExpirationEnabled: boolean;
  passwordExpirationDays: number;
  loginAttemptLimitsEnabled: boolean;
  maxFailedLoginAttempts: number;
  passwordMinLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialCharacters: boolean;
  roleBasedAccessControl: boolean;
  auditAllAccess: boolean;
  encryptDataAtRest: boolean;
  encryptDataInTransit: boolean;
  automatedBackups: boolean;
  backupEncryption: boolean;
  dbKeyRotationDays: number;
  apiKeyRotationDays: number;
  fileKeyRotationDays: number;
  intrusionDetection: boolean;
  failedLoginAlerts: boolean;
  dataBreachAlerts: boolean;
  complianceMonitoring: boolean;
  incidentResponsePlanActive: boolean;
  incidentResponseLastReviewedAt: string;
  incidentPrimaryContact: string;
  incidentEmergencyPhone: string;
  automatedVulnerabilityScanning: boolean;
  thirdPartySecurityReviews: boolean;
  lastPenetrationTestAt: string;
  lastPenetrationTestStatus: string;
  nextSecurityAuditAt: string;
  nextSecurityAuditStatus: string;
  generatedSecurityKeys: Array<{ id: string; label: string; createdAt: string; maskedValue: string }>;
};

export const DEFAULT_TENANT_SECURITY_SETTINGS: TenantSecuritySettings = {
  twoFactorRequired: false,
  sessionTimeout: 60,
  ipWhitelistEnabled: false,
  ipWhitelist: [] as string[],
  passwordExpirationEnabled: false,
  passwordExpirationDays: 90,
  loginAttemptLimitsEnabled: true,
  maxFailedLoginAttempts: 5,
  passwordMinLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialCharacters: true,
  roleBasedAccessControl: true,
  auditAllAccess: true,
  encryptDataAtRest: true,
  encryptDataInTransit: true,
  automatedBackups: true,
  backupEncryption: true,
  dbKeyRotationDays: 30,
  apiKeyRotationDays: 90,
  fileKeyRotationDays: 30,
  intrusionDetection: true,
  failedLoginAlerts: true,
  dataBreachAlerts: true,
  complianceMonitoring: true,
  incidentResponsePlanActive: true,
  incidentResponseLastReviewedAt: "",
  incidentPrimaryContact: "",
  incidentEmergencyPhone: "",
  automatedVulnerabilityScanning: true,
  thirdPartySecurityReviews: true,
  lastPenetrationTestAt: "",
  lastPenetrationTestStatus: "passed",
  nextSecurityAuditAt: "",
  nextSecurityAuditStatus: "scheduled",
  generatedSecurityKeys: [] as Array<{ id: string; label: string; createdAt: string; maskedValue: string }>,
};

export async function getTenantSecuritySettings(tenantId: string) {
  const [row] = await db
    .select()
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "security")))
    .limit(1);

  return {
    ...DEFAULT_TENANT_SECURITY_SETTINGS,
    ...((row?.value as Partial<TenantSecuritySettings> | undefined) || {}),
    ipWhitelist: Array.isArray((row?.value as any)?.ipWhitelist)
      ? (row?.value as any).ipWhitelist.map(String)
      : DEFAULT_TENANT_SECURITY_SETTINGS.ipWhitelist,
    generatedSecurityKeys: Array.isArray((row?.value as any)?.generatedSecurityKeys)
      ? (row?.value as any).generatedSecurityKeys
      : DEFAULT_TENANT_SECURITY_SETTINGS.generatedSecurityKeys,
  } satisfies TenantSecuritySettings;
}

export async function getCachedTenantSecuritySettings(tenantId: string) {
  const value = await getCachedTenantSecurityValue(tenantId);

  return {
    ...DEFAULT_TENANT_SECURITY_SETTINGS,
    ...(value || {}),
    ipWhitelist: Array.isArray((value as any)?.ipWhitelist)
      ? (value as any).ipWhitelist.map(String)
      : DEFAULT_TENANT_SECURITY_SETTINGS.ipWhitelist,
    generatedSecurityKeys: Array.isArray((value as any)?.generatedSecurityKeys)
      ? (value as any).generatedSecurityKeys
      : DEFAULT_TENANT_SECURITY_SETTINGS.generatedSecurityKeys,
  } satisfies TenantSecuritySettings;
}

export function normalizeTenantSecuritySettings(value: Record<string, any> | null | undefined) {
  const source = value || {};
  const numberInRange = (input: unknown, fallback: number, min: number, max: number) => {
    const next = Number(input);
    if (!Number.isFinite(next)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(next)));
  };

  return {
    ...DEFAULT_TENANT_SECURITY_SETTINGS,
    ...source,
    sessionTimeout: numberInRange(source.sessionTimeout, DEFAULT_TENANT_SECURITY_SETTINGS.sessionTimeout, 15, 480),
    passwordExpirationDays: numberInRange(source.passwordExpirationDays, DEFAULT_TENANT_SECURITY_SETTINGS.passwordExpirationDays, 30, 365),
    maxFailedLoginAttempts: numberInRange(source.maxFailedLoginAttempts, DEFAULT_TENANT_SECURITY_SETTINGS.maxFailedLoginAttempts, 3, 20),
    passwordMinLength: numberInRange(source.passwordMinLength, DEFAULT_TENANT_SECURITY_SETTINGS.passwordMinLength, 6, 128),
    dbKeyRotationDays: numberInRange(source.dbKeyRotationDays, DEFAULT_TENANT_SECURITY_SETTINGS.dbKeyRotationDays, 30, 365),
    apiKeyRotationDays: numberInRange(source.apiKeyRotationDays, DEFAULT_TENANT_SECURITY_SETTINGS.apiKeyRotationDays, 0, 365),
    fileKeyRotationDays: numberInRange(source.fileKeyRotationDays, DEFAULT_TENANT_SECURITY_SETTINGS.fileKeyRotationDays, 30, 365),
    ipWhitelist: Array.isArray(source.ipWhitelist) ? source.ipWhitelist.map(String).map((item) => item.trim()).filter(Boolean) : [],
    generatedSecurityKeys: Array.isArray(source.generatedSecurityKeys) ? source.generatedSecurityKeys.slice(0, 10) : [],
  } satisfies TenantSecuritySettings;
}

export async function saveTenantSecuritySettings(tenantId: string, value: Record<string, any>, updatedBy?: string | null) {
  const settings = normalizeTenantSecuritySettings(value);
  const existing = await db
    .select()
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "security")))
    .limit(1);

  if (existing[0]) {
    await db
      .update(tenantSettings)
      .set({ value: settings, updatedAt: new Date(), updatedBy: updatedBy || null })
      .where(eq(tenantSettings.id, existing[0].id));
  } else {
    await db.insert(tenantSettings).values({ tenantId, key: "security", value: settings, updatedBy: updatedBy || null });
  }

  return settings;
}

function ipv4ToInt(ip: string) {
  const parts = ip.split(".").map((segment) => Number.parseInt(segment, 10));
  if (parts.length !== 4 || parts.some((segment) => Number.isNaN(segment) || segment < 0 || segment > 255)) {
    return null;
  }

  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function matchesCidr(ip: string, cidr: string) {
  const [base, rawPrefix] = cidr.split("/");
  const prefix = Number.parseInt(rawPrefix, 10);
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  if (ipInt == null || baseInt == null || Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  return (ipInt & mask) === (baseInt & mask);
}

export function normalizeClientIp(raw: string | null | undefined) {
  if (!raw) return "";
  return raw.split(",")[0]?.trim() || "";
}

export function isIpAllowed(ip: string, allowlist: string[]) {
  if (!ip) return false;
  if (allowlist.length === 0) return false;

  return allowlist.some((entry) => {
    const normalized = String(entry || "").trim();
    if (!normalized) return false;
    if (normalized.includes("/")) return matchesCidr(ip, normalized);
    return normalized === ip;
  });
}
