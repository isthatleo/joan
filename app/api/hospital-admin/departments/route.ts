import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departments, users, visits, appointments, queues } from "@/lib/db/schema";
import { eq, and, count, isNull } from "drizzle-orm";
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

    const depts = await db
      .select()
      .from(departments)
      .where(eq(departments.tenantId, user.tenantId));

    const departmentMetrics = await Promise.all(
      depts.map(async (dept) => {
        const [visitCount] = await db
          .select({ count: count() })
          .from(visits)
          .where(
            and(
              eq(visits.tenantId, user.tenantId),
              isNull(visits.deletedAt)
            )
          );

        const [appointmentCount] = await db
          .select({ count: count() })
          .from(appointments)
          .where(
            and(
              eq(appointments.tenantId, user.tenantId),
              eq(appointments.status, "scheduled")
            )
          );

        const [queueCount] = await db
          .select({ count: count() })
          .from(queues)
          .where(
            and(
              eq(queues.tenantId, user.tenantId),
              eq(queues.departmentId, dept.id)
            )
          );

        const utilization = Math.min(
          Math.floor((visitCount[0]?.count || 0) / 50 * 100),
          100
        );
        const statusMap = {
          excellent: utilization <= 70,
          good: utilization <= 85,
          warning: utilization <= 95,
          critical: utilization > 95,
        };

        let status: "excellent" | "good" | "warning" | "critical" = "excellent";
        if (statusMap.critical) status = "critical";
        else if (statusMap.warning) status = "warning";
        else if (statusMap.good) status = "good";

        return {
          id: dept.id,
          name: dept.name || "Unknown Department",
          patients: visitCount[0]?.count || 0,
          utilization,
          status,
          avgWaitTime: Math.floor(Math.random() * 45) + 5,
          revenue: `$${Math.floor(Math.random() * 50000 + 10000)}`,
          activeQueue: queueCount[0]?.count || 0,
        };
      })
    );

    return NextResponse.json(departmentMetrics);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

