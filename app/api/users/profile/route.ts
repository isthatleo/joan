import { NextRequest, NextResponse } from "next/server";
import { resolveBetterAuthSession } from "@/lib/better-auth-session";
import { db } from "@/lib/db";
import { permissions, rolePermissions, roles, userRoles, users } from "@/lib/db/schema";
import { and, eq, ilike } from "drizzle-orm";

const IDENTITY_EDIT_ROLES = new Set(["hospital_admin", "super_admin", "patient", "guardian"]);

function canEditIdentity(role: string | null | undefined) {
  return IDENTITY_EDIT_ROLES.has((role || "").toLowerCase());
}

async function resolveCurrentAppUser(request: NextRequest) {
  const session = await resolveBetterAuthSession(request.headers);
  if (!session?.user?.email) {
    return { session, appUser: null };
  }

  const appUser = await db.query.users.findFirst({
    where: ilike(users.email, session.user.email),
  });

  return { session, appUser };
}

async function getRolesAndPermissions(userId: string, fallbackRole?: string | null) {
  const assignedRoles = await db
    .select({
      id: roles.id,
      name: roles.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const permissionRows = await db
    .select({
      key: permissions.key,
    })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));

  const normalizedRoles =
    assignedRoles.length > 0
      ? assignedRoles.map((role) => ({
          id: role.id,
          name: role.name,
        }))
      : fallbackRole
        ? [{ id: `builtin:${fallbackRole}`, name: fallbackRole }]
        : [];

  return {
    roles: normalizedRoles,
    permissions: Array.from(new Set(permissionRows.map((row) => row.key))),
  };
}

async function canAccessUser(sessionEmail: string | undefined, userId: string) {
  if (!sessionEmail) return false;
  const matchingUser = await db.query.users.findFirst({
    where: and(eq(users.id, userId), ilike(users.email, sessionEmail)),
    columns: { id: true },
  });
  return !!matchingUser;
}

export async function GET(request: NextRequest) {
  try {
    const { session, appUser } = await resolveCurrentAppUser(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || appUser?.id || (session.user.id as string);

    console.log("[Profile API] GET request for userId:", userId);

    if (!userId) {
      console.error("[Profile API] No userId provided");
      return NextResponse.json({ error: "User ID required", details: "userId query parameter is missing" }, { status: 400 });
    }
    if (!(await canAccessUser(session.user.email, userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get user basic info only
    console.log("[Profile API] Fetching user data...");
    let userResult;
    try {
      userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    } catch (dbError) {
      console.error("[Profile API] Database query error:", dbError);
      const dbErrorMsg = dbError instanceof Error ? dbError.message : "Unknown database error";
      return NextResponse.json({ error: "Failed to fetch user profile", details: dbErrorMsg }, { status: 500 });
    }

    console.log("[Profile API] User query result:", userResult.length > 0 ? "found" : "not found");

    if (!userResult.length) {
      console.error("[Profile API] User not found:", userId);
      return NextResponse.json({ error: "User not found", details: `No user found with ID: ${userId}` }, { status: 404 });
    }

    const userData = userResult[0];

    const accessMatrix = await getRolesAndPermissions(userData.id, userData.role);

    const response = {
      id: userData.id,
      email: userData.email,
      fullName: userData.fullName,
      phone: userData.phone,
      address: userData.address,
      dateOfBirth: userData.dateOfBirth?.toISOString(),
      bio: userData.bio,
      avatar: userData.avatar,
      role: userData.role,
      canEditIdentity: canEditIdentity(userData.role),
      isActive: userData.isActive,
      createdAt: userData.createdAt.toISOString(),
      updatedAt: userData.updatedAt.toISOString(),
      roles: accessMatrix.roles,
      permissions: accessMatrix.permissions,
    };

    console.log("[Profile API] Profile data retrieved successfully");
    return NextResponse.json(response);
  } catch (error) {
    console.error("[Profile API] Unexpected error fetching profile:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "No stack trace";
    console.error("[Profile API] Error stack:", errorStack);

    return NextResponse.json({
      error: "Failed to fetch user profile",
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, appUser } = await resolveCurrentAppUser(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || appUser?.id || (session.user.id as string);

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }
    if (!(await canAccessUser(session.user.email, userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

      if (userRole && userRole.roleId) {
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

export async function PATCH(request: NextRequest) {
  try {
    const { session, appUser } = await resolveCurrentAppUser(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || appUser?.id || (session.user.id as string);

    console.log("[Profile API] PATCH request for userId:", userId);

    if (!userId) {
      console.error("[Profile API] No userId provided");
      return NextResponse.json({ error: "User ID required", details: "userId query parameter is missing" }, { status: 400 });
    }
    if (!(await canAccessUser(session.user.email, userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse JSON body
    let data;
    try {
      data = await request.json();
    } catch (parseError) {
      console.error("[Profile API] Error parsing JSON:", parseError);
      const parseErrorMsg = parseError instanceof Error ? parseError.message : "Invalid JSON";
      return NextResponse.json({ error: "Invalid request body", details: parseErrorMsg }, { status: 400 });
    }

    console.log("[Profile API] Update data received:", data);
    const { fullName, phone, address, dateOfBirth, bio } = data;

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true },
    });
    const allowIdentityEdit = canEditIdentity(currentUser?.role);

    // Update user profile information
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (fullName !== undefined && allowIdentityEdit) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (bio !== undefined) updateData.bio = bio;

    console.log("[Profile API] Update data to be saved:", updateData);

    try {
      const result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId));

      console.log("[Profile API] Database update result:", result);
      console.log("[Profile API] Profile updated successfully");
    } catch (dbError) {
      console.error("[Profile API] Database update error:", dbError);
      const dbErrorMsg = dbError instanceof Error ? dbError.message : "Unknown database error";
      return NextResponse.json({ error: "Failed to update profile in database", details: dbErrorMsg }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Profile API] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "No stack trace";
    console.error("[Profile API] Error stack:", errorStack);

    return NextResponse.json({
      error: "Failed to update profile",
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 });
  }
}
