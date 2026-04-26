import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userRoles, roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();

    if (!userId && !email) {
      return NextResponse.json({ error: "userId or email required" }, { status: 400 });
    }

    // First, try to find by userId
    if (userId) {
      const result = await db
        .select({ roleName: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId))
        .limit(1);

      if (result[0]) {
        return NextResponse.json({ role: result[0].roleName });
      }
    }

    // If not found, try to find by email
    if (email) {
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (userResult[0]) {
        const userIdFromEmail = userResult[0].id;
        const result2 = await db
          .select({ roleName: roles.name })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, userIdFromEmail))
          .limit(1);

        if (result2[0]) {
          return NextResponse.json({ role: result2[0].roleName });
        }
      }
    }

    return NextResponse.json({ role: null });
  } catch (error) {
    console.error("Error getting user role:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
