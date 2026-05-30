import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, provisioningRuns, users } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok || !access.tenant) return tenantAccessResponse(access);
    if (!access.canViewAudit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") || 20)));
    const kind = (searchParams.get("kind") || "all") as "all" | "provisioning" | "audit";
    const status = searchParams.get("status") || "";
    const q = (searchParams.get("q") || "").trim();
    const days = Math.max(1, Math.min(3650, Number(searchParams.get("days") || 365)));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const tenantUsers = await db
      .select({ id: users.id, fullName: users.fullName, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.tenantId, access.tenant.id));
    const userIds = tenantUsers.map((user) => user.id);
    const userMap = new Map(tenantUsers.map((user) => [user.id, user]));

    let runs: any[] = [];
    if (kind === "all" || kind === "provisioning") {
      const baseConditions = [eq(provisioningRuns.tenantId, access.tenant.id), gte(provisioningRuns.startedAt, cutoff)];
      if (status) baseConditions.push(eq(provisioningRuns.status, status));
      const baseRuns = await db
        .select()
        .from(provisioningRuns)
        .where(and(...baseConditions))
        .orderBy(desc(provisioningRuns.startedAt))
        .limit(1000);
      runs = q
        ? baseRuns.filter((run: any) => `${run.stage || ""} ${run.status || ""} ${run.errorMessage || ""} ${JSON.stringify(run.metadata || {})}`.toLowerCase().includes(q.toLowerCase()))
        : baseRuns;
    }

    let logs: any[] = [];
    if (kind === "all" || kind === "audit") {
      const tenantConditions = [eq(auditLogs.tenantId, access.tenant.id)];
      if (userIds.length > 0) tenantConditions.push(inArray(auditLogs.userId, userIds));
      const baseConditions = [or(...tenantConditions), gte(auditLogs.createdAt, cutoff)];
      if (q) baseConditions.push(or(ilike(auditLogs.action, `%${q}%`), ilike(auditLogs.entity, `%${q}%`)));
      const baseLogs = await db
        .select()
        .from(auditLogs)
        .where(and(...baseConditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(1000);
      logs = q
        ? baseLogs.filter((log: any) => `${log.action || ""} ${log.entity || ""} ${JSON.stringify(log.metadata || {})}`.toLowerCase().includes(q.toLowerCase()))
        : baseLogs;
    }

    const events = [
      ...runs.map((run: any) => ({
        id: `run:${run.id}`,
        rawId: run.id,
        kind: "provisioning",
        action: run.status === "completed" ? "tenant.provisioned" : run.status === "failed" ? "tenant.provision_failed" : "tenant.provisioning",
        stage: run.stage,
        status: run.status,
        errorMessage: run.errorMessage,
        actor: null,
        timestamp: run.completedAt || run.startedAt,
        metadata: run.metadata,
      })),
      ...logs.map((log: any) => ({
        id: `log:${log.id}`,
        rawId: log.id,
        kind: "audit",
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        status: null,
        actor: log.userId ? {
          id: log.userId,
          name: userMap.get(log.userId)?.fullName || userMap.get(log.userId)?.email || "Unknown",
          email: userMap.get(log.userId)?.email,
          role: userMap.get(log.userId)?.role,
        } : null,
        timestamp: log.createdAt,
        metadata: log.metadata,
      })),
    ].sort((a, b) => new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime());

    const total = events.length;
    const start = (page - 1) * pageSize;
    const paged = events.slice(start, start + pageSize);
    const [auditCount] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(eq(auditLogs.tenantId, access.tenant.id));

    return NextResponse.json({
      events: paged,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      filters: { kind, status, q, days },
      totals: { auditEvents: Number(auditCount?.count || 0), visibleEvents: total },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error: any) {
    console.error("[tenant audit events]", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch audit events" }, { status: 500 });
  }
}
