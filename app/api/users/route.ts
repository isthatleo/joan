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
    const roles = searchParams.get("roles") ? searchParams.get("roles")!.split(",") : undefined;

    // Get the authenticated user to scope results by their tenant
    const auth = await verifyAuth(request);
    let userTenantId: string | undefined;
    let currentUser: any;

    if (auth.authenticated && auth.user?.sub) {
      try {
        currentUser = await db.query.users.findFirst({
          where: eq(usersTable.id, auth.user.sub as string),
          with: {
            userRoles: {
              with: { role: true }
            }
          }
        });
        userTenantId = currentUser?.tenantId?.toString();
      } catch {
        userTenantId = undefined;
      }
    }

    // Handle messaging filters if requested
    let targetRoles = roles;
    let targetTenantId = userTenantId;

    const messagingFilter = searchParams.get("messagingFilter") === "true";
    if (messagingFilter && currentUser) {
      const userRole = currentUser.userRoles?.[0]?.role?.name || "patient";
      
      switch (userRole) {
        case "super_admin":
          targetRoles = ["hospital_admin"];
          targetTenantId = undefined; // Super admin can message hospital admins across all tenants
          break;
        case "hospital_admin":
          // Hospital admin messages all employees in their tenant
          targetRoles = ["doctor", "nurse", "lab_technician", "pharmacist", "accountant", "receptionist"];
          break;
        case "doctor":
          targetRoles = ["hospital_admin", "nurse", "lab_technician", "pharmacist", "patient"];
          break;
        case "nurse":
          targetRoles = ["doctor"]; // Nurses only message doctors as per requirement
          break;
        case "patient":
        case "guardian":
          targetRoles = ["doctor"];
          break;
        default:
          targetRoles = [];
      }
    }

    // Get single user by ID
    if (id) {
      const user = await service.getUser(id);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      // Verify the user belongs to the current tenant (unless super admin)
      const userRole = currentUser?.userRoles?.[0]?.role?.name;
      if (userRole !== "super_admin" && userTenantId && user.tenantId?.toString() !== userTenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      return NextResponse.json(user);
    }

    // Get all users - scoped to current user's tenant (or filtered for messaging)
    const users = await service.getAllUsers({ 
      search, 
      tenantId: targetTenantId, 
      isActive, 
      limit, 
      offset,
      roles: targetRoles
    });
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
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
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
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
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

