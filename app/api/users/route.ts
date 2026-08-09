import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/lib/services/user.service";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users as usersTable } from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";
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

async function resolveCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null as any);
  if (!session?.user?.email) return null;
  return db.query.users.findFirst({
    where: and(ilike(usersTable.email, session.user.email), isNull(usersTable.deletedAt)),
    with: { userRoles: { with: { role: true } } },
  });
}

function roleOf(currentUser: any) {
  return currentUser?.userRoles?.[0]?.role?.name || currentUser?.role || "";
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await resolveCurrentUser(request);
    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const search = searchParams.get("search") || undefined;
    const isActive = searchParams.get("isActive") ? searchParams.get("isActive") === "true" : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;
    const roles = searchParams.get("roles") ? searchParams.get("roles")!.split(",") : undefined;

    const userRole = roleOf(currentUser);
    const isSuperAdmin = userRole === "super_admin";
    const userTenantId = currentUser.tenantId?.toString();

    // Handle messaging filters if requested
    let targetRoles = roles;
    let targetTenantId = userTenantId;

    const messagingFilter = searchParams.get("messagingFilter") === "true";
    if (messagingFilter) {
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
    } else if (!isSuperAdmin) {
      // Non-super-admins never see another tenant's user list, messaging filter or not.
      targetTenantId = userTenantId;
    }

    // Get single user by ID
    if (id) {
      const user = await service.getUser(id);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      // Verify the user belongs to the current tenant (unless super admin)
      if (!isSuperAdmin && user.tenantId?.toString() !== userTenantId) {
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
      roles: targetRoles,
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await resolveCurrentUser(request);
    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = roleOf(currentUser);
    const isSuperAdmin = userRole === "super_admin";
    const isHospitalAdmin = userRole === "hospital_admin";
    if (!isSuperAdmin && !isHospitalAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();
    const validatedData = createUserSchema.parse(data);

    // Hospital admins may only create users inside their own tenant.
    if (isHospitalAdmin) {
      const ownTenantId = currentUser.tenantId?.toString();
      if (!ownTenantId || (validatedData.tenantId && validatedData.tenantId !== ownTenantId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      validatedData.tenantId = ownTenantId;
    }

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
    const currentUser = await resolveCurrentUser(request);
    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = roleOf(currentUser);
    const isSuperAdmin = userRole === "super_admin";
    const isHospitalAdmin = userRole === "hospital_admin";
    if (!isSuperAdmin && !isHospitalAdmin && currentUser.id !== new URL(request.url).searchParams.get("id")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const target = await service.getUser(id);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!isSuperAdmin) {
      const isSelf = currentUser.id === id;
      const isOwnTenantAdmin = isHospitalAdmin && target.tenantId?.toString() === currentUser.tenantId?.toString();
      if (!isSelf && !isOwnTenantAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const data = await request.json();
    const validatedData = updateUserSchema.parse(data);

    // Only a super admin may reassign a user to a different tenant, and non-admins
    // may not change their own active status or password hash directly here.
    if (!isSuperAdmin) {
      delete validatedData.tenantId;
      if (currentUser.id === id && !isHospitalAdmin) {
        delete validatedData.isActive;
        delete validatedData.passwordHash;
      }
    }

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
    const currentUser = await resolveCurrentUser(request);
    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = roleOf(currentUser);
    const isSuperAdmin = userRole === "super_admin";
    const isHospitalAdmin = userRole === "hospital_admin";
    if (!isSuperAdmin && !isHospitalAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (!isSuperAdmin) {
      const target = await service.getUser(id);
      if (!target || target.tenantId?.toString() !== currentUser.tenantId?.toString()) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await service.deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
