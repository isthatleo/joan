import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userRoles, roles, users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireAppUser } from "@/lib/api/route-guards";

export async function POST(request: NextRequest) {
  try {
    const access = await requireAppUser(request, ["super_admin", "hospital_admin"]);
    if (!access.ok) return access.response;

    const { userId, roleName } = await request.json();

    if (!userId || !roleName) {
      return NextResponse.json({ error: "userId and roleName required" }, { status: 400 });
    }

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, tenantId: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (access.user.role !== "super_admin" && targetUser.tenantId !== access.user.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const roleResult = await db
      .select()
      .from(roles)
      .where(targetUser.tenantId
        ? and(eq(roles.name, roleName), eq(roles.tenantId, targetUser.tenantId))
        : and(eq(roles.name, roleName), isNull(roles.tenantId)))
      .limit(1);

    if (!roleResult[0]) {
      return NextResponse.json({ error: `Role ${roleName} not found` }, { status: 404 });
    }

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
