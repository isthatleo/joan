import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantSettings } from "@/lib/db/schema";

export const DEFAULT_TENANT_SECURITY_SETTINGS = {
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
} as const;

export type TenantSecuritySettings = typeof DEFAULT_TENANT_SECURITY_SETTINGS;

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
