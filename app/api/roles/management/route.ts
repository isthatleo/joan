import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roles, rolePermissions, permissions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const createRoleSchema = z.object({
  name: z.string().min(1),
  tenantId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const withPermissions = searchParams.get("withPermissions") === "true";

    let query = db.select().from(roles);

    if (tenantId) {
      query = query.where(eq(roles.tenantId, tenantId as any));
    }

    const result = await query;

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
    const body = await request.json();
    const validated = createRoleSchema.parse(body);

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
        { error: "Invalid data", details: error.errors },
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

