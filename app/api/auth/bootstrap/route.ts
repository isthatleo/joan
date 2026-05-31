import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, ilike, isNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roles, tenantSettings, tenants, userRoles, users, userSettings } from "@/lib/db/schema";
import { mergeUserSettings } from "@/lib/user-settings";
import { normalizeTenantPreferences } from "@/lib/tenant-preferences";

export const dynamic = "force-dynamic";

function normalizeRole(role: string | null) {
  return role ? role.toLowerCase().replace(/[\s-]+/g, "_") : null;
}

function rolePriorityOrder() {
  return sql`
    case lower(${roles.name})
      when 'super_admin' then 0
      when 'hospital_admin' then 1
      when 'admin' then 1
      when 'doctor' then 2
      when 'nurse' then 3
      when 'lab_technician' then 4
      when 'pharmacist' then 5
      when 'accountant' then 6
      when 'receptionist' then 7
      when 'patient' then 8
      when 'guardian' then 9
      else 99
    end
  `;
}

async function getUserRole(appUserId: string) {
  const result = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, appUserId))
    .orderBy(rolePriorityOrder())
    .limit(1);
  return result[0]?.roleName || null;
}

async function resolveTenantPreferences(tenantId?: string | null) {
  if (!tenantId) return null;
  const row = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "preferences")),
  });
  return normalizeTenantPreferences((row?.value as Record<string, any> | undefined) || null);
}

function applyTenantDefaultsToUserSettings(rawSettings: Record<string, any>, tenantPreferences: ReturnType<typeof normalizeTenantPreferences> | null) {
  if (!tenantPreferences) return rawSettings;

  const appearance = rawSettings.appearance ?? {};
  const workflow = rawSettings.workflow ?? {};
  const languageSource = appearance.languageSource === "user" ? "user" : "tenant";

  return {
    ...rawSettings,
    appearance: {
      ...appearance,
      language: languageSource === "user" ? appearance.language : tenantPreferences.language,
      languageSource,
      timezone: tenantPreferences.timezone,
      timeFormat: tenantPreferences.timeFormat,
      calendarStart: String(tenantPreferences.weekStartDay || "Monday").toLowerCase(),
      highContrast: tenantPreferences.highContrast,
    },
    workflow: {
      ...workflow,
      autoSaveDrafts: tenantPreferences.autoSaveForms,
      compactTables: tenantPreferences.compactMode,
    },
  };
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null as any);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const tenantSlug = typeof body.tenantSlug === "string" ? body.tenantSlug.trim().toLowerCase() : "";
  const requestedRole = normalizeRole(typeof body.requestedRole === "string" ? body.requestedRole : null);

  let appUser = await db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: {
      id: true,
      email: true,
      fullName: true,
      avatar: true,
      role: true,
      tenantId: true,
      isActive: true,
    },
  });

  if (!appUser) {
    [appUser] = await db.insert(users).values({
      email: session.user.email,
      fullName: session.user.name || session.user.email,
      isActive: true,
    }).returning({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      avatar: users.avatar,
      role: users.role,
      tenantId: users.tenantId,
      isActive: users.isActive,
    });
  }

  if (!appUser?.isActive) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (tenantSlug) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, tenantSlug),
      columns: { id: true, adminUserId: true, isActive: true, deletedAt: true },
    });
    if (!tenant || tenant.isActive === false || tenant.deletedAt) {
      return NextResponse.json({ error: "Tenant is archived or unavailable" }, { status: 403 });
    }
    if (appUser.tenantId !== tenant.id) {
      return NextResponse.json({ error: "Account does not belong to this tenant" }, { status: 403 });
    }
    const isLegacyTenantAdmin =
      requestedRole === "hospital_admin" &&
      !tenant.adminUserId &&
      !(await tenantHasHospitalAdmin(tenant.id));
    if (tenant.adminUserId === appUser.id || isLegacyTenantAdmin) {
      if (isLegacyTenantAdmin) {
        await db.update(tenants).set({ adminUserId: appUser.id, updatedAt: new Date() } as any).where(eq(tenants.id, tenant.id));
      }
      await ensureHospitalAdminRole(appUser.id, tenant.id);
      appUser = { ...appUser, role: "hospital_admin", isActive: true };
    }
  }

  let role = await getUserRole(appUser.id);
  if (!role) {
    const [{ value: superAdminCount }] = await db
      .select({ value: count() })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(roles.name, "super_admin"));
    if (superAdminCount === 0) {
      let [superRole] = await db.select().from(roles).where(eq(roles.name, "super_admin")).limit(1);
      if (!superRole) [superRole] = await db.insert(roles).values({ name: "super_admin" }).returning();
      await db.insert(userRoles).values({ userId: appUser.id, roleId: superRole.id });
      role = "super_admin";
    }
  }

  const [settingsRecord, tenantPreferences] = await Promise.all([
    db.query.userSettings.findFirst({
      where: eq(userSettings.userId, appUser.id),
    }),
    resolveTenantPreferences(appUser.tenantId),
  ]);
  const settings = mergeUserSettings(applyTenantDefaultsToUserSettings((settingsRecord?.settings as Record<string, any>) || {}, tenantPreferences));

  return NextResponse.json({
    role: normalizeRole(role || appUser.role),
    tenantId: appUser.tenantId,
    userId: appUser.id,
    user: {
      id: appUser.id,
      email: appUser.email,
      fullName: appUser.fullName || session.user.name || appUser.email,
      role: normalizeRole(role || appUser.role),
      tenantId: appUser.tenantId,
      hospitalId: appUser.tenantId,
      avatar: appUser.avatar || null,
    },
    settings,
  });
}

async function ensureHospitalAdminRole(appUserId: string, tenantId: string) {
  await db.update(users).set({ role: "hospital_admin", isActive: true, updatedAt: new Date() }).where(eq(users.id, appUserId));
  let [adminRole] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.name, "hospital_admin")))
    .limit(1);
  if (!adminRole) {
    [adminRole] = await db.insert(roles).values({ tenantId, name: "hospital_admin" }).returning();
  }
  const existing = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(and(eq(userRoles.userId, appUserId), eq(userRoles.roleId, adminRole.id)))
    .limit(1);
  if (!existing.length) {
    await db.insert(userRoles).values({ userId: appUserId, roleId: adminRole.id });
  }
}

async function tenantHasHospitalAdmin(tenantId: string) {
  const existing = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(users, eq(userRoles.userId, users.id))
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true), eq(roles.name, "hospital_admin")))
    .limit(1);

  return existing.length > 0;
}
