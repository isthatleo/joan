import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/helpers";
import { users, tenants, roles, userRoles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * Super Admin Dashboard API
 * GET /api/super-admin/dashboard - Get dashboard metrics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "dashboard") {
      // Get dashboard metrics
      const totalTenants = await db.select().from(tenants);
      const totalUsers = await db.select().from(users);
      const totalRoles = await db.select().from(roles);

      return NextResponse.json({
        metrics: {
          tenants: {
            total: totalTenants.length,
            active: totalTenants.filter((t) => t.isActive).length,
          },
          users: {
            total: totalUsers.length,
            active: totalUsers.filter((u) => u.isActive).length,
          },
          roles: {
            total: totalRoles.length,
          },
        },
        timestamp: new Date(),
      });
    }

    if (action === "recent-users") {
      const recentUsers = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(10);

      return NextResponse.json({
        data: recentUsers,
      });
    }

    if (action === "system-status") {
      return NextResponse.json({
        status: "healthy",
        database: "connected",
        uptime: process.uptime(),
        timestamp: new Date(),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Super admin API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch super admin data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...payload } = body;

    if (action === "create-admin-user") {
      const { email, password, fullName } = payload;

      if (!email || !password || !fullName) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      // Check if user exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing.length) {
        return NextResponse.json(
          { error: "User already exists" },
          { status: 409 }
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Get default tenant
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, "default"))
        .limit(1);

      if (!tenant) {
        return NextResponse.json(
          { error: "Default tenant not found" },
          { status: 500 }
        );
      }

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          tenantId: tenant.id,
          email,
          passwordHash: hashedPassword,
          fullName,
          isActive: true,
        })
        .returning();

      // Get or create super_admin role
      let [superAdminRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "super_admin"))
        .limit(1);

      if (!superAdminRole) {
        const [created] = await db
          .insert(roles)
          .values({
            tenantId: tenant.id,
            name: "super_admin",
          })
          .returning();
        superAdminRole = created;
      }

      // Assign role to user
      await db.insert(userRoles).values({
        userId: newUser.id,
        roleId: superAdminRole.id,
      });

      return NextResponse.json(
        {
          data: {
            id: newUser.id,
            email: newUser.email,
            fullName: newUser.fullName,
          },
          message: "Admin user created successfully",
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Super admin POST error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

