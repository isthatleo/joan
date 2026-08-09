import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roles, rolePermissions, permissions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAppUser } from "@/lib/api/route-guards";

const createRoleSchema = z.object({
  name: z.string().min(1),
  tenantId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireAppUser(request);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const requestedTenantId = searchParams.get("tenantId");
    const withPermissions = searchParams.get("withPermissions") === "true";
    const isSuperAdmin = access.user.role === "super_admin";

    if (!isSuperAdmin && requestedTenantId && requestedTenantId !== access.user.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Non-super-admins can never list roles platform-wide.
    const tenantId = isSuperAdmin ? requestedTenantId : access.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const result = await db.select().from(roles).where(eq(roles.tenantId, tenantId));

    if (withPermissions) {
      const rolesWithPerms = await Promise.all(
        result.map(async (role: any) => {
          const perms = await db
            .select({
              id: permissions.id,
              key: permissions.key,
              resource: permissions.resource,
              action: permissions.action,
              description: permissions.description,
            })
            .from(permissions)
            .innerJoin(
              rolePermissions,
              eq(permissions.id, rolePermissions.permissionId)
            )
            .where(eq(rolePermissions.roleId, role.id));

          return { ...role, permissions: perms };
        })
      );
      return NextResponse.json(rolesWithPerms);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAppUser(request, ["super_admin", "hospital_admin"]);
    if (!access.ok) return access.response;
    const isSuperAdmin = access.user.role === "super_admin";

    const body = await request.json();
    const validated = createRoleSchema.parse(body);

    if (!isSuperAdmin) {
      if (!access.user.tenantId || (validated.tenantId && validated.tenantId !== access.user.tenantId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      validated.tenantId = access.user.tenantId;
    }

    const created = await db
      .insert(roles)
      .values({
        ...validated,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(created[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}
