import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, userSettings } from "@/lib/db/schema";
import { createRecoveryCodes, encryptTotpSecret, hashRecoveryCode } from "@/lib/totp";

export type UserTwoFactorSettings = {
  enabled: boolean;
  method: "authenticator";
  secretEncrypted?: string;
  pendingSecretEncrypted?: string;
  backupCodes?: Array<{ hash: string; usedAt: string | null; createdAt: string }>;
  enabledAt?: string | null;
  lastVerifiedAt?: string | null;
};

export async function getRawUserSettings(userId: string) {
  const row = await db.query.userSettings.findFirst({ where: eq(userSettings.userId, userId) });
  return (row?.settings && typeof row.settings === "object" ? row.settings : {}) as Record<string, any>;
}

export async function saveRawUserSettings(userId: string, settings: Record<string, any>) {
  const existing = await db.query.userSettings.findFirst({ where: eq(userSettings.userId, userId) });
  if (existing) {
    await db.update(userSettings).set({ settings, updatedAt: new Date() }).where(eq(userSettings.id, existing.id));
    return;
  }
  await db.insert(userSettings).values({ userId, settings });
}

export function getTwoFactorSettings(settings: Record<string, any>): UserTwoFactorSettings | null {
  const value = settings?.security?.twoFactor;
  if (!value || typeof value !== "object") return null;
  return value as UserTwoFactorSettings;
}

export async function getUserTwoFactor(userId: string) {
  return getTwoFactorSettings(await getRawUserSettings(userId));
}

export async function setUserTwoFactor(userId: string, twoFactor: UserTwoFactorSettings | null) {
  const current = await getRawUserSettings(userId);
  const security = { ...(current.security || {}) };
  if (twoFactor) security.twoFactor = twoFactor;
  else delete security.twoFactor;
  await saveRawUserSettings(userId, { ...current, security });
  return security.twoFactor || null;
}

export function issueBackupCodes() {
  const rawCodes = createRecoveryCodes();
  const storedCodes = rawCodes.map((code) => ({
    hash: hashRecoveryCode(code),
    usedAt: null,
    createdAt: new Date().toISOString(),
  }));
  return { rawCodes, storedCodes };
}

export async function createPendingTotpSetup(userId: string, secret: string) {
  const current = (await getUserTwoFactor(userId)) || { enabled: false, method: "authenticator" as const };
  return setUserTwoFactor(userId, {
    ...current,
    enabled: current.enabled === true,
    method: "authenticator",
    pendingSecretEncrypted: encryptTotpSecret(secret),
  });
}

export async function consumeRecoveryCode(userId: string, code: string) {
  const current = await getUserTwoFactor(userId);
  if (!current?.enabled || !Array.isArray(current.backupCodes)) return false;
  const codeHash = hashRecoveryCode(code);
  const match = current.backupCodes.find((item) => item.hash === codeHash && !item.usedAt);
  if (!match) return false;
  const updatedCodes = current.backupCodes.map((item) => item.hash === codeHash ? { ...item, usedAt: new Date().toISOString() } : item);
  await setUserTwoFactor(userId, { ...current, backupCodes: updatedCodes, lastVerifiedAt: new Date().toISOString() });
  return true;
}

export async function listTenantTwoFactorEnrollment(tenantId: string) {
  const rows = await db
    .select({
      userId: userSettings.userId,
      settings: userSettings.settings,
    })
    .from(userSettings);

  const tenantUsers = await db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId), isNull(users.deletedAt)),
    columns: { id: true, email: true, fullName: true, role: true, isActive: true },
  });

  const settingsByUser = new Map(rows.map((row) => [row.userId, row.settings as Record<string, any>]));
  return tenantUsers.map((user) => {
    const twoFactor = getTwoFactorSettings(settingsByUser.get(user.id) || {});
    return {
      id: user.id,
      name: user.fullName || user.email,
      email: user.email,
      role: user.role || "staff",
      isActive: user.isActive !== false,
      enrolled: twoFactor?.enabled === true,
      enabledAt: twoFactor?.enabledAt || null,
      lastVerifiedAt: twoFactor?.lastVerifiedAt || null,
      backupCodesRemaining: Array.isArray(twoFactor?.backupCodes) ? twoFactor.backupCodes.filter((item) => !item.usedAt).length : 0,
    };
  });
}
