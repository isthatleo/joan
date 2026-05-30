import { NextRequest, NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { getTenantUserAccessDetail, requireTenantAdmin, setUserTenantRole } from "@/lib/tenant-access-control";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> },
) {
  try {
    const { slug, userId } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const user = await getTenantUserAccessDetail(tenantId, userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to fetch tenant user access detail:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> },
) {
  try {
    const { slug, userId } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const body = await request.json().catch(() => ({}));
    const roleId = String(body.roleId || "").trim();
    if (!roleId) return NextResponse.json({ error: "Role is required." }, { status: 400 });

    await setUserTenantRole(tenantId, userId, roleId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update tenant user role:", error);
    return NextResponse.json({ error: error?.message || "Failed to update user role" }, { status: 500 });
  }
}
