import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles, permissions, userRoles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Get total users by role
    const usersByRole = await db
      .select({
        role: roles.name,
        count: sql<number>`count(${users.id})`,
      })
      .from(users)
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .groupBy(roles.name);

    // Get active users (last 24h - mock)
    const activeUsers = Math.floor(Math.random() * 1000) + 500;

    // Get system-wide metrics
    const totalUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    return NextResponse.json({
      totalUsers: totalUsers[0]?.count || 0,
      activeUsers,
      usersByRole,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

