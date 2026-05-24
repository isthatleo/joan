import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { appointments, labOrders, patients, prescriptions, visits } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveDoctorContext } from "@/lib/doctor/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  try {
    const { id } = await params;
    const patient = await db.query.patients.findFirst({
      where: and(eq(patients.id, id), eq(patients.tenantId, doctor.tenantId), isNull(patients.deletedAt)),
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const [appointmentCount, visitCount, labOrderCount, prescriptionCount] = await Promise.all([
      db.$count(appointments, and(eq(appointments.patientId, id), eq(appointments.tenantId, doctor.tenantId), isNull(appointments.deletedAt))),
      db.$count(visits, and(eq(visits.patientId, id), eq(visits.tenantId, doctor.tenantId), isNull(visits.deletedAt))),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(labOrders)
        .innerJoin(visits, eq(visits.id, labOrders.visitId))
        .where(and(eq(visits.patientId, id), eq(labOrders.tenantId, doctor.tenantId), isNull(labOrders.deletedAt)))
        .then((rows) => rows[0]?.count ?? 0),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(prescriptions)
        .innerJoin(visits, eq(visits.id, prescriptions.visitId))
        .where(and(eq(visits.patientId, id), eq(prescriptions.tenantId, doctor.tenantId), isNull(prescriptions.deletedAt)))
        .then((rows) => rows[0]?.count ?? 0),
    ]);

    const recentAppointments = await db
      .select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        status: appointments.status,
      })
      .from(appointments)
      .where(and(eq(appointments.patientId, id), eq(appointments.tenantId, doctor.tenantId), isNull(appointments.deletedAt)))
      .orderBy(desc(appointments.scheduledAt))
      .limit(5);

    return NextResponse.json({
      patient,
      stats: {
        appointments: appointmentCount,
        visits: visitCount,
        labOrders: labOrderCount,
        prescriptions: prescriptionCount,
      },
      recentAppointments,
    });
  } catch (error) {
    console.error("Doctor patient detail API error:", error);
    return NextResponse.json({ error: "Failed to load patient details" }, { status: 500 });
  }
}
