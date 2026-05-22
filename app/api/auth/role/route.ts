import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userRoles, roles } from "@/lib/db/schema";
import { count, eq, ilike, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

function isUuid(value?: string): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const session = await auth.api.getSession({ headers: request.headers }).catch(() => null as any);
    const userId = body.userId as string | undefined;
    const email = (body.email || session?.user?.email) as string | undefined;

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
        .orderBy(sql`case when lower(${roles.name}) = 'super_admin' then 0 else 1 end`)
        .limit(1);

      if (result[0]) {
        return NextResponse.json({ role: normalizeRole(result[0].roleName), userId: result[0].appUserId });
      }
    }

    // If not found, try to find by email
    if (email) {
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(ilike(users.email, email))
        .limit(1);

      let appUser = userResult[0];
      if (!appUser && session?.user?.email && email.toLowerCase() === session.user.email.toLowerCase()) {
        [appUser] = await db.insert(users).values({
          email: session.user.email,
          fullName: session.user.name || session.user.email,
          isActive: true,
        }).returning({ id: users.id });
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

async function getUserRole(appUserId: string) {
  const result = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, appUserId))
    .orderBy(sql`case when lower(${roles.name}) = 'super_admin' then 0 else 1 end`)
    .limit(1);
  return result[0]?.roleName || null;
}

function normalizeRole(role: string | null) {
  return role ? role.toLowerCase().replace(/[\s-]+/g, "_") : null;
}
