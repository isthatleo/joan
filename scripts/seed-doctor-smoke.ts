import * as dbpkg from "../lib/db/index";
import * as schemapkg from "../lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

const db = (dbpkg as any).db ?? (dbpkg as any).default?.db ?? (dbpkg as any)["module.exports"]?.db;
const {
  users,
  userRoles,
  roles,
  patients,
  appointments,
  queues,
  visits,
  diagnoses,
  vitals,
  patientConditions,
  patientAllergies,
  labOrders,
  labResults,
  inventoryItems,
  prescriptions,
  prescriptionItems,
  invoices,
  payments,
  tenants,
} = ((schemapkg as any).default ?? (schemapkg as any)["module.exports"] ?? schemapkg) as typeof import("../lib/db/schema");

if (!db) {
  throw new Error("Failed to resolve db export");
}

const TENANT_SLUG = "test-general";
const DOCTOR_EMAIL = "doctor@test.com";
const PATIENT_EMAIL = "doctor-smoke-patient@test.com";
const PATIENT_GLOBAL_ID = "D-SMOKE-001";
const PATIENT_MRN = "MRN-DOC-SMOKE-001";
const INVENTORY_NAME = "Amoxicillin 500mg Capsules";

async function main() {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, TENANT_SLUG),
    columns: { id: true, slug: true, name: true },
  });

  if (!tenant) {
    throw new Error(`Tenant ${TENANT_SLUG} not found`);
  }

  const doctorRows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      tenantId: users.tenantId,
      linkedRole: roles.name,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(users.email, DOCTOR_EMAIL), eq(users.tenantId, tenant.id), isNull(users.deletedAt)));

  const doctor = doctorRows.find((row) => row.linkedRole === "doctor") ?? doctorRows[0];
  if (!doctor) {
    throw new Error(`Doctor ${DOCTOR_EMAIL} not found in tenant ${TENANT_SLUG}`);
  }

  let patient = await db.query.patients.findFirst({
    where: and(eq(patients.tenantId, tenant.id), eq(patients.email, PATIENT_EMAIL), isNull(patients.deletedAt)),
  });

  if (!patient) {
    [patient] = await db
      .insert(patients)
      .values({
        tenantId: tenant.id,
        globalPatientId: PATIENT_GLOBAL_ID,
        fullName: "Doctor Smoke Patient",
        mrn: PATIENT_MRN,
        firstName: "Doctor",
        lastName: "Smoke Patient",
        dob: new Date("1992-08-17T00:00:00.000Z"),
        gender: "female",
        phone: "+256700000111",
        email: PATIENT_EMAIL,
        address: "Kampala Central",
        status: "active",
      })
      .returning();
  } else {
    [patient] = await db
      .update(patients)
      .set({
        fullName: patient.fullName || "Doctor Smoke Patient",
        mrn: patient.mrn || PATIENT_MRN,
        globalPatientId: patient.globalPatientId || PATIENT_GLOBAL_ID,
        status: patient.status || "active",
      })
      .where(eq(patients.id, patient.id))
      .returning();
  }

  const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const completedVisitAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const completedLabAt = new Date(Date.now() - 6 * 60 * 60 * 1000);

  let appointment = await db.query.appointments.findFirst({
    where: and(eq(appointments.tenantId, tenant.id), eq(appointments.patientId, patient.id), eq(appointments.doctorId, doctor.id), isNull(appointments.deletedAt)),
  });
  if (!appointment) {
    [appointment] = await db
      .insert(appointments)
      .values({
        tenantId: tenant.id,
        patientId: patient.id,
        doctorId: doctor.id,
        scheduledAt,
        status: "scheduled",
      })
      .returning();
  }

  let visit = await db.query.visits.findFirst({
    where: and(eq(visits.tenantId, tenant.id), eq(visits.patientId, patient.id), eq(visits.doctorId, doctor.id), isNull(visits.deletedAt)),
  });
  if (!visit) {
    [visit] = await db
      .insert(visits)
      .values({
        tenantId: tenant.id,
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentId: appointment.id,
        reason: "Initial doctor smoke consultation",
        notes: "Symptoms: persistent cough\n\nAssessment: patient stable\n\nDiagnosis: respiratory tract infection\n\nPlan: lab work and antibiotic course",
      })
      .returning();
  }

  const existingDiagnosis = await db.query.diagnoses.findFirst({
    where: and(eq(diagnoses.visitId, visit.id), eq(diagnoses.description, "Respiratory tract infection"), isNull(diagnoses.deletedAt)),
  });
  if (!existingDiagnosis) {
    await db.insert(diagnoses).values({
      visitId: visit.id,
      code: "J22",
      description: "Respiratory tract infection",
    });
  }

  const existingVitals = await db.query.vitals.findFirst({
    where: and(eq(vitals.visitId, visit.id), isNull(vitals.deletedAt)),
  });
  if (!existingVitals) {
    await db.insert(vitals).values({
      visitId: visit.id,
      temperature: "37.8 C",
      bloodPressure: "128/84",
      heartRate: "88 bpm",
    });
  }

  const existingCondition = await db.query.patientConditions.findFirst({
    where: and(eq(patientConditions.patientId, patient.id), eq(patientConditions.condition, "Respiratory tract infection"), isNull(patientConditions.deletedAt)),
  });
  if (!existingCondition) {
    await db.insert(patientConditions).values({
      patientId: patient.id,
      condition: "Respiratory tract infection",
    });
  }

  const existingAllergy = await db.query.patientAllergies.findFirst({
    where: and(eq(patientAllergies.patientId, patient.id), eq(patientAllergies.allergy, "Penicillin sensitivity"), isNull(patientAllergies.deletedAt)),
  });
  if (!existingAllergy) {
    await db.insert(patientAllergies).values({
      patientId: patient.id,
      allergy: "Penicillin sensitivity",
    });
  }

  let inventory = await db.query.inventoryItems.findFirst({
    where: and(eq(inventoryItems.tenantId, tenant.id), eq(inventoryItems.name, INVENTORY_NAME), isNull(inventoryItems.deletedAt)),
  });
  if (!inventory) {
    [inventory] = await db
      .insert(inventoryItems)
      .values({
        tenantId: tenant.id,
        name: INVENTORY_NAME,
        stock: "120",
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      })
      .returning();
  }

  let prescription = await db.query.prescriptions.findFirst({
    where: and(eq(prescriptions.tenantId, tenant.id), eq(prescriptions.patientId, patient.id), eq(prescriptions.doctorId, doctor.id), eq(prescriptions.medication, INVENTORY_NAME), isNull(prescriptions.deletedAt)),
  });
  if (!prescription) {
    [prescription] = await db
      .insert(prescriptions)
      .values({
        tenantId: tenant.id,
        visitId: visit.id,
        doctorId: doctor.id,
        patientId: patient.id,
        medication: INVENTORY_NAME,
        genericName: "Amoxicillin",
        strength: "500mg",
        dosage: "1 capsule",
        frequency: "3 times daily",
        duration: "7 days",
        quantity: 21,
        refills: 1,
        refillsRemaining: 1,
        instructions: "Take after meals",
        indications: "Respiratory tract infection",
        status: "active",
        prescribedBy: doctor.fullName || doctor.email,
        prescribedAt: completedVisitAt,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        pharmacy: "Main Pharmacy",
        notes: "Monitor for allergy due to recorded sensitivity",
        interactions: ["Review allergy history before dispensing"],
        sideEffects: ["Nausea", "Mild rash"],
        diagnosis: "Respiratory tract infection",
        priority: "urgent",
        isEmergency: false,
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      })
      .returning();
  }

  const existingPrescriptionItem = await db.query.prescriptionItems.findFirst({
    where: and(eq(prescriptionItems.prescriptionId, prescription.id), eq(prescriptionItems.drugName, INVENTORY_NAME), isNull(prescriptionItems.deletedAt)),
  });
  if (!existingPrescriptionItem) {
    await db.insert(prescriptionItems).values({
      prescriptionId: prescription.id,
      medicationId: inventory.id,
      drugName: INVENTORY_NAME,
      genericName: "Amoxicillin",
      strength: "500mg",
      dosage: "1 capsule",
      frequency: "3 times daily",
      duration: "7 days",
      quantity: 21,
      instructions: "Take after meals",
      refills: 1,
      isPrn: false,
      route: "oral",
    });
  }

  let completedLabOrder = await db.query.labOrders.findFirst({
    where: and(eq(labOrders.tenantId, tenant.id), eq(labOrders.patientId, patient.id), eq(labOrders.doctorId, doctor.id), eq(labOrders.testCode, "CBC-SMOKE"), isNull(labOrders.deletedAt)),
  });
  if (!completedLabOrder) {
    [completedLabOrder] = await db
      .insert(labOrders)
      .values({
        tenantId: tenant.id,
        patientId: patient.id,
        doctorId: doctor.id,
        visitId: visit.id,
        orderedBy: doctor.id,
        testName: "Complete Blood Count",
        testCode: "CBC-SMOKE",
        category: "Hematology",
        priority: "urgent",
        orderedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        completedAt: completedLabAt,
        notes: "Assess infection markers",
        dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000),
        labLocation: "Main Lab",
        status: "completed",
      })
      .returning();
  }

  let pendingLabOrder = await db.query.labOrders.findFirst({
    where: and(eq(labOrders.tenantId, tenant.id), eq(labOrders.patientId, patient.id), eq(labOrders.doctorId, doctor.id), eq(labOrders.testCode, "CMP-SMOKE"), isNull(labOrders.deletedAt)),
  });
  if (!pendingLabOrder) {
    [pendingLabOrder] = await db
      .insert(labOrders)
      .values({
        tenantId: tenant.id,
        patientId: patient.id,
        doctorId: doctor.id,
        visitId: visit.id,
        orderedBy: doctor.id,
        testName: "Comprehensive Metabolic Panel",
        testCode: "CMP-SMOKE",
        category: "Chemistry",
        priority: "routine",
        orderedAt: new Date(),
        notes: "Baseline metabolic check",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        labLocation: "Main Lab",
        status: "ordered",
      })
      .returning();
  }

  let labResult = await db.query.labResults.findFirst({
    where: and(eq(labResults.tenantId, tenant.id), eq(labResults.labOrderId, completedLabOrder.id), isNull(labResults.deletedAt)),
  });
  if (!labResult) {
    [labResult] = await db
      .insert(labResults)
      .values({
        tenantId: tenant.id,
        labOrderId: completedLabOrder.id,
        resultData: {
          summary: "Elevated white blood cell count consistent with infection",
          values: [
            { name: "WBC", value: "14.2", unit: "10^9/L", referenceRange: "4.0 - 11.0", flag: "high", interpretation: "Elevated" },
            { name: "Hemoglobin", value: "12.6", unit: "g/dL", referenceRange: "12.0 - 15.5", flag: "normal" },
            { name: "Platelets", value: "265", unit: "10^9/L", referenceRange: "150 - 450", flag: "normal" },
          ],
          notes: "Correlate with clinical infection picture.",
          attachments: [],
          status: "pending_review",
          publishedAt: completedLabAt.toISOString(),
          acceptedAt: null,
          acceptedByDoctorId: null,
          acceptedByDoctorName: null,
          requestedRepeatAt: null,
          followUpOrderId: null,
        },
        fileUrl: null,
      })
      .returning();
  }

  let invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.tenantId, tenant.id), eq(invoices.patientId, patient.id), eq(invoices.invoiceNumber, "INV-DOC-SMOKE-001"), isNull(invoices.deletedAt)),
  });
  if (!invoice) {
    [invoice] = await db
      .insert(invoices)
      .values({
        tenantId: tenant.id,
        patientId: patient.id,
        invoiceNumber: "INV-DOC-SMOKE-001",
        amount: "150.00",
        amountDue: "75.00",
        totalAmount: "150.00",
        status: "partial",
        dueDate: new Date().toISOString().slice(0, 10),
        description: "Doctor smoke verification invoice",
        notes: "Supports patient portal eligibility checks for lab results",
        paymentTerms: "Due on receipt",
        items: [{ description: "Consultation and labs", amount: "150.00" }],
        createdBy: doctor.id,
      })
      .returning();
  }

  const existingPayment = await db.query.payments.findFirst({
    where: and(eq(payments.tenantId, tenant.id), eq(payments.invoiceId, invoice.id), eq(payments.transactionId, "PAY-DOC-SMOKE-001"), isNull(payments.deletedAt)),
  });
  if (!existingPayment) {
    await db.insert(payments).values({
      tenantId: tenant.id,
      invoiceId: invoice.id,
      method: "mobile_money",
      amount: "75.00",
      status: "completed",
      transactionId: "PAY-DOC-SMOKE-001",
      notes: "Partial payment for doctor smoke verification",
      fee: "0.00",
      refundAmount: "0.00",
      createdBy: doctor.id,
      processedAt: new Date(),
    });
  }

  let queueEntry = await db.query.queues.findFirst({
    where: and(eq(queues.tenantId, tenant.id), eq(queues.patientId, patient.id), eq(queues.assignedTo, doctor.id), isNull(queues.deletedAt), eq(queues.status, "waiting")),
  });
  if (!queueEntry) {
    [queueEntry] = await db
      .insert(queues)
      .values({
        tenantId: tenant.id,
        patientId: patient.id,
        assignedTo: doctor.id,
        queueNumber: "Q-SMOKE-001",
        status: "waiting",
        priority: "urgent",
        position: 1,
      })
      .returning();
  }

  console.log(
    JSON.stringify(
      {
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
        doctor: { id: doctor.id, email: doctor.email, fullName: doctor.fullName },
        patient: { id: patient.id, email: patient.email, globalPatientId: patient.globalPatientId },
        appointmentId: appointment.id,
        visitId: visit.id,
        queueId: queueEntry.id,
        completedLabOrderId: completedLabOrder.id,
        pendingLabOrderId: pendingLabOrder.id,
        labResultId: labResult.id,
        prescriptionId: prescription.id,
        invoiceId: invoice.id,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
