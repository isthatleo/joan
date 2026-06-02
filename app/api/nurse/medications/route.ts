import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { auditLogs, bedAssignments, medicationAdministrations, notifications, patients, prescriptionItems, prescriptions, users, visits } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveNurseContext } from "@/lib/nurse/server";
import { patientNameSql } from "@/lib/nurse/utils";
import { isPrescriptionClosed, isTerminalAdministrationStatus, notifyMedicationRoleUsers } from "@/lib/medication-workflow";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();
  const statusFilter = request.nextUrl.searchParams.get("status")?.trim().toLowerCase();
  const routeFilter = request.nextUrl.searchParams.get("route")?.trim().toLowerCase(); // Get new route filter
  const context = await resolveNurseContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const whereClause = [
    eq(medicationAdministrations.tenantId, context.nurse.tenantId),
    isNull(medicationAdministrations.deletedAt),
    isNull(prescriptions.deletedAt),
  ];

  if (statusFilter && statusFilter !== "all") {
    whereClause.push(eq(medicationAdministrations.status, statusFilter));
  }

  if (routeFilter && routeFilter !== "all") {
    whereClause.push(eq(prescriptionItems.route, routeFilter)); // Apply route filter
  }

  const rows = await db
    .select({
      id: medicationAdministrations.id,
      prescriptionId: prescriptions.id,
      prescriptionItemId: prescriptionItems.id,
      patientId: patients.id,
      patientName: patientNameSql,
      patientRoom: bedAssignments.room,
      medication: prescriptionItems.drugName,
      genericName: prescriptionItems.genericName,
      dosage: prescriptionItems.dosage,
      route: prescriptionItems.route,
      frequency: prescriptionItems.frequency,
      dueTime: medicationAdministrations.scheduledAt,
      status: medicationAdministrations.status,
      prescribedBy: users.fullName,
      administeredBy: sql<string>`''`,
      administeredAt: medicationAdministrations.administeredAt,
      notes: medicationAdministrations.notes,
      prescriptionStatus: prescriptions.status,
    })
    .from(medicationAdministrations)
    .innerJoin(prescriptions, eq(prescriptions.id, medicationAdministrations.prescriptionId))
    .leftJoin(prescriptionItems, eq(prescriptionItems.id, medicationAdministrations.prescriptionItemId))
    .innerJoin(patients, eq(patients.id, medicationAdministrations.patientId))
    .leftJoin(users, eq(users.id, prescriptions.doctorId))
    .leftJoin(bedAssignments, and(eq(bedAssignments.patientId, patients.id), eq(bedAssignments.tenantId, context.nurse.tenantId), isNull(bedAssignments.deletedAt)))
    .where(and(...whereClause))
    .orderBy(asc(medicationAdministrations.scheduledAt));

  const data = rows.filter((row) => {
    if (!search) return true;
    const haystack = [row.patientName, row.medication, row.genericName, row.patientRoom].join(" ").toLowerCase();
    return haystack.includes(search);
  });

  const progressRows = await db
    .select({
      prescriptionId: medicationAdministrations.prescriptionId,
      prescriptionItemId: medicationAdministrations.prescriptionItemId,
      status: medicationAdministrations.status,
    })
    .from(medicationAdministrations)
    .where(and(eq(medicationAdministrations.tenantId, context.nurse.tenantId), isNull(medicationAdministrations.deletedAt)));

  const progressByItem = progressRows.reduce<Record<string, { total: number; pending: number; administered: number; terminal: number }>>((acc, row) => {
    const key = row.prescriptionItemId || row.prescriptionId || "unknown";
    acc[key] ||= { total: 0, pending: 0, administered: 0, terminal: 0 };
    acc[key].total += 1;
    if (row.status === "pending") acc[key].pending += 1;
    if (row.status === "administered") acc[key].administered += 1;
    if (isTerminalAdministrationStatus(row.status)) acc[key].terminal += 1;
    return acc;
  }, {});

  const medications = data.map((row) => {
    const progress = progressByItem[row.prescriptionItemId || row.prescriptionId] || { total: 0, pending: 0, administered: 0, terminal: 0 };
    return {
      ...row,
      administrationProgress: progress,
      isPrescriptionClosed: isPrescriptionClosed(row.prescriptionStatus),
    };
  });

  const stats = {
    total: medications.length,
    pending: medications.filter((row) => row.status === "pending").length,
    administered: medications.filter((row) => row.status === "administered").length,
    missed: medications.filter((row) => row.status === "missed").length,
    skipped: medications.filter((row) => row.status === "skipped").length,
    reactions: medications.filter((row) => row.status === "reaction").length,
  };

  return NextResponse.json({ medications, stats });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const context = await resolveNurseContext(request.headers, body.slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { nurse } = context;
  const action = body.action;

  try {
    if (action === "administer" || action === "skip" || action === "miss" || action === "reaction") {
      const targetRows = await db
        .select({
          id: medicationAdministrations.id,
          prescriptionId: medicationAdministrations.prescriptionId,
          patientId: medicationAdministrations.patientId,
          currentStatus: medicationAdministrations.status,
          prescriptionStatus: prescriptions.status,
          doctorId: prescriptions.doctorId,
          medication: prescriptions.medication,
        })
        .from(medicationAdministrations)
        .innerJoin(prescriptions, eq(prescriptions.id, medicationAdministrations.prescriptionId))
        .where(and(eq(medicationAdministrations.id, body.id), eq(medicationAdministrations.tenantId, nurse.tenantId), isNull(medicationAdministrations.deletedAt)))
        .limit(1);

      const target = targetRows[0];
      if (!target) return NextResponse.json({ error: "Medication administration not found" }, { status: 404 });
      if (isPrescriptionClosed(target.prescriptionStatus)) {
        return NextResponse.json({ error: "This prescription is closed and cannot be administered." }, { status: 409 });
      }
      if (target.currentStatus !== "pending") {
        return NextResponse.json({ error: "Only pending medication administrations can be updated." }, { status: 409 });
      }

      const status = action === "administer" ? "administered" : action === "skip" ? "skipped" : action === "reaction" ? "reaction" : "missed";
      const [updated] = await db
        .update(medicationAdministrations)
        .set({
          status,
          administeredAt: action === "administer" || action === "reaction" ? new Date() : null,
          administeredBy: action === "administer" || action === "reaction" ? nurse.id : null,
          notes: body.notes || (action === "reaction" ? "Patient reported a possible adverse medication reaction." : null),
          updatedAt: new Date(),
        })
        .where(and(eq(medicationAdministrations.id, body.id), eq(medicationAdministrations.tenantId, nurse.tenantId)))
        .returning({ id: medicationAdministrations.id, prescriptionId: medicationAdministrations.prescriptionId, patientId: medicationAdministrations.patientId });

      await db.insert(auditLogs).values({
        tenantId: nurse.tenantId,
        userId: nurse.id,
        action: `medication.${status}`,
        entity: "medication_administration",
        entityId: updated.id,
        metadata: { prescriptionId: updated.prescriptionId, patientId: updated.patientId },
      });

      if (status === "reaction") {
        if (target.doctorId) {
          await db.insert(notifications).values({
            tenantId: nurse.tenantId,
            userId: target.doctorId,
            type: "medication_reaction",
            title: "Medication reaction reported",
            message: `${target.medication || "Medication"} triggered a possible reaction. Review or change the prescription before further administration.`,
            metadata: { prescriptionId: target.prescriptionId, patientId: target.patientId, administrationId: target.id },
            read: false,
          });
        }

        await notifyMedicationRoleUsers({
          tenantId: nurse.tenantId,
          roleNames: ["pharmacist", "pharmacy"],
          type: "medication_reaction",
          title: "Medication reaction reported",
          message: `${target.medication || "Medication"} has a reported reaction and may need pharmacist review.`,
          metadata: { prescriptionId: target.prescriptionId, patientId: target.patientId, administrationId: target.id },
        });

        return NextResponse.json({ success: true });
      }

      const updatedPrescriptionId = updated.prescriptionId;
      if (updatedPrescriptionId) {
        const siblingRows = await db
          .select({ status: medicationAdministrations.status })
          .from(medicationAdministrations)
          .where(and(eq(medicationAdministrations.prescriptionId, updatedPrescriptionId), eq(medicationAdministrations.tenantId, nurse.tenantId), isNull(medicationAdministrations.deletedAt)));

        if (siblingRows.length > 0 && siblingRows.every((row) => isTerminalAdministrationStatus(row.status))) {
        const [completedPrescription] = await db
          .update(prescriptions)
          .set({ status: "completed", filledAt: new Date(), updatedAt: new Date() })
          .where(and(eq(prescriptions.id, updatedPrescriptionId), eq(prescriptions.tenantId, nurse.tenantId), isNull(prescriptions.deletedAt)))
          .returning({ id: prescriptions.id, patientId: prescriptions.patientId, doctorId: prescriptions.doctorId, medication: prescriptions.medication });

          await notifyMedicationCourseCompleted(nurse.tenantId, nurse.id, completedPrescription);
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === "complete-prescription") {
      const pendingRows = await db
        .select({ id: medicationAdministrations.id })
        .from(medicationAdministrations)
        .where(and(eq(medicationAdministrations.prescriptionId, body.prescriptionId), eq(medicationAdministrations.tenantId, nurse.tenantId), eq(medicationAdministrations.status, "pending"), isNull(medicationAdministrations.deletedAt)));

      if (pendingRows.length > 0) {
        return NextResponse.json({ error: "Complete all scheduled administrations before closing this treatment." }, { status: 409 });
      }

      const [updatedPrescription] = await db
        .update(prescriptions)
        .set({ status: "completed", filledAt: new Date(), updatedAt: new Date() })
        .where(and(eq(prescriptions.id, body.prescriptionId), eq(prescriptions.tenantId, nurse.tenantId)))
        .returning({ id: prescriptions.id, patientId: prescriptions.patientId, doctorId: prescriptions.doctorId, medication: prescriptions.medication });

      await notifyMedicationCourseCompleted(nurse.tenantId, nurse.id, updatedPrescription);

      await db.insert(auditLogs).values({
        tenantId: nurse.tenantId,
        userId: nurse.id,
        action: "prescription.completed",
        entity: "prescription",
        entityId: updatedPrescription.id,
        metadata: { patientId: updatedPrescription.patientId },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported medication action" }, { status: 400 });
  } catch (error) {
    console.error("Medication action API error:", error);
    return NextResponse.json({ error: "Failed to update medication" }, { status: 500 });
  }
}

async function notifyMedicationCourseCompleted(
  tenantId: string,
  nurseId: string,
  prescription?: { id: string; patientId: string | null; doctorId: string | null; medication: string | null }
) {
  if (!prescription) return;

  if (prescription.doctorId) {
    await db.insert(notifications).values({
      tenantId,
      userId: prescription.doctorId,
      type: "medication_completed",
      title: "Medication course completed",
      message: `${prescription.medication || "Medication"} has been completed by nursing staff.`,
      metadata: { patientId: prescription.patientId, prescriptionId: prescription.id, completedBy: nurseId },
      read: false,
    });
  }

  await notifyMedicationRoleUsers({
    tenantId,
    roleNames: ["pharmacist", "pharmacy"],
    type: "medication_completed",
    title: "Medication course completed",
    message: `${prescription.medication || "Medication"} has been completed by nursing staff.`,
    metadata: { patientId: prescription.patientId, prescriptionId: prescription.id, completedBy: nurseId },
  });
}
