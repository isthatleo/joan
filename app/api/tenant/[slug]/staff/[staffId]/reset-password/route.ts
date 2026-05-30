import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { generateTemporaryPassword, getStaffRows, requireTenantAdmin, upsertCredentialAuthUser, upsertForcePasswordSettings } from "@/lib/tenant-staff";

export async function POST(
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

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, staffId));
    await upsertCredentialAuthUser({
      appUserId: staffId,
      email: member.email,
      fullName: member.fullName,
      passwordHash,
      emailVerified: true,
    });
    await upsertForcePasswordSettings(staffId, true);

    return NextResponse.json({
      success: true,
      temporaryPassword,
      message: "Temporary password generated. User must change it after login.",
    });
  } catch (error) {
    console.error("Error resetting staff password:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
