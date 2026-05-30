import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userRoles, roles } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
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

    const staffIds = staffMembers.map((staff) => staff.id);
    const roleRows = staffIds.length
      ? await db
          .select({ userId: userRoles.userId, roleName: roles.name })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(inArray(userRoles.userId, staffIds))
          .catch((error) => {
            console.error("Error fetching staff roles:", error);
            return [];
          })
      : [];

    const roleByUserId = new Map(roleRows.map((row) => [row.userId, row.roleName]));
    const roleNames: Record<string, string> = {
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

    const staffWithRoles = staffMembers.map((staff) => {
      const roleName = roleByUserId.get(staff.id) || "staff";

      return {
        id: staff.id,
        name: staff.name || staff.email,
        role: roleNames[roleName] || roleName.replace(/_/g, " "),
        department: roleNames[roleName] || "Staff",
        status: "active",
        avatar: staff.avatar,
      };
    });

    return NextResponse.json(staffWithRoles);
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json([]);
  }
}

