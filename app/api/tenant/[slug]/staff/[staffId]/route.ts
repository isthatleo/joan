import { NextRequest, NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { getStaffRows, requireTenantAdmin } from "@/lib/tenant-staff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; staffId: string }> },
) {
  try {
    const { slug, staffId } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const staff = await getStaffRows(tenantId);
    const member = staff.find((item) => item.id === staffId);
    if (!member) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    return NextResponse.json({ staff: member });
  } catch (error) {
    console.error("Error fetching staff member:", error);
    return NextResponse.json({ error: "Failed to fetch staff member" }, { status: 500 });
  }
}
