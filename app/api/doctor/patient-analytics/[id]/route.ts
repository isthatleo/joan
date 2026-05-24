import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { appointments, labOrders, patients, prescriptions, visits } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveDoctorContext } from "@/lib/doctor/server";

export async function GET(request: NextRequest, context: RouteContext<"/api/doctor/patient-analytics/[id]">) {
  const doctorContext = await resolveDoctorContext(request.headers);
  if (!doctorContext.ok) {
    return NextResponse.json({ error: doctorContext.error }, { status: doctorContext.status });
  }

  const { doctor } = doctorContext;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const patient = await db.query.patients.findFirst({
      where: and(eq(patients.id, id), eq(patients.tenantId, doctor.tenantId), isNull(patients.deletedAt)),
      columns: { id: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [totalVisits, totalAppointments, prescriptionCount, labOrderCount, lastVisit, nextAppointment, visitTrend, prescriptionTrend, labTrend] = await Promise.all([
      db.$count(visits, and(eq(visits.patientId, id), eq(visits.tenantId, doctor.tenantId), eq(visits.doctorId, doctor.id), isNull(visits.deletedAt))),
      db.$count(appointments, and(eq(appointments.patientId, id), eq(appointments.tenantId, doctor.tenantId), eq(appointments.doctorId, doctor.id), isNull(appointments.deletedAt))),
      db.$count(prescriptions, and(eq(prescriptions.patientId, id), eq(prescriptions.tenantId, doctor.tenantId), eq(prescriptions.doctorId, doctor.id), isNull(prescriptions.deletedAt))),
      db.$count(labOrders, and(eq(labOrders.patientId, id), eq(labOrders.tenantId, doctor.tenantId), eq(labOrders.doctorId, doctor.id), isNull(labOrders.deletedAt))),
      db.select({ date: visits.createdAt }).from(visits).where(and(eq(visits.patientId, id), eq(visits.tenantId, doctor.tenantId), eq(visits.doctorId, doctor.id), isNull(visits.deletedAt))).orderBy(desc(visits.createdAt)).limit(1).then((rows) => rows[0]?.date ?? null),
      db.select({ date: appointments.scheduledAt }).from(appointments).where(and(eq(appointments.patientId, id), eq(appointments.tenantId, doctor.tenantId), eq(appointments.doctorId, doctor.id), isNull(appointments.deletedAt), gte(appointments.scheduledAt, new Date()))).orderBy(appointments.scheduledAt).limit(1).then((rows) => rows[0]?.date ?? null),
      db.select({ date: sql<string>`to_char(date_trunc('month', ${visits.createdAt}), 'YYYY-MM')`, count: count() }).from(visits).where(and(eq(visits.patientId, id), eq(visits.tenantId, doctor.tenantId), eq(visits.doctorId, doctor.id), isNull(visits.deletedAt), gte(visits.createdAt, sixMonthsAgo))).groupBy(sql`date_trunc('month', ${visits.createdAt})`).orderBy(sql`date_trunc('month', ${visits.createdAt})`),
      db.select({ date: sql<string>`to_char(date_trunc('month', ${prescriptions.prescribedAt}), 'YYYY-MM')`, count: count() }).from(prescriptions).where(and(eq(prescriptions.patientId, id), eq(prescriptions.tenantId, doctor.tenantId), eq(prescriptions.doctorId, doctor.id), isNull(prescriptions.deletedAt), gte(prescriptions.prescribedAt, sixMonthsAgo))).groupBy(sql`date_trunc('month', ${prescriptions.prescribedAt})`).orderBy(sql`date_trunc('month', ${prescriptions.prescribedAt})`),
      db.select({ date: sql<string>`to_char(date_trunc('month', ${labOrders.orderedAt}), 'YYYY-MM')`, count: count() }).from(labOrders).where(and(eq(labOrders.patientId, id), eq(labOrders.tenantId, doctor.tenantId), eq(labOrders.doctorId, doctor.id), isNull(labOrders.deletedAt), gte(labOrders.orderedAt, sixMonthsAgo))).groupBy(sql`date_trunc('month', ${labOrders.orderedAt})`).orderBy(sql`date_trunc('month', ${labOrders.orderedAt})`),
    ]);

    let healthScore = 88;
    if (prescriptionCount > 5) healthScore -= 6;
    else if (prescriptionCount > 2) healthScore -= 3;
    if (labOrderCount > 5) healthScore -= 4;
    if (totalVisits === 0) healthScore -= 12;
    healthScore = Math.max(0, Math.min(100, healthScore));

    const riskFactors: string[] = [];
    if (prescriptionCount > 5) riskFactors.push("Multiple medication orders on record");
    if (labOrderCount > 3) riskFactors.push("Frequent lab monitoring required");
    if (totalVisits === 0) riskFactors.push("No completed consultation history yet");

    return NextResponse.json({
      totalVisits,
      totalAppointments,
      averageVisitDuration: 30,
      prescriptionCount,
      labOrderCount,
      lastVisitDate: lastVisit?.toISOString?.() ?? null,
      nextAppointmentDate: nextAppointment?.toISOString?.() ?? null,
      healthScore,
      riskFactors,
      trends: {
        visitsOverTime: visitTrend,
        prescriptionsOverTime: prescriptionTrend,
        labOrdersOverTime: labTrend,
      },
    });
  } catch (error) {
    console.error("Doctor patient analytics API error:", error);
    return NextResponse.json({ error: "Failed to load patient analytics" }, { status: 500 });
  }
}
