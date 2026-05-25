import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { auditLogs, bedAssignments, notifications, patients, queues } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveNurseContext } from "@/lib/nurse/server";
import { patientNameSql } from "@/lib/nurse/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveNurseContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const items = await db
    .select({
      id: queues.id,
      patientId: patients.id,
      patientName: patientNameSql,
      patientEmail: patients.email,
      patientPhone: patients.phone,
      room: bedAssignments.room,
      ward: bedAssignments.ward,
      priority: queues.priority,
      queueNumber: queues.queueNumber,
      position: queues.position,
      checkInTime: queues.createdAt,
      assignedNurse: sql<string>`${context.nurse.fullName || "Nurse"}`,
      status: queues.status,
    })
    .from(queues)
    .innerJoin(patients, eq(patients.id, queues.patientId))
    .leftJoin(bedAssignments, and(eq(bedAssignments.patientId, patients.id), eq(bedAssignments.tenantId, context.nurse.tenantId), isNull(bedAssignments.deletedAt)))
    .where(and(eq(queues.tenantId, context.nurse.tenantId), isNull(queues.deletedAt)))
    .orderBy(asc(queues.position), asc(queues.createdAt));

  const stats = {
    waiting: items.filter((item) => item.status === "waiting").length,
    inProgress: items.filter((item) => item.status === "in-progress").length,
    completed: items.filter((item) => item.status === "completed").length,
    urgent: items.filter((item) => item.priority === "urgent" || item.priority === "high").length,
  };

  return NextResponse.json({ queue: items, stats });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const context = await resolveNurseContext(request.headers, body.slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { nurse } = context;

  if (body.action === "call-next") {
    const [nextItem] = await db
      .select({ id: queues.id, patientId: queues.patientId })
      .from(queues)
      .where(and(eq(queues.tenantId, nurse.tenantId), eq(queues.status, "waiting"), isNull(queues.deletedAt)))
      .orderBy(asc(queues.position), asc(queues.createdAt))
      .limit(1);

    if (!nextItem) {
      return NextResponse.json({ error: "No waiting patients in queue" }, { status: 404 });
    }

    await db.update(queues).set({ status: "in-progress", assignedTo: nurse.id, calledAt: new Date(), updatedAt: new Date() }).where(eq(queues.id, nextItem.id));
    return NextResponse.json({ success: true, id: nextItem.id });
  }

  if (!["waiting", "in-progress", "completed"].includes(body.status)) {
    return NextResponse.json({ error: "Unsupported queue status" }, { status: 400 });
  }

  await db.update(queues).set({
    status: body.status,
    assignedTo: nurse.id,
    calledAt: body.status === "in-progress" ? new Date() : undefined,
    completedAt: body.status === "completed" ? new Date() : null,
    updatedAt: new Date(),
  }).where(and(eq(queues.id, body.id), eq(queues.tenantId, nurse.tenantId)));

  await db.insert(auditLogs).values({
    tenantId: nurse.tenantId,
    userId: nurse.id,
    action: `queue.${body.status}`,
    entity: "queue",
    entityId: body.id,
    metadata: { patientId: body.patientId || null },
  });

  return NextResponse.json({ success: true });
}
