import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, tenants, users } from "@/lib/db/schema";
import { getTenantSecuritySettings, normalizeTenantSecuritySettings, saveTenantSecuritySettings } from "@/lib/tenant-security";
import { requireTenantAdmin } from "@/lib/tenant-staff";
import { listTenantTwoFactorEnrollment } from "@/lib/user-two-factor";

async function getTenant(slug: string) {
  return db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
}

async function getSecurityDashboard(tenantId: string) {
  const [staffRows, securityEvents, twoFactorEnrollment] = await Promise.all([
    db
      .select({ id: users.id, isActive: users.isActive, role: users.role })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt))),
    db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.tenantId, tenantId), ilike(auditLogs.action, "%security%")))
      .orderBy(desc(auditLogs.createdAt))
      .limit(25),
    listTenantTwoFactorEnrollment(tenantId),
  ]);

  return {
    staffUsers: staffRows.length,
    activeUsers: staffRows.filter((item) => item.isActive !== false).length,
    inactiveUsers: staffRows.filter((item) => item.isActive === false).length,
    twoFactorEnrollment,
    twoFactorEnrolledUsers: twoFactorEnrollment.filter((item) => item.enrolled).length,
    twoFactorPendingUsers: twoFactorEnrollment.filter((item) => item.isActive && !item.enrolled).length,
    securityEvents,
    lastSecurityEventAt: securityEvents[0]?.createdAt || null,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenant(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenant.id);
    if (!admin.ok) return NextResponse.json({ error: admin.error || "Forbidden" }, { status: admin.status || 403 });

    const settings = await getTenantSecuritySettings(tenant.id);
    const dashboard = await getSecurityDashboard(tenant.id);

    return NextResponse.json({ settings, dashboard });
  } catch (error: any) {
    console.error("[tenant security settings:get]", error);
    return NextResponse.json({ error: error?.message || "Failed to load security settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenant(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenant.id);
    if (!admin.ok) return NextResponse.json({ error: admin.error || "Forbidden" }, { status: admin.status || 403 });

    const body = await request.json().catch(() => ({}));
    const settings = normalizeTenantSecuritySettings(body?.settings || body || {});
    const saved = await saveTenantSecuritySettings(tenant.id, settings, admin.user?.id || null);

    await db.insert(auditLogs).values({
      tenantId: tenant.id,
      userId: admin.user?.id || null,
      action: "tenant.security_settings_updated",
      entity: "security",
      entityId: tenant.id,
      metadata: {
        twoFactorRequired: saved.twoFactorRequired,
        sessionTimeout: saved.sessionTimeout,
        ipWhitelistEnabled: saved.ipWhitelistEnabled,
        passwordPolicy: {
          minLength: saved.passwordMinLength,
          uppercase: saved.requireUppercase,
          lowercase: saved.requireLowercase,
          numbers: saved.requireNumbers,
          special: saved.requireSpecialCharacters,
        },
      },
    });

    const dashboard = await getSecurityDashboard(tenant.id);
    return NextResponse.json({ settings: saved, dashboard });
  } catch (error: any) {
    console.error("[tenant security settings:put]", error);
    return NextResponse.json({ error: error?.message || "Failed to save security settings" }, { status: 500 });
  }
}
