import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inventoryItems,
  notifications,
  patients,
  prescriptionItems,
  prescriptions,
  roles,
  userRoles,
  users,
  visits,
} from "@/lib/db/schema";
import { buildStockInfo, formatPatientName } from "@/lib/doctor/prescriptions";
import { resolveDoctorContext } from "@/lib/doctor/server";

async function notifyPharmacyUsers(tenantId: string, message: string, metadata: Record<string, unknown>) {
  const activeUsers = await db
    .select({
      id: users.id,
      baseRole: users.role,
      linkedRole: roles.name,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true), isNull(users.deletedAt)));

  const recipients = Array.from(
    new Set(
      activeUsers
        .filter((user) => {
          const roleNames = [user.baseRole, user.linkedRole].filter(Boolean).map((value) => String(value).toLowerCase());
          return roleNames.includes("pharmacist") || roleNames.includes("pharmacy");
        })
        .map((user) => user.id)
    )
  );

  if (recipients.length === 0) return;

  await db.insert(notifications).values(
    recipients.map((userId) => ({
      tenantId,
      userId,
      type: "prescription_updated",
      title: "Prescription updated",
      message,
      metadata,
      read: false,
    }))
  );
}

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

  return {
    ...prescription,
    patientName: formatPatientName(prescription.patientFirstName, prescription.patientLastName),
    items: items.map((item) => ({
      ...item,
      stockInfo: buildStockInfo(item.inventoryStock),
    })),
  };
}

export async function GET(request: NextRequest, context: RouteContext<"/api/doctor/prescriptions/[id]">) {
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

export async function PATCH(request: NextRequest, context: RouteContext<"/api/doctor/prescriptions/[id]">) {
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

      return NextResponse.json(updated);
    }

    if (action === "discontinue") {
      const [updated] = await db
        .update(prescriptions)
        .set({ status: "discontinued", notes: body.notes ? String(body.notes) : existing.notes, updatedAt: new Date() })
        .where(and(eq(prescriptions.id, id), eq(prescriptions.tenantId, doctor.tenantId!), isNull(prescriptions.deletedAt)))
        .returning();

      await notifyPharmacyUsers(
        doctor.tenantId!,
        `${existing.medication || "A prescription"} for ${existing.patientName} was discontinued.`,
        { prescriptionId: id, patientId: existing.patientId, updatedBy: doctor.id }
      );

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

      await notifyPharmacyUsers(
        doctor.tenantId!,
        `${existing.medication || "A prescription"} for ${existing.patientName} was renewed.`,
        { prescriptionId: id, patientId: existing.patientId, updatedBy: doctor.id, refillAmount }
      );

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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update doctor prescription error:", error);
    return NextResponse.json({ error: "Failed to update prescription" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext<"/api/doctor/prescriptions/[id]">) {
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

