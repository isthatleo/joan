import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { patients, queues } from "@/lib/db/schema";
import { resolveDoctorContext } from "@/lib/doctor/server";

const ACTIVE_QUEUE_STATUSES = ["waiting", "called", "in-progress"] as const;
const ALLOWED_QUEUE_STATUSES = ["waiting", "called", "in-progress", "completed", "no-show"] as const;

function matchesSearch(row: {
  patientName: string;
  patientEmail: string | null;
  patientPhone: string | null;
  queueNumber: string | null;
  globalPatientId: string | null;
}, search: string) {
  if (!search) return true;
  const term = search.toLowerCase();
  return [row.patientName, row.patientEmail, row.patientPhone, row.queueNumber, row.globalPatientId]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(term));
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
    const search = request.nextUrl.searchParams.get("search")?.trim() || "";
    const status = request.nextUrl.searchParams.get("status")?.trim() || "all";

    const queueRows = await db
      .select({
        id: queues.id,
        patientId: patients.id,
        patientName: sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`,
        patientEmail: patients.email,
        patientPhone: patients.phone,
        patientGender: patients.gender,
        patientDob: patients.dob,
        globalPatientId: patients.globalPatientId,
        queueNumber: queues.queueNumber,
        status: queues.status,
        priority: queues.priority,
        position: queues.position,
        calledAt: queues.calledAt,
        completedAt: queues.completedAt,
        createdAt: queues.createdAt,
        estimatedWaitMinutes: sql<number>`greatest(extract(epoch from (now() - ${queues.createdAt})) / 60, 0)::int`,
      })
      .from(queues)
      .innerJoin(patients, eq(patients.id, queues.patientId))
      .where(
        and(
          eq(queues.tenantId, doctor.tenantId),
          eq(queues.assignedTo, doctor.id),
          isNull(queues.deletedAt),
          isNull(patients.deletedAt)
        )
      )
      .orderBy(asc(sql`case
        when ${queues.status} = 'in-progress' then 0
        when ${queues.status} = 'called' then 1
        when ${queues.status} = 'waiting' then 2
        when ${queues.status} = 'completed' then 3
        else 4
      end`), asc(queues.position), asc(queues.createdAt));

    const filteredQueue = queueRows.filter((row) => {
      if (status !== "all" && row.status !== status) {
        return false;
      }
      return matchesSearch(row, search);
    });

    const activeEntry =
      queueRows.find((row) => row.status === "in-progress") ||
      queueRows.find((row) => row.status === "called") ||
      null;

    const waitingEntries = queueRows.filter((row) => row.status === "waiting");
    const recentCompleted = queueRows.filter((row) => row.status === "completed" || row.status === "no-show").slice(0, 6);

    const waitPool = queueRows.filter((row) => ACTIVE_QUEUE_STATUSES.includes((row.status || "") as (typeof ACTIVE_QUEUE_STATUSES)[number]));
    const stats = {
      total: queueRows.length,
      waiting: queueRows.filter((row) => row.status === "waiting").length,
      called: queueRows.filter((row) => row.status === "called").length,
      inProgress: queueRows.filter((row) => row.status === "in-progress").length,
      completedToday: queueRows.filter((row) => row.status === "completed").length,
      averageWaitMinutes: waitPool.length > 0
        ? Math.round(waitPool.reduce((sum, row) => sum + Number(row.estimatedWaitMinutes || 0), 0) / waitPool.length)
        : 0,
    };

    return NextResponse.json({
      queue: filteredQueue,
      stats,
      activeEntry,
      nextUp: waitingEntries.slice(0, 5),
      recentCompleted,
    });
  } catch (error) {
    console.error("Doctor queue API error:", error);
    return NextResponse.json({ error: "Failed to load queue" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const patientId = String(body.patientId || "").trim();
    const priority = String(body.priority || "routine").trim() || "routine";

    if (!patientId) {
      return NextResponse.json({ error: "Patient is required" }, { status: 400 });
    }

    const patient = await db.query.patients.findFirst({
      where: and(eq(patients.id, patientId), eq(patients.tenantId, doctor.tenantId), isNull(patients.deletedAt)),
      columns: { id: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const existingActive = await db.query.queues.findFirst({
      where: and(
        eq(queues.tenantId, doctor.tenantId),
        eq(queues.assignedTo, doctor.id),
        eq(queues.patientId, patientId),
        isNull(queues.deletedAt),
        or(
          eq(queues.status, "waiting"),
          eq(queues.status, "called"),
          eq(queues.status, "in-progress")
        )!
      ),
      columns: { id: true },
    });

    if (existingActive) {
      return NextResponse.json({ error: "Patient is already in your active queue" }, { status: 409 });
    }

    const [positionRow] = await db
      .select({ maxPosition: sql<number>`coalesce(max(${queues.position}), 0)::int` })
      .from(queues)
      .where(
        and(
          eq(queues.tenantId, doctor.tenantId),
          eq(queues.assignedTo, doctor.id),
          isNull(queues.deletedAt),
          or(
            eq(queues.status, "waiting"),
            eq(queues.status, "called"),
            eq(queues.status, "in-progress")
          )!
        )
      );

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(queues)
      .where(
        and(
          eq(queues.tenantId, doctor.tenantId),
          eq(queues.assignedTo, doctor.id),
          isNull(queues.deletedAt),
          sql`date(${queues.createdAt}) = current_date`
        )
      );

    const [created] = await db
      .insert(queues)
      .values({
        tenantId: doctor.tenantId,
        patientId,
        assignedTo: doctor.id,
        queueNumber: `Q-${String((countRow?.total ?? 0) + 1).padStart(3, "0")}`,
        status: "waiting",
        priority,
        position: (positionRow?.maxPosition ?? 0) + 1,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Doctor queue create API error:", error);
    return NextResponse.json({ error: "Failed to add patient to queue" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const id = String(body.id || "").trim();
    const status = String(body.status || "").trim();

    if (!id || !status) {
      return NextResponse.json({ error: "Queue id and status are required" }, { status: 400 });
    }

    if (!ALLOWED_QUEUE_STATUSES.includes(status as (typeof ALLOWED_QUEUE_STATUSES)[number])) {
      return NextResponse.json({ error: "Invalid queue status" }, { status: 400 });
    }

    const existing = await db.query.queues.findFirst({
      where: and(eq(queues.id, id), eq(queues.tenantId, doctor.tenantId), eq(queues.assignedTo, doctor.id), isNull(queues.deletedAt)),
      columns: { id: true, calledAt: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "waiting") {
      updateData.calledAt = null;
      updateData.completedAt = null;
    }
    if (status === "called" || status === "in-progress") {
      updateData.calledAt = existing.calledAt ?? new Date();
      updateData.completedAt = null;
    }
    if (status === "completed" || status === "no-show") {
      updateData.completedAt = new Date();
      updateData.calledAt = existing.calledAt ?? new Date();
    }

    const [updated] = await db
      .update(queues)
      .set(updateData)
      .where(and(eq(queues.id, id), eq(queues.tenantId, doctor.tenantId), eq(queues.assignedTo, doctor.id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Doctor queue update API error:", error);
    return NextResponse.json({ error: "Failed to update queue" }, { status: 500 });
  }
}
