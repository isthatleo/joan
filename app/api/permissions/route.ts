import { NextRequest, NextResponse } from "next/server";
import { RoleService } from "@/lib/services/role.service";
import { z } from "zod";

const service = new RoleService();

const createPermissionSchema = z.object({
  key: z.string().min(1),
  resource: z.string().min(1),
  action: z.string().min(1),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const key = searchParams.get("key");

    // Get single permission
    if (id) {
      const permission = await service.getPermission(id);
      if (!permission) {
        return NextResponse.json({ error: "Permission not found" }, { status: 404 });
      }
      return NextResponse.json(permission);
    }

    // Get permission by key
    if (key) {
      const permission = await service.getPermissionByKey(key);
      if (!permission) {
        return NextResponse.json({ error: "Permission not found" }, { status: 404 });
      }
      return NextResponse.json(permission);
    }

    // Get all permissions
    const permissions = await service.getAllPermissions();
    return NextResponse.json(permissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const validatedData = createPermissionSchema.parse(data);
    const permission = await service.createPermission(validatedData);
    return NextResponse.json(permission[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    console.error("Error creating permission:", error);
    return NextResponse.json({ error: "Failed to create permission" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Permission ID required" }, { status: 400 });
    }

    await service.deletePermission(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting permission:", error);
    return NextResponse.json({ error: "Failed to delete permission" }, { status: 500 });
  }
}

