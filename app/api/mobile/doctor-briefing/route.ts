import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, labOrders, prescriptions, queues, visits } from "@/lib/db/schema";
import { resolveDoctorContext } from "@/lib/doctor/server";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveDoctorContext(request.headers);
    if (!context.ok) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }
    const { doctor } = context;
    if (!doctor.tenantId) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 403 });
    }

    const { start, end } = todayRange();
    const [appointmentsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointments)
      .where(and(eq(appointments.tenantId, doctor.tenantId), eq(appointments.doctorId, doctor.id), gte(appointments.scheduledAt, start), lt(appointments.scheduledAt, end)));
    const [queueRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(queues)
      .where(and(eq(queues.tenantId, doctor.tenantId), eq(queues.assignedTo, doctor.id), eq(queues.status, "waiting")));
    const [urgentRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(queues)
      .where(and(eq(queues.tenantId, doctor.tenantId), eq(queues.assignedTo, doctor.id), eq(queues.priority, "urgent")));
    const [resultsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(labOrders)
      .where(and(eq(labOrders.tenantId, doctor.tenantId), eq(labOrders.doctorId, doctor.id), eq(labOrders.status, "completed")));
    const [prescriptionsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(prescriptions)
      .where(and(eq(prescriptions.tenantId, doctor.tenantId), eq(prescriptions.doctorId, doctor.id), eq(prescriptions.status, "pending")));

    const briefing = {
      appointments: appointmentsRow?.count ?? 0,
      queueWaiting: queueRow?.count ?? 0,
      criticalAlerts: urgentRow?.count ?? 0,
      newResults: resultsRow?.count ?? 0,
      prescriptionsPending: prescriptionsRow?.count ?? 0,
    };
    return NextResponse.json(briefing);
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await resolveDoctorContext(request.headers);
    if (!context.ok) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }
    if (!context.doctor.tenantId) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 403 });
    }

    const { patientId, note, timestamp } = await request.json();
    if (!patientId || !note) {
      return NextResponse.json({ error: "patientId and note are required" }, { status: 400 });
    }

    const [visit] = await db.insert(visits).values({
      tenantId: context.doctor.tenantId,
      patientId,
      doctorId: context.doctor.id,
      reason: "Mobile quick note",
      notes: String(note),
      createdAt: timestamp ? new Date(timestamp) : new Date(),
      updatedAt: new Date(),
    }).returning({ id: visits.id });

    return NextResponse.json({ success: true, id: visit.id });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
