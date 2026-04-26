import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/lib/services/user.service";
import { z } from "zod";

const service = new UserService();

const assignRoleSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
});

const removeRoleSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Get user permissions
    if (searchParams.get("permissions") === "true") {
      const permissions = await service.getUserPermissions(userId);
      return NextResponse.json({ permissions });
    }

    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return NextResponse.json({ error: "Failed to fetch user roles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const validatedData = assignRoleSchema.parse(data);
    const result = await service.assignRole(validatedData.userId, validatedData.roleId);
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    console.error("Error assigning role:", error);
    return NextResponse.json({ error: "Failed to assign role" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const data = await request.json();
    const validatedData = removeRoleSchema.parse(data);
    await service.removeRole(validatedData.userId, validatedData.roleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    console.error("Error removing role:", error);
    return NextResponse.json({ error: "Failed to remove role" }, { status: 500 });
  }
}

