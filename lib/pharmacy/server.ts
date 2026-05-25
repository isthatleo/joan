import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roles, tenants, userRoles, users } from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";

type PharmacyContextResult =
  | {
      ok: true;
      pharmacist: {
        id: string;
        tenantId: string;
        email: string;
        fullName: string | null;
        tenantSlug: string;
      };
    }
  | { ok: false; status: number; error: string };

export async function resolvePharmacyContext(
  headers: Headers,
  rawSlug?: string | null
): Promise<PharmacyContextResult> {
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

  const pharmacist = rows.find(
    (row) =>
      String(row.baseRole || "").toLowerCase() === "pharmacist" ||
      String(row.linkedRole || "").toLowerCase() === "pharmacist"
  );

  if (!pharmacist?.tenantId || !pharmacist.tenantSlug) {
    return { ok: false, status: 403, error: "Pharmacist access required" };
  }

  if (rawSlug && rawSlug !== pharmacist.tenantSlug) {
    return { ok: false, status: 403, error: "Invalid tenant scope" };
  }

  return {
    ok: true,
    pharmacist: {
      id: pharmacist.id,
      tenantId: pharmacist.tenantId,
      email: pharmacist.email,
      fullName: pharmacist.fullName ?? null,
      tenantSlug: pharmacist.tenantSlug,
    },
  };
}
