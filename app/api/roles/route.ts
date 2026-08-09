import { NextRequest, NextResponse } from "next/server";
import { RoleService } from "@/lib/services/role.service";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, userRoles, roles } from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { z } from "zod";

const service = new RoleService();

const createRoleSchema = z.object({
  name: z.string().min(1),
  tenantId: z.string().optional(),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
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
    const id = searchParams.get("id");
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

    // Get single role
    if (id) {
      const role = await service.getRole(id);
      if (!role) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }
      if (!current.isSuperAdmin && role.tenantId !== current.appUser.tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json(role);
    }

    // Get all roles - scoped to current user's tenant
    const userTenantId = current.appUser.tenantId?.toString();
    const roleList = await service.getAllRoles({
      search,
      tenantId: current.isSuperAdmin ? undefined : userTenantId,
      limit,
      offset,
    });
    return NextResponse.json(roleList);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
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
    const validatedData = createRoleSchema.parse(data);

    if (!current.isSuperAdmin) {
      const ownTenantId = current.appUser.tenantId?.toString();
      if (!ownTenantId || (validatedData.tenantId && validatedData.tenantId !== ownTenantId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      validatedData.tenantId = ownTenantId;
    }

    const role = await service.createRole(validatedData);
    return NextResponse.json(role[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error creating role:", error);
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const current = await resolveCurrentUser(request);
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!current.isSuperAdmin && !current.isHospitalAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Role ID required" }, { status: 400 });
    }

    const existing = await service.getRole(id);
    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    if (!current.isSuperAdmin && existing.tenantId !== current.appUser.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();
    const validatedData = updateRoleSchema.parse(data);
    const role = await service.updateRole(id, validatedData);

    if (role.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(role[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error updating role:", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const current = await resolveCurrentUser(request);
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!current.isSuperAdmin && !current.isHospitalAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Role ID required" }, { status: 400 });
    }

    const existing = await service.getRole(id);
    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    if (!current.isSuperAdmin && existing.tenantId !== current.appUser.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await service.deleteRole(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
  }
}
