import { NextRequest, NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { createDepartment, getDepartmentRows, getDepartmentStats } from "@/lib/tenant-departments";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const departments = await getDepartmentRows(tenantId);
    const stats = await getDepartmentStats(tenantId);
    return NextResponse.json({ departments, stats });
  } catch (error) {
    console.error("Failed to fetch tenant departments:", error);
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
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
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Department name is required." }, { status: 400 });

    const department = await createDepartment(tenantId, {
      name,
      description: String(body.description || "").trim(),
      category: String(body.category || "Clinical").trim(),
      level: body.level === "major" || body.level === "support" ? body.level : "minor",
      status: body.status === "excellent" || body.status === "warning" || body.status === "critical" ? body.status : "good",
      headUserId: String(body.headUserId || "").trim(),
      beds: Number(body.beds || 0),
      budget: Number(body.budget || 0),
      equipmentCount: Number(body.equipmentCount || 0),
      lastMaintenance: String(body.lastMaintenance || "").trim(),
    });

    return NextResponse.json({ success: true, departmentId: department.id }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create tenant department:", error);
    return NextResponse.json({ error: error?.message || "Failed to create department" }, { status: 500 });
  }
}
