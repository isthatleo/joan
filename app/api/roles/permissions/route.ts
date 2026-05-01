import { NextRequest, NextResponse } from "next/server";
import { RoleService } from "@/lib/services/role.service";
import { z } from "zod";

const service = new RoleService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const perms = await service.getTenantPermissions(tenantId);
    return NextResponse.json(perms);
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    return NextResponse.json({ error: "Failed to fetch role permissions" }, { status: 500 });
  }
}

const updatePermissionsSchema = z.object({
  tenantId: z.string(),
  permissions: z.record(z.string(), z.array(z.string())),
});

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const validatedData = updatePermissionsSchema.parse(data);
    await service.updateTenantPermissions(validatedData.tenantId, validatedData.permissions);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    console.error("Error updating permissions:", error);
    return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 });
  }
}

