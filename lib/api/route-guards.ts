import { NextRequest, NextResponse } from "next/server";
import { and, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type GuardedUser = {
  id: string;
  tenantId: string | null;
  email: string;
  role: string | null;
  isActive: boolean | null;
};

export async function requireAppUser(request: NextRequest, allowedRoles?: string[]) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }

  const user = await db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: { id: true, tenantId: true, email: true, role: true, isActive: true },
  });

  if (!user?.isActive) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      user: null,
    };
  }

  if (allowedRoles?.length && !allowedRoles.includes(String(user.role || ""))) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      user: null,
    };
  }

  return { ok: true as const, response: null, user: user as GuardedUser };
}

export async function requireTenantUser(request: NextRequest, allowedRoles?: string[]) {
  const access = await requireAppUser(request, allowedRoles);
  if (!access.ok) return access;
  if (!access.user.tenantId) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Tenant context required" }, { status: 403 }),
      user: null,
    };
  }
  return access;
}
