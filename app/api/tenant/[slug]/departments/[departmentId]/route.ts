import { NextRequest, NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { getDepartmentRows } from "@/lib/tenant-departments";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; departmentId: string }> },
) {
  try {
    const { slug, departmentId } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const departments = await getDepartmentRows(tenantId);
    const department = departments.find((item) => item.id === departmentId);
    if (!department) return NextResponse.json({ error: "Department not found" }, { status: 404 });

    return NextResponse.json({ department });
  } catch (error) {
    console.error("Failed to fetch tenant department:", error);
    return NextResponse.json({ error: "Failed to fetch department" }, { status: 500 });
  }
}
