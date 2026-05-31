import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { provisioningRuns, roles, tenants, userRoles, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyAuth } from "@/lib/api/auth-middleware";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 20);

    // Get the authenticated user to scope results by their tenant
    const auth = await verifyAuth(request);
    let userTenantId: string | undefined;
    let isSuperAdmin = false;

    if (auth.authenticated && auth.user?.sub) {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.id, auth.user.sub as string),
        });
        userTenantId = user?.tenantId?.toString();
        if (user) {
          const assignedRoles = await db
            .select({ name: roles.name })
            .from(userRoles)
            .innerJoin(roles, eq(roles.id, userRoles.roleId))
            .where(eq(userRoles.userId, user.id));
          const roleNames = new Set([user.role, ...assignedRoles.map((role) => role.name)].map((role) => String(role || "").toLowerCase()));
          isSuperAdmin = roleNames.has("super_admin");
        }
      } catch {
        userTenantId = undefined;
      }
    }

    let whereClause: any = undefined;
    if (userTenantId && !isSuperAdmin) {
      whereClause = eq(provisioningRuns.tenantId, userTenantId);
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
