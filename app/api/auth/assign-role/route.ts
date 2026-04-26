import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userRoles, roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { userId, roleName } = await request.json();

    if (!userId || !roleName) {
      return NextResponse.json({ error: "userId and roleName required" }, { status: 400 });
    }

    // Find the role by name
    const roleResult = await db
      .select()
      .from(roles)
      .where(eq(roles.name, roleName))
      .limit(1);

    if (!roleResult[0]) {
      return NextResponse.json({ error: `Role ${roleName} not found` }, { status: 404 });
    }

    // Insert user role
    await db.insert(userRoles).values({
      userId,
      roleId: roleResult[0].id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error assigning role:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
