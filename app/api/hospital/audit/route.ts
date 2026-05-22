import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogs, users, tenants } from "@/lib/db/schema";
import { eq, desc, isNull } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const role = searchParams.get("role") || "hospital_admin";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let whereCondition: any;

    // Super admins see all audit logs across all tenants
    if (role === "super_admin") {
      whereCondition = undefined; // No filtering for super admin
    }
    // Hospital admins only see their tenant's audit logs
    else if (role === "hospital_admin") {
      if (!tenantId) {
        return NextResponse.json(
          { error: "tenantId is required for hospital_admin" },
          { status: 400 }
        );
      }
      whereCondition = eq(auditLogs.tenantId, tenantId);
    } else {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Build the query
    let query = db
      .select({
        id: auditLogs.id,
        tenantId: auditLogs.tenantId,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        },
        tenant: {
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
        },
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .leftJoin(tenants, eq(auditLogs.tenantId, tenants.id));

    if (whereCondition) {
      query = query.where(whereCondition);
    }

    const logs = await query
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    let countQuery = db.select({ count: auditLogs.id }).from(auditLogs);
    if (whereCondition) {
      countQuery = countQuery.where(whereCondition) as any;
    }
    const countResult = await countQuery;
    const totalCount = logs.length; // For current page

    // Format the response
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      tenantId: log.tenantId,
      tenantName: log.tenant?.name || "System",
      tenantSlug: log.tenant?.slug,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      actor: log.user?.email || log.user?.fullName || "System",
      userId: log.user?.id,
      timestamp: log.createdAt,
      metadata: log.metadata,
      type: getLogType(log.action),
    }));

    return NextResponse.json({
      logs: formattedLogs,
      total: logs.length,
    });
  } catch (error) {
    console.error("[audit logs GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs", details: String(error) },
      { status: 500 }
    );
  }
}

function getLogType(action: string): "info" | "warning" | "error" {
  if (action.includes("delete") || action.includes("remove")) {
    return "warning";
  }
  if (action.includes("error") || action.includes("fail")) {
    return "error";
  }
  return "info";
}
