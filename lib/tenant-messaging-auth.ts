import { and, eq, ilike, isNull } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { roles, tenants, userRoles, users } from "@/lib/db/schema";
import { getTenantSubdomain } from "@/lib/tenant-routing";

function normalizeRole(role?: string | null) {
  return String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export async function resolveTenantMessagingUser(request: NextRequest, sessionEmail: string, slug: string) {
  let tenantId: string | null = await getTenantIdBySlug(slug);
  if (!tenantId) {
    const hostSlug = getTenantSubdomain(request.headers.get("host"));
    tenantId = hostSlug ? await getTenantIdBySlug(hostSlug) : null;
  }
  if (!tenantId) return null;
  const resolvedTenantId = tenantId;

  const [tenant, appUser] = await Promise.all([
    db.query.tenants.findFirst({
      where: eq(tenants.id, resolvedTenantId),
      columns: { id: true, adminUserId: true },
    }),
    db.query.users.findFirst({
      where: and(ilike(users.email, sessionEmail), eq(users.isActive, true), isNull(users.deletedAt)),
      columns: { id: true, tenantId: true, role: true },
    }),
  ]);
  if (!tenant || !appUser) return null;

  if (appUser.tenantId === resolvedTenantId || tenant.adminUserId === appUser.id) {
    return { id: appUser.id, tenantId: resolvedTenantId };
  }

  const roleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(userRoles.userId, appUser.id), eq(roles.tenantId, resolvedTenantId)))
    .catch(() => []);
  const linkedRoles = roleRows.map((row) => normalizeRole(row.roleName));
  const baseRole = normalizeRole(appUser.role);
  if (linkedRoles.includes("hospital_admin") || linkedRoles.includes("admin") || baseRole === "hospital_admin" || baseRole === "admin") {
    return { id: appUser.id, tenantId: resolvedTenantId };
  }

  const superAdminRole = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(userRoles.userId, appUser.id), eq(roles.name, "super_admin")))
    .limit(1)
    .catch(() => []);
  if (superAdminRole.length || baseRole === "super_admin") {
    return { id: appUser.id, tenantId: resolvedTenantId };
  }

  return null;
}
