import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departments, users, queues } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!user?.tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 400 });
    }
    const tenantId = user.tenantId;

    const depts = await db
      .select()
      .from(departments)
      .where(eq(departments.tenantId, tenantId));

    const departmentMetrics = await Promise.all(
      depts.map(async (dept) => {
        const [activeQueueResult, totalQueueResult, waitingRowsResult] = await Promise.allSettled([
          db
            .select({ count: count() })
            .from(queues)
            .where(
              and(
                eq(queues.tenantId, tenantId),
                eq(queues.departmentId, dept.id),
                eq(queues.status, "waiting")
              )
            ),
          db
            .select({ count: count() })
            .from(queues)
            .where(
              and(
                eq(queues.tenantId, tenantId),
                eq(queues.departmentId, dept.id)
              )
            ),
          db
            .select({ createdAt: queues.createdAt })
            .from(queues)
            .where(
              and(
                eq(queues.tenantId, tenantId),
                eq(queues.departmentId, dept.id),
                eq(queues.status, "waiting")
              )
            ),
        ]);

        const activeQueueRow = activeQueueResult.status === "fulfilled" ? activeQueueResult.value[0] : null;
        const totalQueueRow = totalQueueResult.status === "fulfilled" ? totalQueueResult.value[0] : null;
        const waitingQueueRows = waitingRowsResult.status === "fulfilled" ? waitingRowsResult.value : [];

        const now = Date.now();
        const avgWaitTime = waitingQueueRows.length > 0
          ? Math.round(
              waitingQueueRows.reduce((total, row) => total + Math.max(0, now - row.createdAt.getTime()), 0) /
                waitingQueueRows.length /
                60000
            )
          : 0;

        const activeQueue = activeQueueRow?.count || 0;
        const totalQueue = totalQueueRow?.count || 0;
        const utilization = Math.min(
          totalQueue > 0 ? Math.round((activeQueue / totalQueue) * 100) : 0,
          100
        );

        let status: "excellent" | "good" | "warning" | "critical" = "excellent";
        if (utilization > 95 || avgWaitTime > 60) status = "critical";
        else if (utilization > 85 || avgWaitTime > 30) status = "warning";
        else if (utilization > 70 || avgWaitTime > 15) status = "good";

        return {
          id: dept.id,
          name: dept.name || "Unknown Department",
          patients: activeQueue,
          utilization,
          status,
          avgWaitTime,
          activeQueue,
          totalQueue,
        };
      })
    );

    return NextResponse.json(departmentMetrics);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json([]);
  }
}

