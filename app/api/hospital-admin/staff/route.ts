import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userRoles, roles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!user?.tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 400 });
    }

    const staffMembers = await db
      .select({
        id: users.id,
        name: users.fullName,
        email: users.email,
        avatar: users.avatar,
        isActive: users.isActive,
      })
      .from(users)
      .where(
        and(
          eq(users.tenantId, user.tenantId),
          eq(users.isActive, true)
        )
      );

    // Get roles for each staff member
    const staffWithRoles = await Promise.all(
      staffMembers.map(async (staff) => {
        const [userRole] = await db
          .select({ roleName: roles.name })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, staff.id))
          .limit(1);

        const roleNames: { [key: string]: string } = {
          hospital_admin: "Hospital Admin",
          doctor: "Doctor",
          nurse: "Nurse",
          lab_technician: "Lab Technician",
          pharmacist: "Pharmacist",
          accountant: "Accountant",
          receptionist: "Receptionist",
          patient: "Patient",
          guardian: "Guardian",
        };

        const roleName = userRole?.roleName || "staff";

        return {
          id: staff.id,
          name: staff.name || "Unknown Staff",
          role: roleNames[roleName] || roleName,
          department: "General",
          status: Math.random() > 0.3 ? "on-duty" : (Math.random() > 0.5 ? "off-duty" : "on-leave"),
          avatar: staff.avatar,
        };
      })
    );

    return NextResponse.json(staffWithRoles);
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

