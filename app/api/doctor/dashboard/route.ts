import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { appointments, patients, labOrders, prescriptions, users } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Get doctor's user record to verify role
    const doctorUser = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.user.id), eq(users.role, "doctor")))
      .limit(1);

    if (!doctorUser.length) {
      return NextResponse.json({ error: "Doctor access required" }, { status: 403 });
    }

    // Get dashboard metrics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's appointments
    const todayAppointments = await db
      .select({
        id: appointments.id,
        patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
        time: appointments.scheduledTime,
        type: appointments.type,
        status: appointments.status,
        priority: appointments.priority,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(
        and(
          eq(appointments.doctorId, session.user.id),
          sql`${appointments.scheduledDate} >= ${today}`,
          sql`${appointments.scheduledDate} < ${tomorrow}`
        )
      )
      .orderBy(appointments.scheduledTime);

    // Patient queue (waiting appointments)
    const patientQueue = await db
      .select({
        id: appointments.id,
        patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
        time: appointments.scheduledTime,
        type: appointments.type,
        status: appointments.status,
        priority: appointments.priority,
        checkInTime: appointments.checkInTime,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(
        and(
          eq(appointments.doctorId, session.user.id),
          eq(appointments.status, "waiting")
        )
      )
      .orderBy(appointments.checkInTime);

    // Pending lab results
    const pendingLabResults = await db
      .select({
        id: labOrders.id,
        test: labOrders.testName,
        patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
        status: labOrders.status,
        orderedAt: labOrders.orderedAt,
      })
      .from(labOrders)
      .innerJoin(patients, eq(labOrders.patientId, patients.id))
      .where(
        and(
          eq(labOrders.doctorId, session.user.id),
          eq(labOrders.status, "completed")
        )
      )
      .orderBy(desc(labOrders.orderedAt))
      .limit(5);

    // Recent prescriptions
    const recentPrescriptions = await db
      .select({
        id: prescriptions.id,
        medication: prescriptions.medication,
        patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
        dosage: prescriptions.dosage,
        status: prescriptions.status,
        prescribedAt: prescriptions.prescribedAt,
      })
      .from(prescriptions)
      .innerJoin(patients, eq(prescriptions.patientId, patients.id))
      .where(eq(prescriptions.doctorId, session.user.id))
      .orderBy(desc(prescriptions.prescribedAt))
      .limit(5);

    // Calculate metrics
    const metrics = {
      totalPatients: await db
        .select({ count: sql<number>`count(*)` })
        .from(patients)
        .then(result => result[0].count),

      activeAppointmentsToday: todayAppointments.length,
      completedAppointmentsToday: todayAppointments.filter(apt => apt.status === "completed").length,
      patientsInQueue: patientQueue.length,
      pendingLabOrders: await db
        .select({ count: sql<number>`count(*)` })
        .from(labOrders)
        .where(
          and(
            eq(labOrders.doctorId, session.user.id),
            sql`${labOrders.status} IN ('ordered', 'collected', 'processing')`
          )
        )
        .then(result => result[0].count),

      pendingPrescriptions: await db
        .select({ count: sql<number>`count(*)` })
        .from(prescriptions)
        .where(
          and(
            eq(prescriptions.doctorId, session.user.id),
            eq(prescriptions.status, "pending")
          )
        )
        .then(result => result[0].count),

      pendingLabResults: pendingLabResults.length,
      completedLabResults: pendingLabResults.length, // For display purposes
    };

    return NextResponse.json({
      metrics,
      todayAppointments,
      patientQueue,
      pendingLabResults,
      recentPrescriptions,
    });

  } catch (error) {
    console.error("Doctor dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

