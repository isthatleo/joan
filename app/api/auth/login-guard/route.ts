import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantSettings, tenants, userSettings, users } from "@/lib/db/schema";
import { mergeUserSettings } from "@/lib/user-settings";
import { getTenantSecuritySettings } from "@/lib/tenant-security";

async function getTenantBySlug(slug?: string | null) {
  if (!slug) return null;
  return db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
}

async function findUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: and(ilike(users.email, email), isNull(users.deletedAt)),
    columns: { id: true, email: true, tenantId: true, role: true, fullName: true },
  });
}

async function getUserMergedSettings(userId: string) {
  const record = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });
  return mergeUserSettings(record?.settings || {});
}

async function persistUserMergedSettings(userId: string, settings: any) {
  await db
    .insert(userSettings)
    .values({
      userId,
      settings,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        settings,
        updatedAt: new Date(),
      },
    });
}

function getPasswordExpiryInfo(passwordLastChanged: string, passwordExpirationEnabled: boolean, passwordExpirationDays: number) {
  if (!passwordExpirationEnabled || !passwordLastChanged) {
    return { expired: false, expiresAt: null as string | null };
  }
  const changedAt = new Date(passwordLastChanged);
  if (Number.isNaN(changedAt.getTime())) {
    return { expired: false, expiresAt: null as string | null };
  }
  const expiresAt = new Date(changedAt.getTime() + passwordExpirationDays * 24 * 60 * 60 * 1000);
  return {
    expired: Date.now() >= expiresAt.getTime(),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "");
  const email = String(body?.email || "").trim().toLowerCase();
  const tenantSlug = typeof body?.tenantSlug === "string" ? body.tenantSlug.trim().toLowerCase() : null;

  if (!action || !email) {
    return NextResponse.json({ error: "Action and email are required" }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (!user?.id) {
    if (action === "precheck") {
      return NextResponse.json({ allowed: true });
    }
    return NextResponse.json({ ok: true });
  }

  const tenant = tenantSlug ? await getTenantBySlug(tenantSlug) : (user.tenantId ? await db.query.tenants.findFirst({ where: eq(tenants.id, user.tenantId) }) : null);
  const tenantId = tenant?.id || user.tenantId || null;
  const tenantSecurity = tenantId ? await getTenantSecuritySettings(tenantId) : null;
  const mergedSettings = await getUserMergedSettings(user.id);
  const lockoutUntil = mergedSettings.security.lockoutUntil ? new Date(mergedSettings.security.lockoutUntil) : null;
  const isLocked = !!lockoutUntil && !Number.isNaN(lockoutUntil.getTime()) && lockoutUntil.getTime() > Date.now();
  const expiry = getPasswordExpiryInfo(
    mergedSettings.security.passwordLastChanged,
    Boolean(tenantSecurity?.passwordExpirationEnabled),
    Number(tenantSecurity?.passwordExpirationDays || 90)
  );

  if (action === "precheck") {
    if (isLocked) {
      return NextResponse.json({
        allowed: false,
        reason: "locked",
        lockoutUntil: lockoutUntil?.toISOString() || null,
      });
    }
    return NextResponse.json({
      allowed: true,
      passwordExpired: expiry.expired,
      passwordExpiresAt: expiry.expiresAt,
      tenantSlug: tenant?.slug || tenantSlug,
    });
  }

  if (action === "record-failure") {
    const currentAttempts = Number(mergedSettings.security.failedLoginAttempts || 0) + 1;
    const maxAttempts = Number(tenantSecurity?.maxFailedLoginAttempts || 5);
    const loginLimitsEnabled = tenantSecurity?.loginAttemptLimitsEnabled !== false;
    const nextSettings = mergeUserSettings({
      ...mergedSettings,
      security: {
        ...mergedSettings.security,
        failedLoginAttempts: currentAttempts,
        lockoutUntil: loginLimitsEnabled && currentAttempts >= maxAttempts
          ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
          : mergedSettings.security.lockoutUntil,
      },
    });
    await persistUserMergedSettings(user.id, nextSettings);
    return NextResponse.json({
      ok: true,
      failedLoginAttempts: currentAttempts,
      locked: loginLimitsEnabled && currentAttempts >= maxAttempts,
      lockoutUntil: nextSettings.security.lockoutUntil || null,
    });
  }

  if (action === "record-success") {
    const nextSettings = mergeUserSettings({
      ...mergedSettings,
      security: {
        ...mergedSettings.security,
        failedLoginAttempts: 0,
        lockoutUntil: "",
        passwordLastChanged: mergedSettings.security.passwordLastChanged || new Date().toISOString(),
        forcePasswordChange: expiry.expired ? true : mergedSettings.security.forcePasswordChange,
      },
    });
    await persistUserMergedSettings(user.id, nextSettings);
    return NextResponse.json({
      ok: true,
      passwordExpired: expiry.expired,
      passwordExpiresAt: expiry.expiresAt,
      userId: user.id,
      tenantSlug: tenant?.slug || tenantSlug,
    });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
