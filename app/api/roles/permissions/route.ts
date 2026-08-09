import { NextRequest, NextResponse } from "next/server";
import { RoleService } from "@/lib/services/role.service";
import { z } from "zod";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";
import { requireAppUser } from "@/lib/api/route-guards";

const service = new RoleService();

export async function GET(request: NextRequest) {
  try {
    const access = await requireAppUser(request);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }
    const isSuperAdmin = access.user.role === "super_admin";
    if (!isSuperAdmin && tenantId !== access.user.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const perms = await service.getTenantPermissions(tenantId);
    return NextResponse.json(perms);
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    return NextResponse.json({ error: "Failed to fetch role permissions" }, { status: 500 });
  }
}

const updatePermissionsSchema = z.object({
  tenantId: z.string().optional(),
  applyToAllTenants: z.boolean().optional(),
  permissions: z.record(z.string(), z.array(z.string())),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireAppUser(request, ["super_admin", "hospital_admin"]);
    if (!access.ok) return access.response;
    const isSuperAdmin = access.user.role === "super_admin";

    const data = await request.json();
    const validatedData = updatePermissionsSchema.parse(data);

    if (validatedData.applyToAllTenants) {
      if (!isSuperAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const allTenants = await db.select({ id: tenants.id }).from(tenants).where(isNull(tenants.deletedAt));
      for (const tenant of allTenants) {
        await service.updateTenantPermissions(tenant.id, validatedData.permissions);
      }
      return NextResponse.json({ success: true, appliedTenants: allTenants.length });
    }
    if (!validatedData.tenantId) {
      return NextResponse.json({ error: "tenantId is required unless applyToAllTenants is true" }, { status: 400 });
    }
    if (!isSuperAdmin && validatedData.tenantId !== access.user.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await service.updateTenantPermissions(validatedData.tenantId, validatedData.permissions);
    return NextResponse.json({ success: true, appliedTenants: 1 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error updating permissions:", error);
    return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 });
  }
}
