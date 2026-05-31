import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLogs, roles, userRoles, users } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("roleId");
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const roleFilter = roleId ? eq(userRoles.roleId, roleId) : undefined;
    const whereClause = roleFilter ? and(roleFilter) : undefined;

    const [currentUsers] = await db
      .select({ count: sql<number>`count(distinct ${users.id})` })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .where(whereClause);

    const [newUsersCurrent] = await db
      .select({ count: sql<number>`count(distinct ${users.id})` })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .where(roleFilter ? and(roleFilter, gte(users.createdAt, thirtyDaysAgo)) : gte(users.createdAt, thirtyDaysAgo));

    const [newUsersPrevious] = await db
      .select({ count: sql<number>`count(distinct ${users.id})` })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .where(roleFilter ? and(roleFilter, sql`${users.createdAt} >= ${sixtyDaysAgo} and ${users.createdAt} < ${thirtyDaysAgo}`) : sql`${users.createdAt} >= ${sixtyDaysAgo} and ${users.createdAt} < ${thirtyDaysAgo}`);

    const [activeUsers] = await db
      .select({ count: sql<number>`count(distinct ${activityLogs.userId})` })
      .from(activityLogs)
      .innerJoin(userRoles, eq(userRoles.userId, activityLogs.userId))
      .where(roleFilter ? and(roleFilter, gte(activityLogs.timestamp, thirtyDaysAgo)) : gte(activityLogs.timestamp, thirtyDaysAgo));

    const timeline = await Promise.all(
      Array.from({ length: 7 }).map(async (_, index) => {
        const dayStart = new Date(now);
        dayStart.setDate(dayStart.getDate() - (6 - index));
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const [row] = await db
          .select({ value: sql<number>`count(*)` })
          .from(activityLogs)
          .innerJoin(userRoles, eq(userRoles.userId, activityLogs.userId))
          .where(
            roleFilter
              ? and(roleFilter, sql`${activityLogs.timestamp} >= ${dayStart} and ${activityLogs.timestamp} < ${dayEnd}`)
              : sql`${activityLogs.timestamp} >= ${dayStart} and ${activityLogs.timestamp} < ${dayEnd}`
          );
        return { date: dayStart.toISOString(), value: Number(row?.value || 0) };
      })
    );

    const roleCounts = await db
      .select({
        id: roles.id,
        name: roles.name,
        count: sql<number>`count(distinct ${userRoles.userId})`,
      })
      .from(roles)
      .leftJoin(userRoles, eq(userRoles.roleId, roles.id))
      .groupBy(roles.id, roles.name)
      .orderBy(sql`count(distinct ${userRoles.userId}) desc`)
      .limit(5);

    const current = Number(newUsersCurrent?.count || 0);
    const previous = Number(newUsersPrevious?.count || 0);
    const monthlyGrowth = previous ? Number((((current - previous) / previous) * 100).toFixed(1)) : current > 0 ? 100 : 0;
    const totalRecords = Number(currentUsers?.count || 0);

    return NextResponse.json({
      overview: {
        totalRecords,
        monthlyGrowth,
        activeUsers: Number(activeUsers?.count || 0),
      },
      timeline,
      topItems: roleCounts.map((role) => ({
        id: role.id,
        name: role.name,
        count: Number(role.count || 0),
        percentage: totalRecords ? Number(((Number(role.count || 0) / totalRecords) * 100).toFixed(1)) : 0,
      })),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
