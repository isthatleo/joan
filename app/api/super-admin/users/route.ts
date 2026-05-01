import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userRoles, roles } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.string(),
  tenantId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const role = searchParams.get("role");
    const isActive = searchParams.get("isActive");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        isActive: users.isActive,
        avatar: users.avatar,
        createdAt: users.createdAt,
        role: sql<string>`string_agg(${roles.name}, ', ')`,
      })
      .from(users)
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .groupBy(users.id, users.email, users.fullName, users.isActive, users.avatar, users.createdAt);

    const conditions = [];

    if (search) {
      conditions.push(
        sql`${users.fullName} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`}`
      );
    }

    if (role) {
      // Since we group by user and aggregate roles, filtering by role needs to ensure the user has that role
      // A simple way is to use a subquery or a HAVING clause, but here we can just add to WHERE
      conditions.push(eq(roles.name, role));
    }

    if (isActive !== null && isActive !== "" && isActive !== undefined) {
      conditions.push(eq(users.isActive, isActive === "true"));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query.limit(limit).offset(offset);

    const totalQuery = db
      .select({ count: sql<number>`count(distinct ${users.id})` })
      .from(users)
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id));

    if (conditions.length > 0) {
      totalQuery.where(and(...conditions));
    }

    const total = await totalQuery;

    return NextResponse.json({
      users: result,
      total: total[0]?.count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createUserSchema.parse(body);

    const created = await db
      .insert(users)
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
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

