import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { bedAssignments, carePlanTasks, carePlans, medicationAdministrations, notifications, patients, prescriptionItems, queues, vitals, visits } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveNurseContext } from "@/lib/nurse/server";
import { classifyVitalStatus, patientNameSql } from "@/lib/nurse/utils";

export const dynamic = "force-dynamic";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addHours(date: Date, hours: number) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveNurseContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { nurse } = context;
  const today = startOfToday();
  const medsWindow = addHours(new Date(), 2);

  try {
    const [patientCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(patients)
      .where(and(eq(patients.tenantId, nurse.tenantId), isNull(patients.deletedAt)));

    const bedRows = await db
      .select({ status: bedAssignments.status })
      .from(bedAssignments)
      .where(and(eq(bedAssignments.tenantId, nurse.tenantId), isNull(bedAssignments.deletedAt)));

    const dueMedications = await db
      .select({
        id: medicationAdministrations.id,
        patientName: patientNameSql,
        medication: prescriptionItems.drugName,
        dosage: prescriptionItems.dosage,
        route: prescriptionItems.route,
        scheduledAt: medicationAdministrations.scheduledAt,
        status: medicationAdministrations.status,
        room: bedAssignments.room,
        ward: bedAssignments.ward,
      })
      .from(medicationAdministrations)
      .innerJoin(patients, eq(patients.id, medicationAdministrations.patientId))
      .leftJoin(prescriptionItems, eq(prescriptionItems.id, medicationAdministrations.prescriptionItemId))
      .leftJoin(bedAssignments, and(eq(bedAssignments.patientId, patients.id), eq(bedAssignments.tenantId, nurse.tenantId), isNull(bedAssignments.deletedAt)))
      .where(
        and(
          eq(medicationAdministrations.tenantId, nurse.tenantId),
          isNull(medicationAdministrations.deletedAt),
          lte(medicationAdministrations.scheduledAt, medsWindow),
          sql`${medicationAdministrations.status} in ('pending', 'missed')`
        )
      )
      .orderBy(medicationAdministrations.scheduledAt)
      .limit(8);

    const taskRows = await db
      .select({
        id: carePlanTasks.id,
        title: carePlanTasks.title,
        status: carePlanTasks.status,
        dueAt: carePlanTasks.dueAt,
        patientName: patientNameSql,
        planPriority: carePlans.priority,
      })
      .from(carePlanTasks)
      .innerJoin(carePlans, eq(carePlans.id, carePlanTasks.carePlanId))
      .innerJoin(patients, eq(patients.id, carePlans.patientId))
      .where(
        and(
          eq(carePlans.tenantId, nurse.tenantId),
          isNull(carePlanTasks.deletedAt),
          sql`${carePlanTasks.status} <> 'completed'`
        )
      )
      .orderBy(carePlanTasks.dueAt)
      .limit(8);

    const latestVitals = await db
      .select({
        id: vitals.id,
        patientName: patientNameSql,
        temperature: vitals.temperature,
        bloodPressure: vitals.bloodPressure,
        heartRate: vitals.heartRate,
        respiratoryRate: vitals.respiratoryRate,
        oxygenSaturation: vitals.oxygenSaturation,
        painScore: vitals.painScore,
        recordedAt: vitals.recordedAt,
        room: bedAssignments.room,
      })
      .from(vitals)
      .innerJoin(visits, eq(visits.id, vitals.visitId))
      .innerJoin(patients, eq(patients.id, visits.patientId))
      .leftJoin(bedAssignments, and(eq(bedAssignments.patientId, patients.id), eq(bedAssignments.tenantId, nurse.tenantId), isNull(bedAssignments.deletedAt)))
      .where(and(eq(visits.tenantId, nurse.tenantId), isNull(vitals.deletedAt), isNull(visits.deletedAt)))
      .orderBy(desc(vitals.recordedAt))
      .limit(30);

    const vitalsAlerts = latestVitals
      .map((row) => {
        const status = classifyVitalStatus({
          heartRate: Number(row.heartRate || 0),
          temperature: Number(row.temperature || 0),
          respiratoryRate: Number(row.respiratoryRate || 0),
          oxygenSaturation: Number(row.oxygenSaturation || 0),
          painScore: row.painScore,
          bloodPressure: row.bloodPressure,
        });
        return { ...row, status };
      })
      .filter((row) => row.status !== "normal")
      .slice(0, 6);

    const queueRows = await db
      .select({ status: queues.status })
      .from(queues)
      .where(and(eq(queues.tenantId, nurse.tenantId), isNull(queues.deletedAt)));

    const [completedTasksRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(carePlanTasks)
      .innerJoin(carePlans, eq(carePlans.id, carePlanTasks.carePlanId))
      .where(and(eq(carePlans.tenantId, nurse.tenantId), eq(carePlanTasks.status, "completed"), gte(carePlanTasks.completedAt, today)));

    const patientRows = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        room: bedAssignments.room,
        ward: bedAssignments.ward,
        condition: bedAssignments.condition,
        status: patients.status,
      })
      .from(patients)
      .leftJoin(bedAssignments, and(eq(bedAssignments.patientId, patients.id), eq(bedAssignments.tenantId, nurse.tenantId), isNull(bedAssignments.deletedAt)))
      .where(and(eq(patients.tenantId, nurse.tenantId), isNull(patients.deletedAt)))
      .orderBy(desc(patients.updatedAt))
      .limit(6);

    const unreadNotifications = await db
      .select({
        id: notifications.id,
        title: notifications.title,
        message: notifications.message,
        type: notifications.type,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(and(eq(notifications.tenantId, nurse.tenantId), eq(notifications.userId, nurse.id), eq(notifications.read, false)))
      .orderBy(desc(notifications.createdAt))
      .limit(5);

    return NextResponse.json({
      metrics: {
        totalPatients: patientCountRow?.count ?? 0,
        patientsOnWatchList: vitalsAlerts.filter((row) => row.status === "critical").length,
        medicationsDue: dueMedications.length,
        vitalsAlerts: vitalsAlerts.length,
        completedTasks: completedTasksRow?.count ?? 0,
        pendingTasks: taskRows.length,
        bedsOccupied: bedRows.filter((row) => row.status === "occupied").length,
        bedsAvailable: bedRows.filter((row) => row.status === "available").length,
        activeQueue: queueRows.filter((row) => row.status !== "completed").length,
      },
      patients: patientRows,
      vitalsAlerts,
      medicationsDue: dueMedications.map((row) => ({
        ...row,
        dueTime: row.scheduledAt ? new Date(row.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Now",
      })),
      tasks: taskRows,
      notifications: unreadNotifications,
    });
  } catch (error) {
    console.error("Nurse dashboard API error:", error);
    return NextResponse.json({ error: "Failed to load nurse dashboard" }, { status: 500 });
  }
}
