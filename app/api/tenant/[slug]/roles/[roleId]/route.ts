import { NextRequest, NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { deleteTenantRole, requireTenantAdmin, setRolePermissions } from "@/lib/tenant-access-control";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; roleId: string }> },
) {
  try {
    const { slug, roleId } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const body = await request.json().catch(() => ({}));
    await setRolePermissions(tenantId, roleId, Array.isArray(body.permissionIds) ? body.permissionIds.map(String) : []);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update tenant role:", error);
    return NextResponse.json({ error: error?.message || "Failed to update role" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; roleId: string }> },
) {
  try {
    const { slug, roleId } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    await deleteTenantRole(tenantId, roleId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete tenant role:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete role" }, { status: 500 });
  }
}
