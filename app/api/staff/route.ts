import { NextRequest, NextResponse } from "next/server";
import { AdminService } from "@/lib/services/admin.service";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, userRoles, roles } from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";

const service = new AdminService();

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
    if (!current) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userTenantId = current.appUser.tenantId?.toString();
    if (!userTenantId) {
      return NextResponse.json({ error: "Tenant not found or user not authenticated" }, { status: 403 });
    }

    const staff = await service.getStaffList(userTenantId);
    return NextResponse.json(staff);
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const current = await resolveCurrentUser(request);
    if (!current) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!current.isSuperAdmin && !current.isHospitalAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();
    if (!current.isSuperAdmin) {
      const ownTenantId = current.appUser.tenantId?.toString();
      if (!ownTenantId || (data?.tenantId && data.tenantId !== ownTenantId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      data.tenantId = ownTenantId;
    }

    const staff = await service.createStaff(data);
    return NextResponse.json(staff);
  } catch (error) {
    console.error("Error creating staff:", error);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}
