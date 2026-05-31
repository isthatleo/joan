import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activityLogs, users, roles, userRoles } from "@/lib/db/schema";
import { eq, gte, sql } from "drizzle-orm";

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

    const since = new Date();
    since.setDate(since.getDate() - 1);
    const [activeUserStats] = await db
      .select({ count: sql<number>`count(distinct ${activityLogs.userId})` })
      .from(activityLogs)
      .where(gte(activityLogs.timestamp, since));

    // Get system-wide metrics
    const totalUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    return NextResponse.json({
      totalUsers: totalUsers[0]?.count || 0,
      activeUsers: activeUserStats?.count || 0,
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

