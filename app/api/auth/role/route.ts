import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userRoles, roles, tenants } from "@/lib/db/schema";
import { and, count, eq, ilike, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

function isUuid(value?: string): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const session = await auth.api.getSession({ headers: request.headers }).catch(() => null as any);
    const userId = body.userId as string | undefined;
    const email = (body.email || session?.user?.email) as string | undefined;
    const tenantSlug = typeof body.tenantSlug === "string" ? body.tenantSlug.trim().toLowerCase() : "";
    const requestedRole = normalizeRole(typeof body.requestedRole === "string" ? body.requestedRole : null);

    if (!userId && !email) {
      return NextResponse.json({ error: "userId or email required" }, { status: 400 });
    }

    // First, try to find by userId
    if (isUuid(userId)) {
      const result = await db
        .select({ roleName: roles.name, appUserId: userRoles.userId })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId))
        .orderBy(rolePriorityOrder())
        .limit(1);

      if (result[0]) {
        return NextResponse.json({ role: normalizeRole(result[0].roleName), userId: result[0].appUserId });
      }
    }

    // If not found, try to find by email
    if (email) {
      const userResult = await db
        .select({ id: users.id, tenantId: users.tenantId })
        .from(users)
        .where(ilike(users.email, email))
        .limit(1);

      let appUser = userResult[0];
      let tenant: typeof tenants.$inferSelect | null = null;
      if (appUser && tenantSlug) {
        tenant = (await db.query.tenants.findFirst({ where: eq(tenants.slug, tenantSlug) })) || null;
        if (!tenant || tenant.isActive === false || tenant.deletedAt) {
          return NextResponse.json({ error: "Tenant is archived or unavailable" }, { status: 403 });
        }
        if (appUser.tenantId !== tenant.id) {
          return NextResponse.json({ error: "Account does not belong to this tenant" }, { status: 403 });
        }
        const isLegacyTenantAdmin =
          requestedRole === "hospital_admin" &&
          !tenant.adminUserId &&
          (tenant.contactEmail?.toLowerCase() === email.toLowerCase() || !(await tenantHasHospitalAdmin(tenant.id)));
        if (tenant.adminUserId === appUser.id || isLegacyTenantAdmin) {
          if (isLegacyTenantAdmin) {
            await db.update(tenants).set({ adminUserId: appUser.id, updatedAt: new Date() } as any).where(eq(tenants.id, tenant.id));
          }
          await ensureHospitalAdminRole(appUser.id, tenant.id);
          return NextResponse.json({ role: "hospital_admin", userId: appUser.id });
        }
      }
      if (!appUser && session?.user?.email && email.toLowerCase() === session.user.email.toLowerCase()) {
        [appUser] = await db.insert(users).values({
          email: session.user.email,
          fullName: session.user.name || session.user.email,
          isActive: true,
        }).returning({ id: users.id, tenantId: users.tenantId });
      }

      if (appUser) {
        const role = await getUserRole(appUser.id);
        if (role) return NextResponse.json({ role: normalizeRole(role), userId: appUser.id });

        const [{ value: superAdminCount }] = await db
          .select({ value: count() })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(roles.name, "super_admin"));
        if (superAdminCount === 0) {
          let [superRole] = await db.select().from(roles).where(eq(roles.name, "super_admin")).limit(1);
          if (!superRole) [superRole] = await db.insert(roles).values({ name: "super_admin" }).returning();
          await db.insert(userRoles).values({ userId: appUser.id, roleId: superRole.id });
          return NextResponse.json({ role: "super_admin", userId: appUser.id, bootstrapped: true });
        }
      }
    }

    return NextResponse.json({ role: null });
  } catch (error) {
    console.error("Error getting user role:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

function normalizeRole(role: string | null) {
  return role ? role.toLowerCase().replace(/[\s-]+/g, "_") : null;
}
