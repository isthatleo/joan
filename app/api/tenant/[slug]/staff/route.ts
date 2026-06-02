import { NextRequest, NextResponse } from "next/server";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { createStaffMember, getStaffRows, isStaffRole, requireTenantAdmin } from "@/lib/tenant-staff";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const staff = await getStaffRows(tenantId);
    const stats = {
      total: staff.length,
      active: staff.filter((member) => member.isActive).length,
      inactive: staff.filter((member) => !member.isActive).length,
      doctors: staff.filter((member) => member.role === "doctor").length,
      nurses: staff.filter((member) => member.role === "nurse").length,
      admins: staff.filter((member) => member.role === "hospital_admin").length,
      forcePasswordChange: staff.filter((member) => member.forcePasswordChange).length,
    };

    return NextResponse.json({ staff, stats });
  } catch (error) {
    console.error("Error fetching tenant staff:", error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.fullName || "").trim();
    const role = String(body.role || "").trim();

    if (!fullName || !email || !role) {
      return NextResponse.json({ error: "Full name, email, and role are required." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid staff email address." }, { status: 400 });
    }

    if (!isStaffRole(role)) {
      return NextResponse.json({ error: "Invalid staff role." }, { status: 400 });
    }

    const result = await createStaffMember({
      tenantId,
      tenantSlug: slug,
      email,
      fullName,
      phone: String(body.phone || "").trim() || null,
      address: String(body.address || "").trim() || null,
      role,
      departmentId: String(body.departmentId || "").trim() || null,
      department: String(body.department || "").trim() || null,
      title: String(body.title || "").trim() || null,
      employeeId: String(body.employeeId || "").trim() || null,
      licenseNumber: String(body.licenseNumber || "").trim() || null,
      startDate: String(body.startDate || "").trim() || null,
      emergencyContact: String(body.emergencyContact || "").trim() || null,
    });

    return NextResponse.json({
      success: true,
      staffId: result.staff.id,
      employeeId: result.employeeId,
      loginUrl: result.loginUrl,
      temporaryPassword: result.temporaryPassword,
      message: "Staff member registered. They must change the temporary password after first login.",
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating tenant staff:", error);
    return NextResponse.json({ error: error?.message || "Failed to create staff member" }, { status: 500 });
  }
}
