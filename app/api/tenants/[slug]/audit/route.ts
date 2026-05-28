import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, auditLogs, provisioningRuns, users } from "@/lib/db/schema";
import { eq, desc, inArray, or, ilike } from "drizzle-orm";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(req, slug);
    if (!access.ok || !access.tenant) return tenantAccessResponse(access);
    if (!access.canViewAudit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(5, Number(url.searchParams.get("pageSize") || 20)));
    const kind = (url.searchParams.get("kind") || "all") as "all" | "provisioning" | "audit";
    const status = url.searchParams.get("status") || ""; // running|completed|failed
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();

    const tenant = access.tenant;

    let runs: any[] = [];
    if (kind === "all" || kind === "provisioning") {
      const baseRuns = await db
        .select()
        .from(provisioningRuns)
        .where(eq(provisioningRuns.tenantId, tenant.id))
        .orderBy(desc(provisioningRuns.startedAt))
        .limit(500);
      runs = baseRuns.filter((r: any) => {
        if (status && r.status !== status) return false;
        if (q && !(`${r.stage || ""} ${r.errorMessage || ""}`.toLowerCase().includes(q))) return false;
        return true;
      });
    }

    const tenantUsers = await db
      .select({ id: users.id, fullName: users.fullName, email: users.email })
      .from(users).where(eq(users.tenantId, tenant.id));
    const userIds = tenantUsers.map(u => u.id);
    const userMap = new Map(tenantUsers.map(u => [u.id, u]));

    let logs: any[] = [];
    if (kind === "all" || kind === "audit") {
      const conditions = [eq(auditLogs.entityId, tenant.id)];
      if (userIds.length > 0) conditions.push(inArray(auditLogs.userId, userIds));
      if (q) conditions.push(ilike(auditLogs.action, `%${q}%`));
      const baseLogs = await db
        .select()
        .from(auditLogs)
        .where(or(...conditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(500);
      logs = baseLogs.filter((l: any) =>
        !q ? true : `${l.action || ""} ${JSON.stringify(l.metadata || {})}`.toLowerCase().includes(q)
      );
    }

    const events = [
      ...runs.map((r: any) => ({
        id: `run:${r.id}`,
        kind: "provisioning" as const,
        action: r.status === "completed" ? "tenant.provisioned" : r.status === "failed" ? "tenant.provision_failed" : "tenant.provisioning",
        stage: r.stage,
        status: r.status,
        errorMessage: r.errorMessage,
        actor: null,
        timestamp: r.completedAt || r.startedAt,
        metadata: r.metadata,
      })),
      ...logs.map((l: any) => ({
        id: `log:${l.id}`,
        kind: "audit" as const,
        action: l.action,
        status: null,
        actor: l.userId ? {
          id: l.userId,
          name: userMap.get(l.userId)?.fullName || userMap.get(l.userId)?.email || "Unknown",
          email: userMap.get(l.userId)?.email,
        } : null,
        timestamp: l.createdAt,
        metadata: l.metadata,
      })),
    ].sort((a, b) => new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime());

    const total = events.length;
    const start = (page - 1) * pageSize;
    const paged = events.slice(start, start + pageSize);

    return NextResponse.json({
      events: paged,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      filters: { kind, status, q },
    });
  } catch (e: any) {
    console.error("[tenant audit GET]", e);
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}
