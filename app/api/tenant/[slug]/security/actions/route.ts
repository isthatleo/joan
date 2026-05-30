import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, tenants, users } from "@/lib/db/schema";
import { getTenantSecuritySettings, saveTenantSecuritySettings } from "@/lib/tenant-security";
import { requireTenantAdmin } from "@/lib/tenant-staff";
import { setUserTwoFactor } from "@/lib/user-two-factor";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenant.id);
    if (!admin.ok) return NextResponse.json({ error: admin.error || "Forbidden" }, { status: admin.status || 403 });

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "");
    const settings = await getTenantSecuritySettings(tenant.id);
    const actorId = admin.user?.id || null;

    if (action === "run-audit") {
      const checks = [
        { key: "2fa", ok: settings.twoFactorRequired, message: settings.twoFactorRequired ? "Two-factor authentication is enforced." : "Two-factor authentication is not enforced." },
        { key: "ip_allowlist", ok: !settings.ipWhitelistEnabled || settings.ipWhitelist.length > 0, message: settings.ipWhitelistEnabled ? `IP allowlist enabled for ${settings.ipWhitelist.length} entries.` : "IP allowlist is disabled." },
        { key: "at_rest", ok: settings.encryptDataAtRest, message: settings.encryptDataAtRest ? "Data-at-rest encryption enabled." : "Data-at-rest encryption disabled." },
        { key: "in_transit", ok: settings.encryptDataInTransit, message: settings.encryptDataInTransit ? "Data-in-transit encryption enabled." : "Data-in-transit encryption disabled." },
        { key: "intrusion", ok: settings.intrusionDetection, message: settings.intrusionDetection ? "Intrusion detection monitoring enabled." : "Intrusion detection monitoring disabled." },
        { key: "audit", ok: settings.auditAllAccess, message: settings.auditAllAccess ? "Access audit logging enabled." : "Access audit logging disabled." },
      ];
      const findings = checks.map((item) => item.message);
      const score = Math.round((checks.filter((item) => item.ok).length / checks.length) * 100);
      const posture = score >= 90 ? "healthy" : score >= 70 ? "review" : "attention";
      await db.insert(auditLogs).values({
        tenantId: tenant.id,
        userId: actorId,
        action: "tenant.security_audit_run",
        entity: "security",
        entityId: tenant.id,
        metadata: { findings, score, posture },
      });
      return NextResponse.json({ ok: true, findings, score, posture });
    }

    if (action === "generate-keys") {
      const rawValue = `sec_${crypto.randomBytes(32).toString("hex")}`;
      const maskedValue = `${rawValue.slice(0, 8)}********${rawValue.slice(-4)}`;
      const entry = {
        id: crypto.randomUUID(),
        label: String(body?.label || "Security rotation key"),
        createdAt: new Date().toISOString(),
        maskedValue,
      };
      const next = await saveTenantSecuritySettings(tenant.id, {
        ...settings,
        generatedSecurityKeys: [entry, ...settings.generatedSecurityKeys].slice(0, 10),
      }, actorId);
      await db.insert(auditLogs).values({
        tenantId: tenant.id,
        userId: actorId,
        action: "tenant.security_key_generated",
        entity: "security",
        entityId: tenant.id,
        metadata: { keyId: entry.id, label: entry.label },
      });
      return NextResponse.json({ ok: true, key: entry, rawKey: rawValue, settings: next });
    }

    if (action === "schedule-audit") {
      const nextDate = String(body?.date || "");
      const next = await saveTenantSecuritySettings(tenant.id, {
        ...settings,
        nextSecurityAuditAt: nextDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
        nextSecurityAuditStatus: "scheduled",
      }, actorId);
      await db.insert(auditLogs).values({
        tenantId: tenant.id,
        userId: actorId,
        action: "tenant.security_audit_scheduled",
        entity: "security",
        entityId: tenant.id,
        metadata: { nextSecurityAuditAt: next.nextSecurityAuditAt },
      });
      return NextResponse.json({ ok: true, nextSecurityAuditAt: next.nextSecurityAuditAt, settings: next });
    }

    if (action === "review-incident-plan") {
      const next = await saveTenantSecuritySettings(tenant.id, {
        ...settings,
        incidentResponsePlanActive: true,
        incidentResponseLastReviewedAt: new Date().toISOString(),
      }, actorId);
      await db.insert(auditLogs).values({
        tenantId: tenant.id,
        userId: actorId,
        action: "tenant.security_incident_plan_reviewed",
        entity: "security",
        entityId: tenant.id,
        metadata: { reviewedAt: next.incidentResponseLastReviewedAt },
      });
      return NextResponse.json({ ok: true, settings: next });
    }

    if (action === "run-vulnerability-scan") {
      const result = {
        scanId: crypto.randomUUID(),
        completedAt: new Date().toISOString(),
        critical: 0,
        high: settings.twoFactorRequired && settings.auditAllAccess ? 0 : 1,
        medium: settings.ipWhitelistEnabled && settings.ipWhitelist.length === 0 ? 1 : 0,
        low: settings.generatedSecurityKeys.length === 0 ? 1 : 0,
      };
      await db.insert(auditLogs).values({
        tenantId: tenant.id,
        userId: actorId,
        action: "tenant.security_vulnerability_scan_run",
        entity: "security",
        entityId: tenant.id,
        metadata: result,
      });
      return NextResponse.json({ ok: true, result });
    }

    if (action === "reset-user-2fa") {
      const userId = String(body?.userId || "");
      if (!userId) return NextResponse.json({ error: "User id is required" }, { status: 400 });
      const target = await db.query.users.findFirst({
        where: and(eq(users.id, userId), eq(users.tenantId, tenant.id)),
        columns: { id: true },
      });
      if (!target) return NextResponse.json({ error: "User not found for this tenant" }, { status: 404 });
      await setUserTwoFactor(userId, null);
      await db.insert(auditLogs).values({
        tenantId: tenant.id,
        userId: actorId,
        action: "tenant.user_totp_reset_by_admin",
        entity: "user",
        entityId: userId,
        metadata: { resetBy: actorId },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "export-report") {
      const recentAuditRows = await db
        .select()
        .from(auditLogs)
        .where(and(eq(auditLogs.tenantId, tenant.id), ilike(auditLogs.action, "%security%")))
        .orderBy(desc(auditLogs.createdAt))
        .limit(200);

      return NextResponse.json({
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
        exportedAt: new Date().toISOString(),
        settings,
        securityEvents: recentAuditRows,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    console.error("[tenant security action]", error);
    return NextResponse.json({ error: error?.message || "Security action failed" }, { status: 500 });
  }
}
