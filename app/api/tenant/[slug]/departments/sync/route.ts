import { NextRequest, NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { syncDefaultDepartments } from "@/lib/tenant-departments";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const result = await syncDefaultDepartments(tenantId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Failed to sync tenant departments:", error);
    return NextResponse.json({ error: "Failed to sync departments" }, { status: 500 });
  }
}
