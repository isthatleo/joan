import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, tenantSettings, tenants, users } from "@/lib/db/schema";
import { getTenantSecuritySettings } from "@/lib/tenant-security";

async function upsertSecuritySettings(tenantId: string, value: Record<string, any>) {
  const existing = await db
    .select()
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "security")))
    .limit(1);

  if (existing[0]) {
    await db.update(tenantSettings).set({ value, updatedAt: new Date() }).where(eq(tenantSettings.id, existing[0].id));
    return;
  }

  await db.insert(tenantSettings).values({ tenantId, key: "security", value });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const actor = await db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true, fullName: true, email: true },
  });

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "");
  const settings = await getTenantSecuritySettings(tenant.id);

  if (action === "run-audit") {
    const findings = [
      settings.twoFactorRequired ? "Two-factor authentication is enforced." : "Two-factor authentication is not enforced.",
      settings.ipWhitelistEnabled ? `IP allowlist enabled for ${settings.ipWhitelist.length} entries.` : "IP allowlist is disabled.",
      settings.encryptDataAtRest ? "Data-at-rest encryption enabled." : "Data-at-rest encryption disabled.",
      settings.intrusionDetection ? "Intrusion detection monitoring enabled." : "Intrusion detection monitoring disabled.",
    ];
    await db.insert(auditLogs).values({
      tenantId: tenant.id,
      userId: actor?.id || null,
      action: "tenant.security_audit_run",
      entity: "security",
      entityId: tenant.id,
      metadata: { findings },
    });
    return NextResponse.json({ ok: true, findings, posture: findings.every((item) => !item.includes("disabled")) ? "healthy" : "review" });
  }

  if (action === "generate-keys") {
    const rawValue = `sec_${crypto.randomBytes(16).toString("hex")}`;
    const maskedValue = `${rawValue.slice(0, 8)}********${rawValue.slice(-4)}`;
    const entry = {
      id: crypto.randomUUID(),
      label: String(body?.label || "Security rotation key"),
      createdAt: new Date().toISOString(),
      maskedValue,
    };
    const next = {
      ...settings,
      generatedSecurityKeys: [entry, ...settings.generatedSecurityKeys].slice(0, 10),
    };
    await upsertSecuritySettings(tenant.id, next);
    await db.insert(auditLogs).values({
      tenantId: tenant.id,
      userId: actor?.id || null,
      action: "tenant.security_key_generated",
      entity: "security",
      entityId: tenant.id,
      metadata: { keyId: entry.id, label: entry.label },
    });
    return NextResponse.json({ ok: true, key: entry, rawKey: rawValue });
  }

  if (action === "schedule-audit") {
    const nextDate = String(body?.date || "");
    const next = {
      ...settings,
      nextSecurityAuditAt: nextDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
      nextSecurityAuditStatus: "scheduled",
    };
    await upsertSecuritySettings(tenant.id, next);
    await db.insert(auditLogs).values({
      tenantId: tenant.id,
      userId: actor?.id || null,
      action: "tenant.security_audit_scheduled",
      entity: "security",
      entityId: tenant.id,
      metadata: { nextSecurityAuditAt: next.nextSecurityAuditAt },
    });
    return NextResponse.json({ ok: true, nextSecurityAuditAt: next.nextSecurityAuditAt });
  }

  if (action === "export-report") {
    const recentAuditRows = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.tenantId, tenant.id), eq(auditLogs.entity, "security")));

    return NextResponse.json({
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
      exportedAt: new Date().toISOString(),
      settings,
      securityEvents: recentAuditRows,
    });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
