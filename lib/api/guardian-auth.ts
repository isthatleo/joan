import { NextRequest } from "next/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { guardians, users } from "@/lib/db/schema";

export async function resolveGuardianForTenant(request: NextRequest, tenantId: string) {
  const session = await auth.api.getSession({ headers: request.headers });
  const email = session?.user?.email;
  if (!email) {
    return { status: 401 as const, error: "Unauthorized", user: null, guardian: null };
  }

  const user = await db.query.users.findFirst({
    where: and(ilike(users.email, email), eq(users.tenantId, tenantId), isNull(users.deletedAt)),
    columns: { id: true, email: true, fullName: true, phone: true, role: true, tenantId: true, isActive: true },
  });

  if (!user?.isActive) {
    return { status: 403 as const, error: "Guardian account is inactive or not found", user: null, guardian: null };
  }

  const guardian = await db.query.guardians.findFirst({
    where: and(eq(guardians.tenantId, tenantId), eq(guardians.userId, user.id), isNull(guardians.deletedAt)),
    columns: { id: true, tenantId: true, userId: true, relationship: true },
  });

  if (!guardian) {
    return { status: 404 as const, error: "Guardian profile not found", user, guardian: null };
  }

  return { status: 200 as const, error: null, user, guardian };
}
