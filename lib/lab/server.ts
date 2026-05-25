import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roles, tenants, userRoles, users } from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";

type LabContextResult =
  | {
      ok: true;
      technician: {
        id: string;
        tenantId: string;
        email: string;
        fullName: string | null;
        tenantSlug: string;
      };
    }
  | { ok: false; status: number; error: string };

export async function resolveLabContext(headers: Headers, rawSlug?: string | null): Promise<LabContextResult> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.email) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const rows = await db
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

  const technician = rows.find(
    (row) =>
      String(row.baseRole || "").toLowerCase() === "lab_technician" ||
      String(row.linkedRole || "").toLowerCase() === "lab_technician"
  );

  if (!technician?.tenantId || !technician.tenantSlug) {
    return { ok: false, status: 403, error: "Lab technician access required" };
  }

  if (rawSlug && rawSlug !== technician.tenantSlug) {
    return { ok: false, status: 403, error: "Invalid tenant scope" };
  }

  return {
    ok: true,
    technician: {
      id: technician.id,
      tenantId: technician.tenantId,
      email: technician.email,
      fullName: technician.fullName ?? null,
      tenantSlug: technician.tenantSlug,
    },
  };
}
