import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/lib/services/user.service";
import { verifyAuth } from "@/lib/api/auth-middleware";
import { db } from "@/lib/db";
import { users as usersTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const service = new UserService();

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  passwordHash: z.string().optional(),
  tenantId: z.string().optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).optional(),
  passwordHash: z.string().optional(),
  isActive: z.boolean().optional(),
  tenantId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email");
    const search = searchParams.get("search") || undefined;
    const isActive = searchParams.get("isActive") ? searchParams.get("isActive") === "true" : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

    // Get the authenticated user to scope results by their tenant
    const auth = await verifyAuth(request);
    let userTenantId: string | undefined;

    if (auth.authenticated && auth.user?.sub) {
      try {
        const user = await db.query.users.findFirst({
          where: eq(usersTable.id, auth.user.sub as string),
        });
        userTenantId = user?.tenantId?.toString();
      } catch {
        userTenantId = undefined;
      }
    }

    // Get single user by ID
    if (id) {
      const user = await service.getUser(id);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      // Verify the user belongs to the current tenant
      if (userTenantId && user.tenantId?.toString() !== userTenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      return NextResponse.json(user);
    }

    // Get user by email
    if (email) {
      const user = await service.getUserByEmail(email);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      // Verify the user belongs to the current tenant
      if (userTenantId && user.tenantId?.toString() !== userTenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      return NextResponse.json(user);
    }

    // Get stats
    if (searchParams.get("stats") === "true") {
      const stats = await service.getUserStats();
      return NextResponse.json(stats);
    }

    // Get all users - scoped to current user's tenant
    const users = await service.getAllUsers({ search, tenantId: userTenantId, isActive, limit, offset });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const validatedData = createUserSchema.parse(data);
    const user = await service.createUser(validatedData);
    return NextResponse.json(user[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const data = await request.json();
    const validatedData = updateUserSchema.parse(data);
    const user = await service.updateUser(id, validatedData);

    if (user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    await service.deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

