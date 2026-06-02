import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryItems, patients, prescriptionItems, prescriptions, visits } from "@/lib/db/schema";
import { resolveDoctorContext } from "@/lib/doctor/server";
import { syncPatientCareInvoice } from "@/lib/billing/patient-ledger";
import {
  createMedicationAdministrationRecords,
  isNurseAdministrationRoute,
  isTakeHomeRoute,
  notifyMedicationRoleUsers,
} from "@/lib/medication-workflow";

function parseStock(value: string | null | undefined) {
  const amount = Number(value || "0");
  return Number.isFinite(amount) ? amount : 0;
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
    const search = request.nextUrl.searchParams.get("search")?.trim() || "";
    const status = request.nextUrl.searchParams.get("status")?.trim() || "all";

    const conditions = [
      eq(prescriptions.tenantId, doctor.tenantId),
      eq(prescriptions.doctorId, doctor.id),
      isNull(prescriptions.deletedAt),
      isNull(patients.deletedAt),
    ];

    if (status !== "all") {
      conditions.push(eq(prescriptions.status, status));
    }

    if (search) {
      conditions.push(
        or(
          ilike(patients.firstName, `%${search}%`),
          ilike(patients.lastName, `%${search}%`),
          ilike(patients.globalPatientId, `%${search}%`),
          ilike(prescriptions.medication, `%${search}%`),
          ilike(prescriptions.genericName, `%${search}%`)
        )!
      );
    }

    const rows = await db
      .select({
        id: prescriptions.id,
        patientId: patients.id,
        patientName: sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`,
        patientEmail: patients.email,
        patientPhone: patients.phone,
        globalPatientId: patients.globalPatientId,
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
      })
      .from(prescriptions)
      .innerJoin(patients, eq(patients.id, prescriptions.patientId))
      .where(and(...conditions))
      .orderBy(desc(prescriptions.prescribedAt), desc(prescriptions.createdAt));

    const [statsRow] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${prescriptions.status} = 'active')::int`,
        pending: sql<number>`count(*) filter (where ${prescriptions.status} = 'pending')::int`,
        completed: sql<number>`count(*) filter (where ${prescriptions.status} = 'completed')::int`,
        expiringSoon: sql<number>`count(*) filter (where ${prescriptions.status} = 'active' and ${prescriptions.expiresAt} <= now() + interval '7 days')::int`,
        lowRefills: sql<number>`count(*) filter (where ${prescriptions.status} = 'active' and coalesce(${prescriptions.refillsRemaining}, 0) <= 1)::int`,
      })
      .from(prescriptions)
      .where(and(eq(prescriptions.tenantId, doctor.tenantId), eq(prescriptions.doctorId, doctor.id), isNull(prescriptions.deletedAt)));

    return NextResponse.json({
      prescriptions: rows,
      stats: {
        total: statsRow?.total ?? 0,
        active: statsRow?.active ?? 0,
        pending: statsRow?.pending ?? 0,
        completed: statsRow?.completed ?? 0,
        expiringSoon: statsRow?.expiringSoon ?? 0,
        lowRefills: statsRow?.lowRefills ?? 0,
      },
    });
  } catch (error) {
    console.error("Doctor prescriptions API error:", error);
    return NextResponse.json({ error: "Failed to fetch prescriptions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await resolveDoctorContext(request.headers);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { doctor } = context;
  if (!doctor.tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const patientId = String(body.patientId || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!patientId || items.length === 0) {
      return NextResponse.json({ error: "Patient and at least one medication are required" }, { status: 400 });
    }

    const patient = await db.query.patients.findFirst({
      where: and(eq(patients.id, patientId), eq(patients.tenantId, doctor.tenantId), isNull(patients.deletedAt)),
      columns: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    for (const item of items) {
      if (item.medicationId) {
        const stockItem = await db.query.inventoryItems.findFirst({
          where: and(eq(inventoryItems.id, String(item.medicationId)), eq(inventoryItems.tenantId, doctor.tenantId), isNull(inventoryItems.deletedAt)),
        });

        if (!stockItem) {
          return NextResponse.json({ error: `Medication ${item.drugName || "item"} not found in stock` }, { status: 404 });
        }

        if (parseStock(stockItem.stock) <= 0) {
          return NextResponse.json({ error: `${stockItem.name} is currently out of stock` }, { status: 409 });
        }
      }
    }

    const [visit] = await db
      .insert(visits)
      .values({
        tenantId: doctor.tenantId,
        patientId,
        doctorId: doctor.id,
        reason: String(body.diagnosis || body.notes || "Prescription review"),
        notes: String(body.notes || "").trim() || null,
      })
      .returning({ id: visits.id });

    const primaryItem = items[0];
    const [prescription] = await db
      .insert(prescriptions)
      .values({
        tenantId: doctor.tenantId,
        visitId: visit.id,
        doctorId: doctor.id,
        patientId,
        medication: String(primaryItem.drugName || "").trim(),
        genericName: String(primaryItem.genericName || "").trim() || null,
        strength: String(primaryItem.strength || "").trim() || null,
        dosage: String(primaryItem.dosage || "").trim(),
        frequency: String(primaryItem.frequency || "").trim() || null,
        duration: String(primaryItem.duration || "").trim() || null,
        quantity: Number(primaryItem.quantity || 1),
        refills: Number(primaryItem.refills || 0),
        refillsRemaining: Number(primaryItem.refills || 0),
        instructions: String(primaryItem.instructions || "").trim() || null,
        indications: String(body.diagnosis || "").trim() || null,
        status: "active",
        prescribedBy: doctor.fullName || doctor.email,
        prescribedAt: new Date(),
        expiresAt: body.validUntil ? new Date(body.validUntil) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        pharmacy: String(body.pharmacy || "").trim() || null,
        notes: String(body.notes || "").trim() || null,
        interactions: Array.isArray(body.interactions) ? body.interactions : [],
        sideEffects: Array.isArray(body.sideEffects) ? body.sideEffects : [],
        diagnosis: String(body.diagnosis || "").trim() || null,
        priority: String(body.priority || "normal"),
        isEmergency: Boolean(body.isEmergency),
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
      })
      .returning();

    const insertedItems = await db.insert(prescriptionItems).values(
      items.map((item: any) => ({
        prescriptionId: prescription.id,
        medicationId: item.medicationId ? String(item.medicationId) : null,
        drugName: String(item.drugName || "").trim(),
        genericName: String(item.genericName || "").trim() || null,
        strength: String(item.strength || "").trim() || null,
        dosage: String(item.dosage || "").trim(),
        frequency: String(item.frequency || "").trim() || null,
        duration: String(item.duration || "").trim() || null,
        quantity: Number(item.quantity || 1),
        instructions: String(item.instructions || "").trim() || null,
        refills: Number(item.refills || 0),
        isPrn: Boolean(item.isPrn),
        route: String(item.route || "").trim() || null,
      }))
    ).returning({
      id: prescriptionItems.id,
      drugName: prescriptionItems.drugName,
      quantity: prescriptionItems.quantity,
      frequency: prescriptionItems.frequency,
      route: prescriptionItems.route,
    });

    const nurseDoseCount = await createMedicationAdministrationRecords({
      tenantId: doctor.tenantId,
      prescriptionId: prescription.id,
      patientId,
      items: insertedItems,
    });

    const patientName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "A patient";
    const takeHomeCount = insertedItems.filter((item) => isTakeHomeRoute(item.route)).length;
    if (takeHomeCount) {
      await notifyMedicationRoleUsers({
        tenantId: doctor.tenantId,
        roleNames: ["pharmacist", "pharmacy"],
        type: "prescription_created",
        title: "New take-home prescription",
        message: `${prescription.medication || "Medication"} was prescribed for ${patientName}. ${takeHomeCount} item(s) require pharmacy dispensing.`,
        metadata: { prescriptionId: prescription.id, patientId, visitId: visit.id, orderedBy: doctor.id },
      });
    }

    if (nurseDoseCount || insertedItems.some((item) => isNurseAdministrationRoute(item.route))) {
      await notifyMedicationRoleUsers({
        tenantId: doctor.tenantId,
        roleNames: ["nurse", "nursing"],
        type: "medication_administration_created",
        title: "New medication administration order",
        message: `${prescription.medication || "Medication"} for ${patientName} has ${nurseDoseCount} administration dose(s) scheduled.`,
        metadata: { prescriptionId: prescription.id, patientId, visitId: visit.id, orderedBy: doctor.id, doseCount: nurseDoseCount },
      });
    }

    await syncPatientCareInvoice(doctor.tenantId, patientId).catch((error) => {
      console.error("Failed to sync patient care invoice after prescription creation:", error);
    });

    return NextResponse.json({ prescription }, { status: 201 });
  } catch (error) {
    console.error("Create doctor prescription API error:", error);
    return NextResponse.json({ error: "Failed to create prescription" }, { status: 500 });
  }
}
