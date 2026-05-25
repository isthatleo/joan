import { and, eq, ilike, isNull } from "drizzle-orm";
import { db } from "../lib/db";
import { bedAssignments, carePlanTasks, carePlans, medicationAdministrations, patients, prescriptionItems, prescriptions, queues, tenants, users, visits } from "../lib/db/schema";

const tenantSlug = "test-general";
const patientEmail = "doctor-smoke-patient@test.com";

async function main() {
  const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, tenantSlug)).limit(1);
  if (!tenant) throw new Error(`Tenant ${tenantSlug} not found`);

  const [nurse] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(and(eq(users.tenantId, tenant.id), ilike(users.email, "%nurse%"), isNull(users.deletedAt))).limit(1);
  if (!nurse) throw new Error("No nurse user found for smoke data");

  const [patient] = await db.select({ id: patients.id }).from(patients).where(and(eq(patients.tenantId, tenant.id), ilike(patients.email, patientEmail), isNull(patients.deletedAt))).limit(1);
  if (!patient) throw new Error(`Patient ${patientEmail} not found`);

  let [prescription] = await db.select({ id: prescriptions.id }).from(prescriptions).where(and(eq(prescriptions.tenantId, tenant.id), eq(prescriptions.patientId, patient.id), isNull(prescriptions.deletedAt))).limit(1);
  if (!prescription) {
    const [visit] = await db.select({ id: visits.id }).from(visits).where(and(eq(visits.tenantId, tenant.id), eq(visits.patientId, patient.id), isNull(visits.deletedAt))).limit(1);
    if (!visit) throw new Error("No visit found to anchor prescription");
    [prescription] = await db.insert(prescriptions).values({
      tenantId: tenant.id,
      visitId: visit.id,
      patientId: patient.id,
      medication: "Paracetamol",
      dosage: "1 tablet",
      frequency: "Every 8 hours",
      status: "active",
      prescribedAt: new Date(),
      prescribedBy: "Smoke Doctor",
    }).returning({ id: prescriptions.id });
  }

  let [item] = await db.select({ id: prescriptionItems.id }).from(prescriptionItems).where(eq(prescriptionItems.prescriptionId, prescription.id)).limit(1);
  if (!item) {
    [item] = await db.insert(prescriptionItems).values({
      prescriptionId: prescription.id,
      drugName: "Paracetamol",
      genericName: "Acetaminophen",
      strength: "500mg",
      dosage: "1 tablet",
      frequency: "Every 8 hours",
      duration: "5 days",
      quantity: 10,
      route: "Oral",
      instructions: "Give after meals",
    }).returning({ id: prescriptionItems.id });
  }

  const [bed] = await db.select({ id: bedAssignments.id }).from(bedAssignments).where(and(eq(bedAssignments.tenantId, tenant.id), eq(bedAssignments.patientId, patient.id), isNull(bedAssignments.deletedAt))).limit(1);
  if (!bed) {
    await db.insert(bedAssignments).values({
      tenantId: tenant.id,
      patientId: patient.id,
      bedNumber: "B-12",
      ward: "Medical",
      room: "12A",
      status: "occupied",
      assignedNurseId: nurse.id,
      admissionDate: new Date(),
      condition: "Under observation",
      notes: "Smoke nurse assignment",
    });
  }

  const [extraAvailableBed] = await db.select({ id: bedAssignments.id }).from(bedAssignments).where(and(eq(bedAssignments.tenantId, tenant.id), eq(bedAssignments.bedNumber, "B-13"), isNull(bedAssignments.deletedAt))).limit(1);
  if (!extraAvailableBed) {
    await db.insert(bedAssignments).values({
      tenantId: tenant.id,
      bedNumber: "B-13",
      ward: "Medical",
      room: "12B",
      status: "available",
      assignedNurseId: nurse.id,
      notes: "Open smoke bed",
    });
  }

  const [carePlan] = await db.select({ id: carePlans.id }).from(carePlans).where(and(eq(carePlans.tenantId, tenant.id), eq(carePlans.patientId, patient.id), isNull(carePlans.deletedAt))).limit(1);
  let carePlanId = carePlan?.id;
  if (!carePlanId) {
    const [createdPlan] = await db.insert(carePlans).values({
      tenantId: tenant.id,
      patientId: patient.id,
      createdBy: nurse.id,
      assignedNurseId: nurse.id,
      title: "Acute observation plan",
      diagnosis: "Fever monitoring",
      goals: "Maintain temperature below 38C\nSupport oral hydration",
      interventions: "Check vitals every 4 hours\nEncourage fluid intake\nEscalate persistent fever",
      status: "active",
      priority: "urgent",
      startDate: new Date(),
      targetDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      notes: "Smoke nurse care plan",
    }).returning({ id: carePlans.id });
    carePlanId = createdPlan.id;
  }

  const [task] = await db.select({ id: carePlanTasks.id }).from(carePlanTasks).where(and(eq(carePlanTasks.carePlanId, carePlanId!), isNull(carePlanTasks.deletedAt))).limit(1);
  if (!task) {
    await db.insert(carePlanTasks).values({
      carePlanId: carePlanId!,
      assignedTo: nurse.id,
      title: "Repeat vitals at noon",
      description: "Capture BP, HR, temperature, and SpO2.",
      dueAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      status: "pending",
    });
  }

  const [administration] = await db.select({ id: medicationAdministrations.id }).from(medicationAdministrations).where(and(eq(medicationAdministrations.tenantId, tenant.id), eq(medicationAdministrations.prescriptionItemId, item.id), isNull(medicationAdministrations.deletedAt))).limit(1);
  if (!administration) {
    await db.insert(medicationAdministrations).values({
      tenantId: tenant.id,
      prescriptionId: prescription.id,
      prescriptionItemId: item.id,
      patientId: patient.id,
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
      status: "pending",
      notes: "Smoke medication round",
    });
  }

  const [queueItem] = await db.select({ id: queues.id }).from(queues).where(and(eq(queues.tenantId, tenant.id), eq(queues.patientId, patient.id), isNull(queues.deletedAt))).limit(1);
  if (!queueItem) {
    await db.insert(queues).values({
      tenantId: tenant.id,
      patientId: patient.id,
      assignedTo: nurse.id,
      queueNumber: "NQ-101",
      status: "waiting",
      priority: "high",
      position: 1,
    });
  }

  console.log(JSON.stringify({ tenantId: tenant.id, nurseId: nurse.id, patientId: patient.id, prescriptionId: prescription.id, prescriptionItemId: item.id, carePlanId }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
