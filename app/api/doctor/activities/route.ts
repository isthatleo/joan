import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { appointments, labOrders, patients, prescriptions, visits } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveDoctorContext } from "@/lib/doctor/server";

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
    const [recentAppointments, recentPrescriptions, recentLabOrders] = await Promise.all([
      db
        .select({
          id: sql<string>`concat('apt_', ${appointments.id})`,
          type: sql<string>`'appointment'`,
          title: sql<string>`concat('Appointment ', coalesce(${appointments.status}, 'updated'))`,
          description: sql<string>`concat('Patient: ', trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, ''))))`,
          timestamp: appointments.updatedAt,
        })
        .from(appointments)
        .innerJoin(patients, eq(patients.id, appointments.patientId))
        .where(
          and(
            eq(appointments.tenantId, doctor.tenantId),
            eq(appointments.doctorId, doctor.id),
            isNull(appointments.deletedAt)
          )
        )
        .orderBy(desc(appointments.updatedAt))
        .limit(4),

      db
        .select({
          id: sql<string>`concat('rx_', ${prescriptions.id})`,
          type: sql<string>`'prescription'`,
          title: sql<string>`concat('Prescribed ', coalesce(${prescriptions.medication}, 'medication'))`,
          description: sql<string>`concat('Patient: ', trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, ''))))`,
          timestamp: prescriptions.createdAt,
        })
        .from(prescriptions)
        .innerJoin(patients, eq(patients.id, prescriptions.patientId))
        .where(
          and(
            eq(prescriptions.tenantId, doctor.tenantId),
            eq(prescriptions.doctorId, doctor.id),
            isNull(prescriptions.deletedAt)
          )
        )
        .orderBy(desc(prescriptions.createdAt))
        .limit(4),

      db
        .select({
          id: sql<string>`concat('lab_', ${labOrders.id})`,
          type: sql<string>`'lab'`,
          title: sql<string>`concat('Ordered ', coalesce(${labOrders.testName}, 'lab test'))`,
          description: sql<string>`concat('Patient: ', trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, ''))))`,
          timestamp: labOrders.createdAt,
        })
        .from(labOrders)
        .innerJoin(visits, eq(visits.id, labOrders.visitId))
        .innerJoin(patients, eq(patients.id, visits.patientId))
        .where(
          and(
            eq(labOrders.tenantId, doctor.tenantId),
            eq(labOrders.doctorId, doctor.id),
            isNull(labOrders.deletedAt)
          )
        )
        .orderBy(desc(labOrders.createdAt))
        .limit(4),
    ]);

    const activities = [
      ...recentAppointments,
      ...recentPrescriptions,
      ...recentLabOrders,
    ]
      .filter((item) => item.timestamp)
      .map((item) => ({
        ...item,
        timestamp: item.timestamp.toISOString(),
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 12);

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Doctor activities API error:", error);
    return NextResponse.json({ error: "Failed to load activities" }, { status: 500 });
  }
}
