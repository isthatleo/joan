import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inventoryItems,
  medicationAdministrations,
  patients,
  prescriptionItems,
  prescriptions,
  visits,
} from "@/lib/db/schema";
import { buildStockInfo, formatPatientName } from "@/lib/doctor/prescriptions";
import { resolveDoctorContext } from "@/lib/doctor/server";
import { syncPatientCareInvoice } from "@/lib/billing/patient-ledger";
import {
  cancelPendingMedicationAdministrations,
  createMedicationAdministrationRecords,
  isNurseAdministrationRoute,
  notifyMedicationRoleUsers,
} from "@/lib/medication-workflow";

async function loadPrescription(id: string, doctorId: string, tenantId: string) {
  const rows = await db
    .select({
      id: prescriptions.id,
      patientId: patients.id,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientEmail: patients.email,
      patientPhone: patients.phone,
      globalPatientId: patients.globalPatientId,
      dob: patients.dob,
      gender: patients.gender,
      address: patients.address,
      visitId: prescriptions.visitId,
      visitReason: visits.reason,
      visitNotes: visits.notes,
      medication: prescriptions.medication,
      genericName: prescriptions.genericName,
      strength: prescriptions.strength,
      dosage: prescriptions.dosage,
      frequency: prescriptions.frequency,
      duration: prescriptions.duration,
      quantity: prescriptions.quantity,
      refills: prescriptions.refills,
      refillsRemaining: prescriptions.refillsRemaining,
      instructions: prescriptions.instructions,
      indications: prescriptions.indications,
      status: prescriptions.status,
      prescribedBy: prescriptions.prescribedBy,
      prescribedAt: prescriptions.prescribedAt,
      filledAt: prescriptions.filledAt,
      expiresAt: prescriptions.expiresAt,
      pharmacy: prescriptions.pharmacy,
      notes: prescriptions.notes,
      interactions: prescriptions.interactions,
      sideEffects: prescriptions.sideEffects,
      diagnosis: prescriptions.diagnosis,
      priority: prescriptions.priority,
      isEmergency: prescriptions.isEmergency,
      validUntil: prescriptions.validUntil,
      createdAt: prescriptions.createdAt,
      updatedAt: prescriptions.updatedAt,
    })
    .from(prescriptions)
    .innerJoin(patients, eq(patients.id, prescriptions.patientId))
    .leftJoin(visits, eq(visits.id, prescriptions.visitId))
    .where(
      and(
        eq(prescriptions.id, id),
        eq(prescriptions.doctorId, doctorId),
        eq(prescriptions.tenantId, tenantId),
        isNull(prescriptions.deletedAt),
        isNull(patients.deletedAt)
      )
    )
    .limit(1);

  const prescription = rows[0];
  if (!prescription) return null;

  const items = await db
    .select({
      id: prescriptionItems.id,
      medicationId: prescriptionItems.medicationId,
      drugName: prescriptionItems.drugName,
      genericName: prescriptionItems.genericName,
      strength: prescriptionItems.strength,
      dosage: prescriptionItems.dosage,
      frequency: prescriptionItems.frequency,
      duration: prescriptionItems.duration,
      quantity: prescriptionItems.quantity,
      instructions: prescriptionItems.instructions,
      refills: prescriptionItems.refills,
      isPrn: prescriptionItems.isPrn,
      route: prescriptionItems.route,
      inventoryName: inventoryItems.name,
      inventoryStock: inventoryItems.stock,
    })
    .from(prescriptionItems)
    .leftJoin(inventoryItems, eq(inventoryItems.id, prescriptionItems.medicationId))
    .where(and(eq(prescriptionItems.prescriptionId, id), isNull(prescriptionItems.deletedAt)));

  const administrationRows = await db
    .select({
      prescriptionItemId: medicationAdministrations.prescriptionItemId,
      status: medicationAdministrations.status,
    })
    .from(medicationAdministrations)
    .where(and(eq(medicationAdministrations.prescriptionId, id), isNull(medicationAdministrations.deletedAt)));

  const administrationProgress = administrationRows.reduce<Record<string, { total: number; pending: number; administered: number; terminal: number }>>((acc, row) => {
    const key = row.prescriptionItemId || "unknown";
    acc[key] ||= { total: 0, pending: 0, administered: 0, terminal: 0 };
    acc[key].total += 1;
    if (row.status === "pending") acc[key].pending += 1;
    if (row.status === "administered") acc[key].administered += 1;
    if (["administered", "skipped", "missed", "cancelled", "reaction"].includes(row.status)) acc[key].terminal += 1;
    return acc;
  }, {});

  return {
    ...prescription,
    patientName: formatPatientName(prescription.patientFirstName, prescription.patientLastName),
    items: items.map((item) => ({
      ...item,
      stockInfo: buildStockInfo(item.inventoryStock),
      administrationProgress: administrationProgress[item.id] || { total: 0, pending: 0, administered: 0, terminal: 0 },
    })),
    administrationStats: {
      total: administrationRows.length,
      pending: administrationRows.filter((row) => row.status === "pending").length,
      administered: administrationRows.filter((row) => row.status === "administered").length,
      reaction: administrationRows.filter((row) => row.status === "reaction").length,
    },
  };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const doctorContext = await resolveDoctorContext(request.headers);
  if (!doctorContext.ok) {
    return NextResponse.json({ error: doctorContext.error }, { status: doctorContext.status });
  }

  const { doctor } = doctorContext;
  const { id } = await context.params;

  try {
    const prescription = await loadPrescription(id, doctor.id, doctor.tenantId!);
    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    return NextResponse.json(prescription);
  } catch (error) {
    console.error("Get doctor prescription error:", error);
    return NextResponse.json({ error: "Failed to fetch prescription" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const doctorContext = await resolveDoctorContext(request.headers);
  if (!doctorContext.ok) {
    return NextResponse.json({ error: doctorContext.error }, { status: doctorContext.status });
  }

  const { doctor } = doctorContext;
  const { id } = await context.params;

  try {
    const existing = await loadPrescription(id, doctor.id, doctor.tenantId!);
    if (!existing) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    const body = await request.json();
    const action = String(body.action || "").trim();

    if (action === "complete") {
      const [updated] = await db
        .update(prescriptions)
        .set({ status: "completed", filledAt: new Date(), updatedAt: new Date() })
        .where(and(eq(prescriptions.id, id), eq(prescriptions.tenantId, doctor.tenantId!), isNull(prescriptions.deletedAt)))
        .returning();

      await cancelPendingMedicationAdministrations(doctor.tenantId!, id, "Prescription completed by doctor.");
      await notifyPrescriptionWorkflow({
        tenantId: doctor.tenantId!,
        prescriptionId: id,
        patientId: existing.patientId,
        doctorId: doctor.id,
        patientName: existing.patientName,
        medication: existing.medication,
        message: `${existing.medication || "A prescription"} for ${existing.patientName} was marked complete by the doctor.`,
        roles: ["pharmacist", "pharmacy", "nurse", "nursing"],
        type: "prescription_completed",
        title: "Prescription completed",
      });

      return NextResponse.json(updated);
    }

    if (action === "discontinue") {
      const [updated] = await db
        .update(prescriptions)
        .set({ status: "discontinued", notes: body.notes ? String(body.notes) : existing.notes, updatedAt: new Date() })
        .where(and(eq(prescriptions.id, id), eq(prescriptions.tenantId, doctor.tenantId!), isNull(prescriptions.deletedAt)))
        .returning();

      await cancelPendingMedicationAdministrations(doctor.tenantId!, id, "Prescription discontinued by doctor.");
      await notifyPrescriptionWorkflow({
        tenantId: doctor.tenantId!,
        prescriptionId: id,
        patientId: existing.patientId,
        doctorId: doctor.id,
        patientName: existing.patientName,
        medication: existing.medication,
        message: `${existing.medication || "A prescription"} for ${existing.patientName} was discontinued.`,
        roles: ["pharmacist", "pharmacy", "nurse", "nursing"],
        type: "prescription_discontinued",
        title: "Prescription discontinued",
      });

      return NextResponse.json(updated);
    }

    if (action === "refill") {
      const refillAmount = Math.max(1, Number(body.refillAmount || 1));
      const [updated] = await db
        .update(prescriptions)
        .set({
          status: "active",
          refills: sql`coalesce(${prescriptions.refills}, 0) + ${refillAmount}`,
          refillsRemaining: sql`coalesce(${prescriptions.refillsRemaining}, 0) + ${refillAmount}`,
          validUntil: body.validUntil ? new Date(body.validUntil) : existing.validUntil,
          updatedAt: new Date(),
        })
        .where(and(eq(prescriptions.id, id), eq(prescriptions.tenantId, doctor.tenantId!), isNull(prescriptions.deletedAt)))
        .returning();

      const sourceItems = existing.items.length
        ? existing.items
        : [{
          medicationId: null,
          drugName: existing.medication || "Medication",
          genericName: existing.genericName,
          strength: existing.strength,
          dosage: existing.dosage,
          frequency: existing.frequency,
          duration: existing.duration,
          quantity: existing.quantity,
          instructions: existing.instructions,
          refills: existing.refills,
          isPrn: false,
          route: null,
        }];
      const refillItems = await db.insert(prescriptionItems).values(
        sourceItems.map((item: any) => ({
          prescriptionId: id,
          medicationId: item.medicationId || null,
          drugName: item.drugName || existing.medication || "Medication",
          genericName: item.genericName || null,
          strength: item.strength || null,
          dosage: item.dosage || "",
          frequency: item.frequency || null,
          duration: item.duration || null,
          quantity: Number(item.quantity || 1),
          instructions: [item.instructions, `Refill treatment x${refillAmount}`].filter(Boolean).join("\n"),
          refills: Number(item.refills || 0),
          isPrn: Boolean(item.isPrn),
          route: item.route || null,
        }))
      ).returning({
        id: prescriptionItems.id,
        drugName: prescriptionItems.drugName,
        quantity: prescriptionItems.quantity,
        frequency: prescriptionItems.frequency,
        route: prescriptionItems.route,
      });

      const nurseAdminItems = refillItems.filter((item: any) => isNurseAdministrationRoute(item.route));
      const doseCount = await createMedicationAdministrationRecords({
        tenantId: doctor.tenantId!,
        prescriptionId: id,
        patientId: existing.patientId,
        items: nurseAdminItems,
      });

      await notifyPrescriptionWorkflow({
        tenantId: doctor.tenantId!,
        prescriptionId: id,
        patientId: existing.patientId,
        doctorId: doctor.id,
        patientName: existing.patientName,
        medication: existing.medication,
        message: `${existing.medication || "A prescription"} for ${existing.patientName} was renewed.${doseCount ? ` ${doseCount} administration dose(s) were scheduled.` : ""}`,
        roles: doseCount ? ["pharmacist", "pharmacy", "nurse", "nursing"] : ["pharmacist", "pharmacy"],
        type: "prescription_refilled",
        title: "Prescription renewed",
        extra: { refillAmount, doseCount },
      });

      await syncPatientCareInvoice(doctor.tenantId!, existing.patientId).catch((error) => {
        console.error("Failed to sync patient care invoice after prescription refill:", error);
      });

      return NextResponse.json(updated);
    }

    if (action === "change-medication") {
      const itemPatch = body.item && typeof body.item === "object" ? body.item : {};
      const targetItemId = String(itemPatch.id || existing.items[0]?.id || "");
      const targetItem = existing.items.find((item: any) => item.id === targetItemId) || existing.items[0];
      if (!targetItem) return NextResponse.json({ error: "Prescription has no medication item to update." }, { status: 400 });

      const nextRoute = itemPatch.route !== undefined ? String(itemPatch.route || "").trim() || null : targetItem.route;
      const nextQuantity = itemPatch.quantity !== undefined ? Number(itemPatch.quantity || 1) : targetItem.quantity;
      const nextFrequency = itemPatch.frequency !== undefined ? String(itemPatch.frequency || "").trim() || null : targetItem.frequency;
      const nextDrugName = itemPatch.drugName !== undefined ? String(itemPatch.drugName || "").trim() : targetItem.drugName;

      const [changedItem] = await db
        .insert(prescriptionItems)
        .values({
          prescriptionId: id,
          medicationId: itemPatch.medicationId ? String(itemPatch.medicationId) : targetItem.medicationId || null,
          drugName: nextDrugName,
          genericName: itemPatch.genericName !== undefined ? String(itemPatch.genericName || "").trim() || null : targetItem.genericName,
          strength: itemPatch.strength !== undefined ? String(itemPatch.strength || "").trim() || null : targetItem.strength,
          dosage: itemPatch.dosage !== undefined ? String(itemPatch.dosage || "").trim() : targetItem.dosage,
          frequency: nextFrequency,
          duration: itemPatch.duration !== undefined ? String(itemPatch.duration || "").trim() || null : targetItem.duration,
          quantity: nextQuantity,
          instructions: [
            itemPatch.instructions !== undefined ? String(itemPatch.instructions || "").trim() : targetItem.instructions,
            "Medication change treatment",
          ].filter(Boolean).join("\n"),
          refills: Number(targetItem.refills || 0),
          isPrn: Boolean(targetItem.isPrn),
          route: nextRoute,
        })
        .returning({
          id: prescriptionItems.id,
          drugName: prescriptionItems.drugName,
          quantity: prescriptionItems.quantity,
          frequency: prescriptionItems.frequency,
          route: prescriptionItems.route,
        });

      await db
        .update(prescriptionItems)
        .set({
          instructions: [targetItem.instructions, "Superseded by medication change; do not dispense/administer this previous order."].filter(Boolean).join("\n"),
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(prescriptionItems.id, targetItem.id), eq(prescriptionItems.prescriptionId, id), isNull(prescriptionItems.deletedAt)));

      const [updated] = await db
        .update(prescriptions)
        .set({
          medication: nextDrugName || existing.medication,
          genericName: itemPatch.genericName !== undefined ? String(itemPatch.genericName || "").trim() || null : existing.genericName,
          strength: itemPatch.strength !== undefined ? String(itemPatch.strength || "").trim() || null : existing.strength,
          dosage: itemPatch.dosage !== undefined ? String(itemPatch.dosage || "").trim() : existing.dosage,
          frequency: nextFrequency,
          duration: itemPatch.duration !== undefined ? String(itemPatch.duration || "").trim() || null : existing.duration,
          quantity: nextQuantity,
          instructions: itemPatch.instructions !== undefined ? String(itemPatch.instructions || "").trim() || null : existing.instructions,
          notes: body.notes !== undefined ? String(body.notes || "").trim() || null : existing.notes,
          status: "active",
          updatedAt: new Date(),
        })
        .where(and(eq(prescriptions.id, id), eq(prescriptions.tenantId, doctor.tenantId!), isNull(prescriptions.deletedAt)))
        .returning();

      await cancelPendingMedicationAdministrations(doctor.tenantId!, id, "Prescription changed by doctor.");
      const doseCount = await createMedicationAdministrationRecords({
        tenantId: doctor.tenantId!,
        prescriptionId: id,
        patientId: existing.patientId,
        items: changedItem ? [changedItem] : [],
      });

      await notifyPrescriptionWorkflow({
        tenantId: doctor.tenantId!,
        prescriptionId: id,
        patientId: existing.patientId,
        doctorId: doctor.id,
        patientName: existing.patientName,
        medication: nextDrugName || existing.medication,
        message: `${existing.medication || "A prescription"} for ${existing.patientName} was changed by the doctor.${doseCount ? ` ${doseCount} new administration dose(s) were scheduled.` : ""}`,
        roles: doseCount ? ["pharmacist", "pharmacy", "nurse", "nursing"] : ["pharmacist", "pharmacy"],
        type: "prescription_changed",
        title: "Prescription changed",
        extra: { doseCount, route: nextRoute },
      });

      await syncPatientCareInvoice(doctor.tenantId!, existing.patientId).catch((error) => {
        console.error("Failed to sync patient care invoice after medication change:", error);
      });

      return NextResponse.json(updated);
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status) updateData.status = String(body.status);
    if (body.instructions !== undefined) updateData.instructions = String(body.instructions || "") || null;
    if (body.notes !== undefined) updateData.notes = String(body.notes || "") || null;
    if (body.pharmacy !== undefined) updateData.pharmacy = String(body.pharmacy || "") || null;
    if (body.validUntil !== undefined) updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null;

    const [updated] = await db
      .update(prescriptions)
      .set(updateData)
      .where(and(eq(prescriptions.id, id), eq(prescriptions.tenantId, doctor.tenantId!), isNull(prescriptions.deletedAt)))
      .returning();

    if (String(updateData.status || "").match(/^(completed|discontinued|cancelled|canceled)$/)) {
      await cancelPendingMedicationAdministrations(doctor.tenantId!, id, "Prescription closed by doctor.");
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update doctor prescription error:", error);
    return NextResponse.json({ error: "Failed to update prescription" }, { status: 500 });
  }
}

async function notifyPrescriptionWorkflow({
  tenantId,
  prescriptionId,
  patientId,
  doctorId,
  medication,
  message,
  roles,
  type,
  title,
  extra = {},
}: {
  tenantId: string;
  prescriptionId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  medication?: string | null;
  message: string;
  roles: string[];
  type: string;
  title: string;
  extra?: Record<string, unknown>;
}) {
  await notifyMedicationRoleUsers({
    tenantId,
    roleNames: roles,
    type,
    title,
    message,
    metadata: { prescriptionId, patientId, medication, updatedBy: doctorId, ...extra },
  });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const doctorContext = await resolveDoctorContext(request.headers);
  if (!doctorContext.ok) {
    return NextResponse.json({ error: doctorContext.error }, { status: doctorContext.status });
  }

  const { doctor } = doctorContext;
  const { id } = await context.params;

  try {
    const [deleted] = await db
      .update(prescriptions)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(prescriptions.id, id), eq(prescriptions.tenantId, doctor.tenantId!), isNull(prescriptions.deletedAt)))
      .returning({ id: prescriptions.id });

    if (!deleted) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    await db
      .update(prescriptionItems)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(prescriptionItems.prescriptionId, id), isNull(prescriptionItems.deletedAt)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete doctor prescription error:", error);
    return NextResponse.json({ error: "Failed to delete prescription" }, { status: 500 });
  }
}

