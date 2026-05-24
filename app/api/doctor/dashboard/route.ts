import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { appointments, labOrders, patients, prescriptions, queues, visits } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveDoctorContext } from "@/lib/doctor/server";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

    const [totalPatientsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(patients)
      .where(and(eq(patients.tenantId, doctor.tenantId), isNull(patients.deletedAt)));

    const todayAppointments = await db
      .select({
        id: appointments.id,
        patientId: patients.id,
        patientName: sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`,
        patientEmail: patients.email,
        scheduledAt: appointments.scheduledAt,
        status: appointments.status,
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(
        and(
          eq(appointments.tenantId, doctor.tenantId),
          eq(appointments.doctorId, doctor.id),
          isNull(appointments.deletedAt),
          gte(appointments.scheduledAt, todayStart),
          lt(appointments.scheduledAt, tomorrowStart)
        )
      )
      .orderBy(appointments.scheduledAt);

    const queueSnapshot = await db
      .select({
        id: queues.id,
        patientId: patients.id,
        patientName: sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`,
        queueNumber: queues.queueNumber,
        status: queues.status,
        priority: queues.priority,
        position: queues.position,
      })
      .from(queues)
      .innerJoin(patients, eq(patients.id, queues.patientId))
      .where(
        and(
          eq(queues.tenantId, doctor.tenantId),
          eq(queues.assignedTo, doctor.id),
          isNull(queues.deletedAt)
        )
      )
      .orderBy(queues.position, queues.createdAt)
      .limit(6);

    const [visitCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(visits)
      .where(and(eq(visits.tenantId, doctor.tenantId), eq(visits.doctorId, doctor.id), isNull(visits.deletedAt)));

    const recentLabOrders = await db
      .select({
        id: labOrders.id,
        patientId: patients.id,
        patientName: sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`,
        status: labOrders.status,
        orderedAt: labOrders.createdAt,
      })
      .from(labOrders)
      .innerJoin(visits, eq(visits.id, labOrders.visitId))
      .innerJoin(patients, eq(patients.id, visits.patientId))
      .where(
        and(
          eq(labOrders.tenantId, doctor.tenantId),
          eq(labOrders.orderedBy, doctor.id),
          isNull(labOrders.deletedAt)
        )
      )
      .orderBy(desc(labOrders.createdAt))
      .limit(5);

    const recentPrescriptions = await db
      .select({
        id: prescriptions.id,
        patientId: patients.id,
        patientName: sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`,
        prescribedAt: prescriptions.createdAt,
      })
      .from(prescriptions)
      .innerJoin(visits, eq(visits.id, prescriptions.visitId))
      .innerJoin(patients, eq(patients.id, visits.patientId))
      .where(
        and(
          eq(prescriptions.tenantId, doctor.tenantId),
          eq(prescriptions.doctorId, doctor.id),
          isNull(prescriptions.deletedAt)
        )
      )
      .orderBy(desc(prescriptions.createdAt))
      .limit(5);

    const activeQueueCount = queueSnapshot.filter((entry) => entry.status !== "completed").length;
    const completedToday = todayAppointments.filter((entry) => entry.status === "completed").length;

    return NextResponse.json({
      metrics: {
        totalPatients: totalPatientsRow?.count ?? 0,
        appointmentsToday: todayAppointments.length,
        completedToday,
        activeQueue: activeQueueCount,
        totalVisits: visitCountRow?.count ?? 0,
        pendingLabOrders: recentLabOrders.filter((entry) => entry.status !== "completed").length,
        recentPrescriptions: recentPrescriptions.length,
      },
      todayAppointments,
      queueSnapshot,
      recentLabOrders,
      recentPrescriptions,
    });
  } catch (error) {
    console.error("Doctor dashboard API error:", error);
    return NextResponse.json({ error: "Failed to load doctor dashboard" }, { status: 500 });
  }
}
