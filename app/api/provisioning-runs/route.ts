import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { provisioningRuns, roles, tenants, userRoles, users } from "@/lib/db/schema";
import { and, eq, ilike, isNull, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 20);

    const session = await auth.api.getSession({ headers: request.headers }).catch(() => null as any);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appUser = await db.query.users.findFirst({
      where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    });
    if (!appUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignedRoles = await db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, appUser.id))
      .catch(() => []);
    const roleNames = new Set([appUser.role, ...assignedRoles.map((role) => role.name)].map((role) => String(role || "").toLowerCase()));
    const isSuperAdmin = roleNames.has("super_admin");
    const userTenantId = appUser.tenantId?.toString();

    if (!isSuperAdmin && !userTenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let whereClause: any = undefined;
    if (!isSuperAdmin) {
      whereClause = eq(provisioningRuns.tenantId, userTenantId!);
    }

    let query: any = db
      .select({
        id: provisioningRuns.id,
        status: provisioningRuns.status,
        stage: provisioningRuns.stage,
        errorMessage: provisioningRuns.errorMessage,
        metadata: provisioningRuns.metadata,
        startedAt: provisioningRuns.startedAt,
        completedAt: provisioningRuns.completedAt,
        tenant: {
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
        },
      })
      .from(provisioningRuns)
      .leftJoin(tenants, eq(provisioningRuns.tenantId, tenants.id));
    if (whereClause) query = query.where(whereClause);
    const runs = await query.orderBy(desc(provisioningRuns.startedAt)).limit(limit);

    return NextResponse.json(runs);
  } catch (error) {
    console.error("[provisioning-runs] failed:", error);
    return NextResponse.json({ error: "Failed to fetch provisioning runs" }, { status: 500 });
  }
}
