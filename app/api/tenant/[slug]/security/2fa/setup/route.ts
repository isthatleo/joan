import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, tenants, users } from "@/lib/db/schema";
import { getTenantSecuritySettings } from "@/lib/tenant-security";
import { createPendingTotpSetup, getUserTwoFactor, issueBackupCodes, setUserTwoFactor } from "@/lib/user-two-factor";
import { createTotpProvisioningUri, decryptTotpSecret, encryptTotpSecret, generateTotpSecret, verifyTotpCode } from "@/lib/totp";

async function getContext(request: NextRequest, slug: string) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
  if (!tenant) return { error: NextResponse.json({ error: "Tenant not found" }, { status: 404 }) };

  const user = await db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true, email: true, fullName: true, tenantId: true },
  });
  if (!user?.id || user.tenantId !== tenant.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { tenant, user };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const context = await getContext(request, slug);
    if ("error" in context) return context.error;

    const security = await getTenantSecuritySettings(context.tenant.id);
    const current = await getUserTwoFactor(context.user.id);
    if (current?.enabled && current.secretEncrypted) {
      return NextResponse.json({
        required: security.twoFactorRequired,
        enrolled: true,
        setupRequired: false,
        message: "Authenticator app 2FA is already enabled for this account.",
      });
    }

    const secret = generateTotpSecret();
    await createPendingTotpSetup(context.user.id, secret);
    const otpauthUrl = createTotpProvisioningUri({
      secret,
      issuer: context.tenant.name || "Joan Healthcare OS",
      account: context.user.email,
    });

    return NextResponse.json({
      required: security.twoFactorRequired,
      enrolled: false,
      setupRequired: true,
      secret,
      otpauthUrl,
      qrCodeUrl: `/api/tenant/${slug}/security/2fa/qr`,
    });
  } catch (error: any) {
    console.error("[tenant 2fa setup:get]", error);
    return NextResponse.json({ error: error?.message || "Failed to start authenticator setup" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const context = await getContext(request, slug);
    if ("error" in context) return context.error;

    const body = await request.json().catch(() => ({}));
    const code = String(body?.code || "").trim();
    if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });

    const current = await getUserTwoFactor(context.user.id);
    const pendingSecret = decryptTotpSecret(current?.pendingSecretEncrypted);
    if (!pendingSecret) {
      return NextResponse.json({ error: "Authenticator setup has not been started" }, { status: 400 });
    }
    if (!verifyTotpCode(pendingSecret, code)) {
      return NextResponse.json({ error: "Invalid authenticator code" }, { status: 400 });
    }

    const { rawCodes, storedCodes } = issueBackupCodes();
    const enabled = await setUserTwoFactor(context.user.id, {
      enabled: true,
      method: "authenticator",
      secretEncrypted: encryptTotpSecret(pendingSecret),
      pendingSecretEncrypted: "",
      backupCodes: storedCodes,
      enabledAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
    });

    await db.insert(auditLogs).values({
      tenantId: context.tenant.id,
      userId: context.user.id,
      action: "tenant.user_totp_enabled",
      entity: "user",
      entityId: context.user.id,
      metadata: { method: "authenticator" },
    });

    const response = NextResponse.json({ success: true, twoFactor: { enabled: enabled?.enabled }, backupCodes: rawCodes });
    response.cookies.set(`tenant_2fa_verified_${context.tenant.id}`, `${context.user.id}:${Date.now()}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch (error: any) {
    console.error("[tenant 2fa setup:post]", error);
    return NextResponse.json({ error: error?.message || "Failed to enable authenticator 2FA" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const context = await getContext(request, slug);
    if ("error" in context) return context.error;

    await setUserTwoFactor(context.user.id, null);
    await db.insert(auditLogs).values({
      tenantId: context.tenant.id,
      userId: context.user.id,
      action: "tenant.user_totp_disabled",
      entity: "user",
      entityId: context.user.id,
      metadata: { method: "authenticator" },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[tenant 2fa setup:delete]", error);
    return NextResponse.json({ error: error?.message || "Failed to disable authenticator 2FA" }, { status: 500 });
  }
}
