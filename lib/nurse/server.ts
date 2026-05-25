import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roles, tenants, userRoles, users } from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";

type NurseContextResult =
  | {
      ok: true;
      nurse: { id: string; tenantId: string; email: string; fullName: string | null; tenantSlug: string };
    }
  | { ok: false; status: number; error: string };

export async function resolveNurseContext(headers: Headers, rawSlug?: string | null): Promise<NurseContextResult> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.email) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const nurseRows = await db
    .select({
      id: users.id,
      tenantId: users.tenantId,
      email: users.email,
      fullName: users.fullName,
      baseRole: users.role,
      linkedRole: roles.name,
      tenantSlug: tenants.slug,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(tenants, eq(tenants.id, users.tenantId))
    .where(and(ilike(users.email, session.user.email), isNull(users.deletedAt), eq(users.isActive, true)));

  const nurse = nurseRows.find(
    (row) => String(row.baseRole || "").toLowerCase() === "nurse" || String(row.linkedRole || "").toLowerCase() === "nurse"
  );

  if (!nurse?.tenantId || !nurse.tenantSlug) {
    return { ok: false, status: 403, error: "Nurse access required" };
  }

  if (rawSlug && rawSlug !== nurse.tenantSlug) {
    return { ok: false, status: 403, error: "Invalid tenant scope" };
  }

  return {
    ok: true,
    nurse: {
      id: nurse.id,
      tenantId: nurse.tenantId,
      email: nurse.email,
      fullName: nurse.fullName ?? null,
      tenantSlug: nurse.tenantSlug,
    },
  };
}
