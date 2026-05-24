import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { appointments, labOrders, notifications, queues } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveDoctorContext } from "@/lib/doctor/server";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function mapAlertTone(type: string | null, metadata: any) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("critical") || normalized.includes("urgent")) return "warning";
  if (normalized === "lab_result_ready") return "warning";
  if (normalized === "appointment" || metadata?.category === "appointment") return "info";
  return "info";
}

export async function GET(request: NextRequest) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  try {
    const todayStart = startOfToday();
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const [unreadNotifications, todayAppointmentCount, activeQueueCount, pendingLabCount] = await Promise.all([
      db.query.notifications.findMany({
        where: and(
          eq(notifications.userId, doctor.id),
          eq(notifications.tenantId, doctor.tenantId),
          eq(notifications.read, false),
          isNull(notifications.deletedAt)
        ),
        orderBy: desc(notifications.createdAt),
        limit: 10,
      }),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, doctor.tenantId),
            eq(appointments.doctorId, doctor.id),
            isNull(appointments.deletedAt),
            gte(appointments.scheduledAt, todayStart),
            lt(appointments.scheduledAt, tomorrowStart),
            eq(appointments.status, "scheduled")
          )
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(queues)
        .where(
          and(
            eq(queues.tenantId, doctor.tenantId),
            eq(queues.assignedTo, doctor.id),
            isNull(queues.deletedAt),
            sql`${queues.status} in ('waiting', 'called', 'in-progress')`
          )
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(labOrders)
        .where(
          and(
            eq(labOrders.tenantId, doctor.tenantId),
            eq(labOrders.doctorId, doctor.id),
            isNull(labOrders.deletedAt),
            sql`${labOrders.status} in ('ordered', 'collected', 'processing', 'completed')`
          )
        ),
    ]);

    const alerts = unreadNotifications.map((item) => ({
      id: item.id,
      type: mapAlertTone(item.type, item.metadata),
      title: item.title || "Doctor alert",
      message: item.message || "An update requires your attention.",
      createdAt: item.createdAt,
      read: item.read,
      sourceType: item.type,
      metadata: item.metadata ?? {},
    }));

    if ((todayAppointmentCount[0]?.count ?? 0) > 0) {
      alerts.push({
        id: "today-appointments",
        type: "info",
        title: "Today's Schedule",
        message: `You have ${todayAppointmentCount[0].count} scheduled appointment(s) today.`,
        createdAt: new Date(),
        read: false,
        sourceType: "schedule_summary",
        metadata: { count: todayAppointmentCount[0].count },
      });
    }

    if ((activeQueueCount[0]?.count ?? 0) > 0) {
      alerts.push({
        id: "active-queue",
        type: "warning",
        title: "Queue Waiting",
        message: `${activeQueueCount[0].count} patient(s) are currently in your consultation queue.`,
        createdAt: new Date(),
        read: false,
        sourceType: "queue_summary",
        metadata: { count: activeQueueCount[0].count },
      });
    }

    if ((pendingLabCount[0]?.count ?? 0) > 0) {
      alerts.push({
        id: "pending-labs",
        type: "warning",
        title: "Lab Follow-up",
        message: `${pendingLabCount[0].count} lab order(s) still need review or closure.`,
        createdAt: new Date(),
        read: false,
        sourceType: "lab_summary",
        metadata: { count: pendingLabCount[0].count },
      });
    }

    const sorted = alerts
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12);

    return NextResponse.json({ alerts: sorted });
  } catch (error) {
    console.error("Doctor alerts API error:", error);
    return NextResponse.json({ error: "Failed to load alerts" }, { status: 500 });
  }
}
