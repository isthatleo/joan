import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getStaffRows, requireTenantAdmin } from "@/lib/tenant-staff";

export async function PATCH(
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

    const body = await request.json().catch(() => ({}));
    const isActive = Boolean(body.isActive);
    const staff = await getStaffRows(tenantId);
    const member = staff.find((item) => item.id === staffId);
    if (!member) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, staffId));

    return NextResponse.json({
      success: true,
      isActive,
      message: isActive ? "Staff member reactivated." : "Staff member deactivated and blocked from dashboard access.",
    });
  } catch (error) {
    console.error("Error updating staff status:", error);
    return NextResponse.json({ error: "Failed to update staff status" }, { status: 500 });
  }
}
