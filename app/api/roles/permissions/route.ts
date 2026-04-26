import { NextRequest, NextResponse } from "next/server";
import { RoleService } from "@/lib/services/role.service";
import { z } from "zod";

const service = new RoleService();

const assignPermissionSchema = z.object({
  roleId: z.string(),
  permissionId: z.string(),
  scope: z.string().optional().default("tenant"),
});

const removePermissionSchema = z.object({
  roleId: z.string(),
  permissionId: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("roleId");

    if (!roleId) {
      return NextResponse.json({ error: "Role ID required" }, { status: 400 });
    }

    const permissions = await service.getRolePermissions(roleId);
    return NextResponse.json(permissions);
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    return NextResponse.json({ error: "Failed to fetch role permissions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const validatedData = assignPermissionSchema.parse(data);
    const result = await service.assignPermissionToRole(
      validatedData.roleId,
      validatedData.permissionId,
      validatedData.scope
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    console.error("Error assigning permission to role:", error);
    return NextResponse.json({ error: "Failed to assign permission to role" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const data = await request.json();
    const validatedData = removePermissionSchema.parse(data);
    await service.removePermissionFromRole(validatedData.roleId, validatedData.permissionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    console.error("Error removing permission from role:", error);
    return NextResponse.json({ error: "Failed to remove permission from role" }, { status: 500 });
  }
}

