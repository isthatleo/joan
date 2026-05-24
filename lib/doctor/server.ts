import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roles, userRoles, users } from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";

type DoctorContextResult =
  | { ok: true; doctor: { id: string; tenantId: string | null; email: string; fullName: string | null } }
  | { ok: false; status: number; error: string };

export async function resolveDoctorContext(headers: Headers): Promise<DoctorContextResult> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.email) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const doctorUser = await db
    .select({
      id: users.id,
      tenantId: users.tenantId,
      email: users.email,
      fullName: users.fullName,
      baseRole: users.role,
      linkedRole: roles.name,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(ilike(users.email, session.user.email), isNull(users.deletedAt), eq(users.isActive, true)));

  const doctor = doctorUser.find(
    (row) => String(row.baseRole || "").toLowerCase() === "doctor" || String(row.linkedRole || "").toLowerCase() === "doctor"
  );

  if (!doctor) {
    return { ok: false, status: 403, error: "Doctor access required" };
  }

  return {
    ok: true,
    doctor: {
      id: doctor.id,
      tenantId: doctor.tenantId ?? null,
      email: doctor.email,
      fullName: doctor.fullName ?? null,
    },
  };
}
