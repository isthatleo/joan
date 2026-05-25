import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, isNull, lte, sql } from "drizzle-orm";
import { auditLogs, bedAssignments, medicationAdministrations, notifications, patients, prescriptionItems, prescriptions, users, visits } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { resolveNurseContext } from "@/lib/nurse/server";
import { patientNameSql } from "@/lib/nurse/utils";

export const dynamic = "force-dynamic";

function addHours(date: Date, hours: number) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();
  const context = await resolveNurseContext(request.headers, slug);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
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
    .where(and(eq(medicationAdministrations.tenantId, context.nurse.tenantId), isNull(medicationAdministrations.deletedAt), isNull(prescriptions.deletedAt)))
    .orderBy(asc(medicationAdministrations.scheduledAt));

  const data = rows.filter((row) => {
    if (!search) return true;
    const haystack = [row.patientName, row.medication, row.genericName, row.patientRoom].join(" ").toLowerCase();
    return haystack.includes(search);
  });

  const stats = {
    total: data.length,
    pending: data.filter((row) => row.status === "pending").length,
    administered: data.filter((row) => row.status === "administered").length,
    missed: data.filter((row) => row.status === "missed").length,
  };

  return NextResponse.json({ medications: data, stats });
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
    if (action === "administer" || action === "skip" || action === "miss") {
      const status = action === "administer" ? "administered" : action === "skip" ? "skipped" : "missed";
      const [updated] = await db
        .update(medicationAdministrations)
        .set({
          status,
          administeredAt: action === "administer" ? new Date() : null,
          administeredBy: action === "administer" ? nurse.id : null,
          notes: body.notes || null,
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

      return NextResponse.json({ success: true });
    }

    if (action === "complete-prescription") {
      const [updatedPrescription] = await db
        .update(prescriptions)
        .set({ status: "completed", updatedAt: new Date() })
        .where(and(eq(prescriptions.id, body.prescriptionId), eq(prescriptions.tenantId, nurse.tenantId)))
        .returning({ id: prescriptions.id, patientId: prescriptions.patientId, doctorId: prescriptions.doctorId, medication: prescriptions.medication });

      if (updatedPrescription?.doctorId) {
        await db.insert(notifications).values({
          tenantId: nurse.tenantId,
          userId: updatedPrescription.doctorId,
          type: "medication_completed",
          title: "Medication course completed",
          message: `${updatedPrescription.medication || "Medication"} has been marked complete by nursing staff.`,
          metadata: { patientId: updatedPrescription.patientId, prescriptionId: updatedPrescription.id },
        });
      }

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
