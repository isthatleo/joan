import { NextRequest, NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { createTenantRole, getTenantAccessControl, requireTenantAdmin } from "@/lib/tenant-access-control";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    return NextResponse.json(await getTenantAccessControl(tenantId));
  } catch (error) {
    console.error("Failed to fetch tenant roles:", error);
    return NextResponse.json({ error: "Failed to fetch roles and permissions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const body = await request.json().catch(() => ({}));
    const role = await createTenantRole(tenantId, {
      name: String(body.name || "").trim(),
      description: String(body.description || "").trim(),
      permissionIds: Array.isArray(body.permissionIds) ? body.permissionIds.map(String) : [],
    });

    return NextResponse.json({ success: true, roleId: role.id }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create tenant role:", error);
    return NextResponse.json({ error: error?.message || "Failed to create role" }, { status: 500 });
  }
}
