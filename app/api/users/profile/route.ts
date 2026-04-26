import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles, userRoles, permissions, rolePermissions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Get user with roles and permissions
    const userWithRoles = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        userRoles: {
          with: {
            role: {
              with: {
                rolePermissions: {
                  with: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Extract permissions
    const permissions = new Set<string>();
    userWithRoles.userRoles?.forEach(ur => {
      ur.role?.rolePermissions?.forEach(rp => {
        permissions.add(rp.permission.key);
      });
    });

    return NextResponse.json({
      user: userWithRoles,
      roles: userWithRoles.userRoles?.map(ur => ur.role) || [],
      permissions: Array.from(permissions),
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const data = await request.json();
    const { roleId, permissions } = data;

    // Update user role if provided
    if (roleId) {
      // Remove existing roles
      await db.delete(userRoles).where(eq(userRoles.userId, userId));

      // Add new role
      await db.insert(userRoles).values({
        userId,
        roleId,
      });
    }

    // Update permissions if provided
    if (permissions && Array.isArray(permissions)) {
      // Get user's role
      const userRole = await db.query.userRoles.findFirst({
        where: eq(userRoles.userId, userId),
      });

      if (userRole) {
        // Remove existing permissions
        await db.delete(rolePermissions).where(eq(rolePermissions.roleId, userRole.roleId));

        // Add new permissions
        for (const permissionId of permissions) {
          await db.insert(rolePermissions).values({
            roleId: userRole.roleId,
            permissionId,
            scope: "tenant",
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json({ error: "Failed to update user profile" }, { status: 500 });
  }
}

