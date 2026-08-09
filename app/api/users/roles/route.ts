import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/lib/services/user.service";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, userRoles, roles } from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { z } from "zod";

const service = new UserService();

const assignRoleSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
});

const removeRoleSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
});

async function resolveCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null as any);
  if (!session?.user?.email) return null;
  const appUser = await db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
  });
  if (!appUser?.id) return null;

  const roleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, appUser.id))
    .catch(() => []);
  const assigned = new Set([appUser.role, ...roleRows.map((r) => r.roleName)].map((r) => String(r || "").toLowerCase()));

  return {
    appUser,
    isSuperAdmin: assigned.has("super_admin"),
    isHospitalAdmin: assigned.has("hospital_admin"),
  };
}

export async function GET(request: NextRequest) {
  try {
    const current = await resolveCurrentUser(request);
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }
    if (!current.isSuperAdmin && userId !== current.appUser.id) {
      const target = await service.getUser(userId);
      if (!target || target.tenantId?.toString() !== current.appUser.tenantId?.toString() || !current.isHospitalAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Get user permissions
    if (searchParams.get("permissions") === "true") {
      const permissions = await service.getUserPermissions(userId);
      return NextResponse.json({ permissions });
    }

    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return NextResponse.json({ error: "Failed to fetch user roles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const current = await resolveCurrentUser(request);
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!current.isSuperAdmin && !current.isHospitalAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();
    const validatedData = assignRoleSchema.parse(data);

    const [targetUser, targetRole] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, validatedData.userId) }),
      db.query.roles.findFirst({ where: eq(roles.id, validatedData.roleId) }),
    ]);
    if (!targetUser || !targetRole) {
      return NextResponse.json({ error: "User or role not found" }, { status: 404 });
    }
    if (!current.isSuperAdmin) {
      const ownTenantId = current.appUser.tenantId?.toString();
      const sameTenantUser = targetUser.tenantId?.toString() === ownTenantId;
      const sameTenantRole = targetRole.tenantId?.toString() === ownTenantId;
      const isSuperAdminRole = String(targetRole.name || "").toLowerCase() === "super_admin";
      if (isSuperAdminRole || !sameTenantUser || !sameTenantRole) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const result = await service.assignRole(validatedData.userId, validatedData.roleId);
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error assigning role:", error);
    return NextResponse.json({ error: "Failed to assign role" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const current = await resolveCurrentUser(request);
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!current.isSuperAdmin && !current.isHospitalAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();
    const validatedData = removeRoleSchema.parse(data);

    if (!current.isSuperAdmin) {
      const targetUser = await db.query.users.findFirst({ where: eq(users.id, validatedData.userId) });
      if (!targetUser || targetUser.tenantId?.toString() !== current.appUser.tenantId?.toString()) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await service.removeRole(validatedData.userId, validatedData.roleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error removing role:", error);
    return NextResponse.json({ error: "Failed to remove role" }, { status: 500 });
  }
}
