import { NextRequest, NextResponse } from "next/server";
import { eq, ilike } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roles, tenants, userRoles, users } from "@/lib/db/schema";

export type TenantAccess = {
  ok: boolean;
  status: number;
  reason?: string;
  tenant?: typeof tenants.$inferSelect;
  user?: typeof users.$inferSelect;
  roles: string[];
  isSuperAdmin: boolean;
  canViewSettings: boolean;
  canEditSettings: boolean;
  canViewAudit: boolean;
  canArchiveTenant: boolean;
  editableSettingsKeys: string[];
};

const SETTINGS_KEYS = ["branding", "modules", "notifications", "preferences"];

function isUuid(value?: string | null) {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getRequestUser(request: NextRequest) {
  return getRequestUserFromHeaders(request.headers);
}

export async function getRequestUserFromHeaders(headers: Headers) {
  const session = await auth.api.getSession({ headers }).catch(() => null as any);
  const sessionUser = session?.user;
  if (!sessionUser) return { session: null, user: null, roles: [] as string[] };

  let user = sessionUser.email
    ? await db.query.users.findFirst({ where: ilike(users.email, sessionUser.email) })
    : null;

  if (!user && isUuid(sessionUser.id)) {
    user = await db.query.users.findFirst({ where: eq(users.id, sessionUser.id) });
  }

  if (!user && sessionUser.email && isUuid(sessionUser.id)) {
    const [created] = await db.insert(users).values({
      id: sessionUser.id,
      email: sessionUser.email,
      fullName: sessionUser.name || sessionUser.email,
      isActive: true,
    } as any).returning();
    user = created;
  }

  if (!user) return { session, user: null, roles: [] as string[] };

  const assigned = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id));

  return { session, user, roles: assigned.map((r) => normalizeRole(r.name)).filter(Boolean) };
}

export async function getTenantAccess(request: NextRequest, rawSlug: string): Promise<TenantAccess> {
  const { user, roles } = await getRequestUser(request);
  return resolveTenantAccess(rawSlug, user, roles);
}

export async function resolveTenantAccess(
  rawSlug: string,
  user: typeof users.$inferSelect | null,
  roleNames: string[],
): Promise<TenantAccess> {
  const slug = rawSlug.toLowerCase();
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
  if (!tenant) {
    return denied(404, "Tenant not found");
  }

  if (!user) {
    return { ...denied(401, "Unauthorized"), tenant };
  }

  const normalizedRoles = roleNames.map(normalizeRole);
  const isSuperAdmin = normalizedRoles.includes("super_admin");
  const sameTenant = user.tenantId === tenant.id;
  const isTenantUser = sameTenant && tenant.isActive !== false && user.isActive !== false;
  const isHospitalAdmin = normalizedRoles.includes("hospital_admin") && isTenantUser;
  const canViewSettings = isSuperAdmin || isTenantUser;
  const canEditSettings = isSuperAdmin || isHospitalAdmin;
  const canViewAudit = isSuperAdmin || isHospitalAdmin;
  const canArchiveTenant = isSuperAdmin;

  if (!canViewSettings) {
    return {
      ...denied(403, "You do not have access to this tenant"),
      tenant,
      user,
      roles: roleNames,
      isSuperAdmin,
    };
  }

  return {
    ok: true,
    status: 200,
    tenant,
    user,
    roles: normalizedRoles,
    isSuperAdmin,
    canViewSettings,
    canEditSettings,
    canViewAudit,
    canArchiveTenant,
    editableSettingsKeys: canEditSettings ? SETTINGS_KEYS : [],
  };
}

export function normalizeRole(role: string | null) {
  return role ? role.toLowerCase().replace(/[\s-]+/g, "_") : "";
}

export function tenantAccessResponse(access: TenantAccess) {
  return NextResponse.json({ error: access.reason || "Forbidden" }, { status: access.status });
}

export function maskTenantSettings<T extends Record<string, any>>(settings: T, access: TenantAccess) {
  const masked: Record<string, any> = { ...settings };
  if (!access.canEditSettings) {
    masked.notifications = { emailEnabled: false, smsEnabled: false, pushEnabled: false };
  }
  masked._access = {
    roles: access.roles,
    canEditSettings: access.canEditSettings,
    canViewAudit: access.canViewAudit,
    canArchiveTenant: access.canArchiveTenant,
    editableSettingsKeys: access.editableSettingsKeys,
    maskedFields: access.canEditSettings ? [] : ["notifications"],
  };
  return masked;
}

function denied(status: number, reason: string): TenantAccess {
  return {
    ok: false,
    status,
    reason,
    roles: [],
    isSuperAdmin: false,
    canViewSettings: false,
    canEditSettings: false,
    canViewAudit: false,
    canArchiveTenant: false,
    editableSettingsKeys: [],
  };
}
