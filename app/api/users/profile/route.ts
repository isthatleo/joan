import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userRoles, rolePermissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    console.log("[Profile API] GET request for userId:", userId);

    if (!userId) {
      console.error("[Profile API] No userId provided");
      return NextResponse.json({ error: "User ID required", details: "userId query parameter is missing" }, { status: 400 });
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

    // Return basic user data
    const response = {
      id: userData.id,
      email: userData.email,
      fullName: userData.fullName,
      phone: userData.phone,
      address: userData.address,
      dateOfBirth: userData.dateOfBirth?.toISOString(),
      bio: userData.bio,
      avatar: userData.avatar,
      isActive: userData.isActive,
      createdAt: userData.createdAt.toISOString(),
      updatedAt: userData.updatedAt.toISOString(),
      roles: [], // Empty for now
      permissions: [], // Empty for now
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    console.log("[Profile API] PATCH request for userId:", userId);

    if (!userId) {
      console.error("[Profile API] No userId provided");
      return NextResponse.json({ error: "User ID required", details: "userId query parameter is missing" }, { status: 400 });
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

    // Update user profile information
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (fullName !== undefined) updateData.fullName = fullName;
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
