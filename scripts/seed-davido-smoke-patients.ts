import { config } from "dotenv";
config();

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  claims,
  diagnoses,
  guardianPatients,
  guardians,
  insurancePolicies,
  invoices,
  labOrders,
  labResults,
  notifications,
  patientAllergies,
  patientConditions,
  patients,
  payments,
  prescriptions,
  roles,
  tenants,
  userRoles,
  users,
  userSettings,
  visits,
  vitals,
} from "@/lib/db/schema";
import { account as authAccount, user as authUser } from "@/lib/auth-schema";
import { defaultUserSettings } from "@/lib/user-settings";

const TENANT_SLUG = "davido";
const PASSWORD = "Myname@78";

type SmokePatient = {
  index: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  condition: string;
  allergy: string;
  roleNames: string[];
};

const smokePatients: SmokePatient[] = [
  { index: 1, firstName: "Amina", lastName: "Parent", email: "smoke.patient01@davido.test", phone: "+256700000101", gender: "female", dob: "1988-04-12", condition: "Hypertension", allergy: "Penicillin", roleNames: ["patient", "guardian"] },
  { index: 2, firstName: "Moses", lastName: "Child", email: "smoke.patient02@davido.test", phone: "+256700000102", gender: "male", dob: "2016-09-03", condition: "Asthma", allergy: "Peanuts", roleNames: ["patient"] },
  { index: 3, firstName: "Nadia", lastName: "Okello", email: "smoke.patient03@davido.test", phone: "+256700000103", gender: "female", dob: "1994-01-28", condition: "Migraine", allergy: "None", roleNames: ["patient"] },
  { index: 4, firstName: "Peter", lastName: "Kato", email: "smoke.patient04@davido.test", phone: "+256700000104", gender: "male", dob: "1979-11-19", condition: "Type 2 Diabetes", allergy: "Sulfa drugs", roleNames: ["patient"] },
  { index: 5, firstName: "Sarah", lastName: "Namakula", email: "smoke.patient05@davido.test", phone: "+256700000105", gender: "female", dob: "2001-06-07", condition: "Iron deficiency", allergy: "Latex", roleNames: ["patient"] },
  { index: 6, firstName: "Brian", lastName: "Mugisha", email: "smoke.patient06@davido.test", phone: "+256700000106", gender: "male", dob: "1990-03-15", condition: "Back pain", allergy: "Ibuprofen", roleNames: ["patient"] },
  { index: 7, firstName: "Grace", lastName: "Atim", email: "smoke.patient07@davido.test", phone: "+256700000107", gender: "female", dob: "1985-08-22", condition: "Pregnancy follow-up", allergy: "None", roleNames: ["patient"] },
  { index: 8, firstName: "David", lastName: "Lutaaya", email: "smoke.patient08@davido.test", phone: "+256700000108", gender: "male", dob: "1968-12-30", condition: "Arthritis", allergy: "Aspirin", roleNames: ["patient"] },
  { index: 9, firstName: "Joan", lastName: "Akello", email: "smoke.patient09@davido.test", phone: "+256700000109", gender: "female", dob: "1998-05-11", condition: "Anxiety", allergy: "Shellfish", roleNames: ["patient"] },
  { index: 10, firstName: "Samuel", lastName: "Ouma", email: "smoke.patient10@davido.test", phone: "+256700000110", gender: "male", dob: "1975-10-05", condition: "Chronic cough", allergy: "Codeine", roleNames: ["patient"] },
];

function fullName(patient: SmokePatient) {
  return `${patient.firstName} ${patient.lastName}`;
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(9 + (Math.abs(days) % 8), days % 2 === 0 ? 0 : 30, 0, 0);
  return date;
}

async function ensureRole(tenantId: string, name: string) {
  const existing = await db.query.roles.findFirst({
    where: and(eq(roles.tenantId, tenantId), eq(roles.name, name)),
  });
  if (existing?.id) return existing;

  const [created] = await db.insert(roles).values({ tenantId, name }).returning();
  return created;
}

async function assignRole(userId: string, roleId: string) {
  const existing = await db.query.userRoles.findFirst({
    where: and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)),
  });
  if (!existing) {
    await db.insert(userRoles).values({ userId, roleId });
  }
}

async function ensureAppUser(tenantId: string, patient: SmokePatient, passwordHash: string, authPasswordHash: string) {
  const name = fullName(patient);
  const existing = await db.query.users.findFirst({ where: ilike(users.email, patient.email) });

  let appUser = existing;
  if (appUser?.id) {
    const [updated] = await db
      .update(users)
      .set({
        tenantId,
        email: patient.email,
        fullName: name,
        phone: patient.phone,
        role: patient.roleNames.includes("guardian") ? "guardian" : "patient",
        passwordHash,
        isActive: true,
        updatedAt: new Date(),
        deletedAt: null,
      })
      .where(eq(users.id, appUser.id))
      .returning();
    appUser = updated;
  } else {
    [appUser] = await db
      .insert(users)
      .values({
        tenantId,
        email: patient.email,
        fullName: name,
        phone: patient.phone,
        role: patient.roleNames.includes("guardian") ? "guardian" : "patient",
        passwordHash,
        isActive: true,
      })
      .returning();
  }

  if (!appUser?.id) throw new Error(`Failed to create user for ${patient.email}`);

  const [existingAuthUser] = await db.select().from(authUser).where(eq(authUser.id, appUser.id)).limit(1);
  if (existingAuthUser?.id) {
    await db.update(authUser).set({ name, email: patient.email, emailVerified: true, updatedAt: new Date() }).where(eq(authUser.id, appUser.id));
  } else {
    await db.insert(authUser).values({
      id: appUser.id,
      name,
      email: patient.email,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const [existingAccount] = await db.select().from(authAccount).where(and(eq(authAccount.userId, appUser.id), eq(authAccount.providerId, "credential"))).limit(1);
  if (existingAccount?.id) {
    await db.update(authAccount).set({ accountId: patient.email, password: authPasswordHash, updatedAt: new Date() }).where(eq(authAccount.id, existingAccount.id));
  } else {
    await db.insert(authAccount).values({
      id: crypto.randomUUID(),
      accountId: patient.email,
      providerId: "credential",
      userId: appUser.id,
      password: authPasswordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return appUser;
}

async function ensurePatientRecord(tenantId: string, patient: SmokePatient) {
  const idCode = `DAV-SMOKE-${String(patient.index).padStart(2, "0")}`;
  const existing = await db.query.patients.findFirst({
    where: and(eq(patients.tenantId, tenantId), eq(patients.globalPatientId, idCode)),
  });

  if (existing?.id) {
    const [updated] = await db
      .update(patients)
      .set({
        fullName: fullName(patient),
        firstName: patient.firstName,
        lastName: patient.lastName,
        mrn: idCode,
        dob: new Date(`${patient.dob}T00:00:00`),
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email,
        address: `Smoke Test Address ${patient.index}, Kampala`,
        status: "active",
        updatedAt: new Date(),
        deletedAt: null,
      })
      .where(eq(patients.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(patients)
    .values({
      tenantId,
      globalPatientId: idCode,
      mrn: idCode,
      fullName: fullName(patient),
      firstName: patient.firstName,
      lastName: patient.lastName,
      dob: new Date(`${patient.dob}T00:00:00`),
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      address: `Smoke Test Address ${patient.index}, Kampala`,
      status: "active",
    })
    .returning();
  return created;
}

async function upsertLinkedSettings(userId: string, patientId: string) {
  const settings = {
    ...defaultUserSettings,
    workflow: {
      ...defaultUserSettings.workflow,
      linkedPatientId: patientId,
      defaultLandingPage: "dashboard",
    },
  };

  await db
    .insert(userSettings)
    .values({ userId, settings, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { settings, updatedAt: new Date() },
    });
}

async function ensureClinicalSeed(tenantId: string, patientRecord: typeof patients.$inferSelect, patient: SmokePatient, doctorId: string | null, staffUserId: string | null) {
  const patientId = patientRecord.id;
  const existingVisit = await db.query.visits.findFirst({
    where: and(eq(visits.tenantId, tenantId), eq(visits.patientId, patientId), eq(visits.reason, `Smoke baseline visit ${patient.index}`)),
  });
  let visit = existingVisit;
  if (!visit) {
    [visit] = await db
      .insert(visits)
      .values({
        tenantId,
        patientId,
        doctorId,
        reason: `Smoke baseline visit ${patient.index}`,
        notes: `Seeded smoke workflow record for ${patient.condition}.`,
      })
      .returning();
  }

  if (visit?.id) {
    const existingVitals = await db.query.vitals.findFirst({ where: eq(vitals.visitId, visit.id) });
    if (!existingVitals) {
      await db.insert(vitals).values({
        visitId: visit.id,
        temperature: `${36 + (patient.index % 3) * 0.4}`,
        bloodPressure: `${118 + patient.index}/${76 + (patient.index % 5)}`,
        heartRate: `${68 + patient.index}`,
        respiratoryRate: `${16 + (patient.index % 4)}`,
        oxygenSaturation: `${96 + (patient.index % 3)}%`,
        painScore: patient.index % 6,
        recordedBy: staffUserId,
        recordedAt: new Date(),
        notes: "Smoke baseline vitals.",
      });
    }

    const existingDiagnosis = await db.query.diagnoses.findFirst({
      where: and(eq(diagnoses.visitId, visit.id), eq(diagnoses.description, patient.condition)),
    });
    if (!existingDiagnosis) {
      await db.insert(diagnoses).values({
        visitId: visit.id,
        code: `SMK-${String(patient.index).padStart(2, "0")}`,
        description: patient.condition,
      });
    }
  }

  const existingCondition = await db.query.patientConditions.findFirst({
    where: and(eq(patientConditions.patientId, patientId), eq(patientConditions.condition, patient.condition)),
  });
  if (!existingCondition) await db.insert(patientConditions).values({ patientId, condition: patient.condition });

  const existingAllergy = await db.query.patientAllergies.findFirst({
    where: and(eq(patientAllergies.patientId, patientId), eq(patientAllergies.allergy, patient.allergy)),
  });
  if (!existingAllergy) await db.insert(patientAllergies).values({ patientId, allergy: patient.allergy });

  const scheduledAt = daysFromNow(patient.index % 2 === 0 ? patient.index : -patient.index);
  const existingAppointment = await db.query.appointments.findFirst({
    where: and(eq(appointments.tenantId, tenantId), eq(appointments.patientId, patientId), eq(appointments.status, "scheduled")),
  });
  if (!existingAppointment) {
    await db.insert(appointments).values({
      tenantId,
      patientId,
      doctorId,
      scheduledAt,
      status: patient.index % 2 === 0 ? "scheduled" : "completed",
    });
  }

  const existingPrescription = await db.query.prescriptions.findFirst({
    where: and(eq(prescriptions.tenantId, tenantId), eq(prescriptions.patientId, patientId), eq(prescriptions.medication, `SmokeMed ${patient.index}`)),
  });
  if (!existingPrescription && visit?.id) {
    await db.insert(prescriptions).values({
      tenantId,
      visitId: visit.id,
      doctorId,
      patientId,
      medication: `SmokeMed ${patient.index}`,
      genericName: "Test medication",
      strength: "250mg",
      dosage: "1 tablet",
      frequency: "Twice daily",
      duration: "7 days",
      quantity: 14,
      refills: patient.index % 3,
      refillsRemaining: patient.index % 2,
      instructions: "Smoke test prescription instructions.",
      status: patient.index % 2 === 0 ? "active" : "filled",
      prescribedBy: doctorId || "Smoke Doctor",
      prescribedAt: new Date(),
      diagnosis: patient.condition,
      priority: patient.index % 3 === 0 ? "urgent" : "routine",
      validUntil: daysFromNow(30),
    });
  }

  const existingLabOrder = await db.query.labOrders.findFirst({
    where: and(eq(labOrders.tenantId, tenantId), eq(labOrders.patientId, patientId), eq(labOrders.testCode, `SMOKE-${patient.index}`)),
  });
  let labOrder = existingLabOrder;
  if (!labOrder) {
    [labOrder] = await db
      .insert(labOrders)
      .values({
        tenantId,
        patientId,
        doctorId,
        visitId: visit?.id || null,
        testName: `Smoke CBC ${patient.index}`,
        testCode: `SMOKE-${patient.index}`,
        category: "Hematology",
        priority: patient.index % 4 === 0 ? "urgent" : "routine",
        orderedBy: doctorId,
        orderedAt: new Date(),
        completedAt: patient.index % 2 === 0 ? null : new Date(),
        results: patient.index % 2 === 0 ? null : [{ marker: "Hemoglobin", value: `${12 + patient.index / 10}`, unit: "g/dL", flag: "normal" }],
        notes: "Smoke test lab order.",
        dueDate: daysFromNow(2),
        labLocation: "Main Lab",
        status: patient.index % 2 === 0 ? "ordered" : "completed",
      })
      .returning();
  }

  if (labOrder?.id && patient.index % 2 !== 0) {
    const existingResult = await db.query.labResults.findFirst({ where: eq(labResults.labOrderId, labOrder.id) });
    if (!existingResult) {
      await db.insert(labResults).values({
        tenantId,
        labOrderId: labOrder.id,
        resultData: { summary: "Smoke test result ready", values: [{ marker: "Hemoglobin", value: `${12 + patient.index / 10}`, unit: "g/dL" }] },
        fileUrl: null,
      });
    }
  }

  const existingPolicy = await db.query.insurancePolicies.findFirst({
    where: and(eq(insurancePolicies.tenantId, tenantId), eq(insurancePolicies.patientId, patientId)),
  });
  let policy = existingPolicy;
  if (!policy) {
    [policy] = await db
      .insert(insurancePolicies)
      .values({
        tenantId,
        patientId,
        provider: patient.index % 2 === 0 ? "SmokeCare Insurance" : "Davido Health Plan",
        policyNumber: `POL-DAV-${String(patient.index).padStart(3, "0")}`,
      })
      .returning();
  }

  const invoiceNumber = `INV-DAV-SMOKE-${String(patient.index).padStart(2, "0")}`;
  const existingInvoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.tenantId, tenantId), eq(invoices.invoiceNumber, invoiceNumber)),
  });
  let invoice = existingInvoice;
  if (!invoice) {
    const total = 75000 + patient.index * 5000;
    const paid = patient.index % 3 === 0;
    [invoice] = await db
      .insert(invoices)
      .values({
        tenantId,
        patientId,
        invoiceNumber,
        amount: String(total),
        totalAmount: String(total),
        amountDue: paid ? "0" : String(total),
        status: paid ? "paid" : patient.index % 2 === 0 ? "pending" : "sent",
        dueDate: daysFromNow(14).toISOString().slice(0, 10),
        description: `Smoke workflow invoice for ${fullName(patient)}`,
        notes: "Seeded invoice for smoke testing.",
        paymentTerms: "Due on receipt",
        items: [{ description: "Consultation and diagnostics", amount: total }],
        createdBy: staffUserId,
      })
      .returning();
  }

  if (invoice?.id && patient.index % 3 === 0) {
    const existingPayment = await db.query.payments.findFirst({ where: and(eq(payments.tenantId, tenantId), eq(payments.invoiceId, invoice.id)) });
    if (!existingPayment) {
      await db.insert(payments).values({
        tenantId,
        invoiceId: invoice.id,
        method: "card",
        amount: invoice.totalAmount || invoice.amount || "0",
        status: "completed",
        transactionId: `SMOKE-PAY-${patient.index}-${Date.now()}`,
        notes: "Smoke test payment.",
        createdBy: staffUserId,
        processedAt: new Date(),
      });
    }
  }

  if (invoice?.id && policy?.id && patient.index % 2 === 0) {
    const existingClaim = await db.query.claims.findFirst({ where: and(eq(claims.tenantId, tenantId), eq(claims.invoiceId, invoice.id)) });
    if (!existingClaim) {
      await db.insert(claims).values({
        tenantId,
        invoiceId: invoice.id,
        policyId: policy.id,
        status: patient.index % 4 === 0 ? "approved" : "submitted",
        claimAmount: String(invoice.totalAmount || invoice.amount || "0"),
        approvedAmount: patient.index % 4 === 0 ? String(invoice.totalAmount || invoice.amount || "0") : "0",
        notes: "Smoke insurance claim.",
      });
    }
  }
}

async function main() {
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, TENANT_SLUG) });
  if (!tenant?.id) throw new Error(`Tenant "${TENANT_SLUG}" not found`);

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const authPasswordHash = await bcrypt.hash(PASSWORD, 12);
  const roleByName = new Map<string, string>();
  for (const name of ["patient", "guardian"]) {
    const role = await ensureRole(tenant.id, name);
    roleByName.set(name, role.id);
  }

  const doctor = await db
    .select({ id: users.id })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(users.tenantId, tenant.id), eq(users.isActive, true), isNull(users.deletedAt), eq(roles.name, "doctor")))
    .limit(1);
  const staff = await db.query.users.findFirst({
    where: and(eq(users.tenantId, tenant.id), eq(users.isActive, true), isNull(users.deletedAt)),
    columns: { id: true },
  });

  const created: Array<{ email: string; name: string; patientId: string; roles: string[] }> = [];
  const userIdByIndex = new Map<number, string>();
  const patientIdByIndex = new Map<number, string>();

  for (const smokePatient of smokePatients) {
    const appUser = await ensureAppUser(tenant.id, smokePatient, passwordHash, authPasswordHash);
    const patientRecord = await ensurePatientRecord(tenant.id, smokePatient);

    for (const roleName of smokePatient.roleNames) {
      const roleId = roleByName.get(roleName) || (await ensureRole(tenant.id, roleName)).id;
      await assignRole(appUser.id, roleId);
    }

    await upsertLinkedSettings(appUser.id, patientRecord.id);
    await ensureClinicalSeed(tenant.id, patientRecord, smokePatient, doctor[0]?.id || null, staff?.id || null);

    userIdByIndex.set(smokePatient.index, appUser.id);
    patientIdByIndex.set(smokePatient.index, patientRecord.id);
    created.push({ email: smokePatient.email, name: fullName(smokePatient), patientId: patientRecord.id, roles: smokePatient.roleNames });
  }

  const guardianUserId = userIdByIndex.get(1);
  const childPatientId = patientIdByIndex.get(2);
  if (guardianUserId && childPatientId) {
    let guardian = await db.query.guardians.findFirst({
      where: and(eq(guardians.tenantId, tenant.id), eq(guardians.userId, guardianUserId)),
    });
    if (!guardian) {
      [guardian] = await db.insert(guardians).values({ tenantId: tenant.id, userId: guardianUserId, relationship: "parent" }).returning();
    } else {
      await db.update(guardians).set({ relationship: "parent", updatedAt: new Date() }).where(eq(guardians.id, guardian.id));
    }

    const existingLink = await db.query.guardianPatients.findFirst({
      where: and(eq(guardianPatients.guardianId, guardian.id), eq(guardianPatients.patientId, childPatientId)),
    });
    if (existingLink?.id) {
      await db
        .update(guardianPatients)
        .set({ canViewRecords: true, canSchedule: true, emergencyContact: true })
        .where(eq(guardianPatients.id, existingLink.id));
    } else {
      await db.insert(guardianPatients).values({
        guardianId: guardian.id,
        patientId: childPatientId,
        canViewRecords: true,
        canSchedule: true,
        emergencyContact: true,
      });
    }

    await db.insert(notifications).values({
      tenantId: tenant.id,
      userId: guardianUserId,
      type: "guardian_link",
      title: "Guardian smoke link created",
      message: "Amina Parent is linked as parent/guardian for Moses Child.",
      metadata: { childId: childPatientId, childName: "Moses Child" },
      read: false,
    });
  }

  console.log(JSON.stringify({ tenant: { id: tenant.id, slug: TENANT_SLUG, name: tenant.name }, password: PASSWORD, users: created }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    setTimeout(() => process.exit(process.exitCode || 0), 100);
  });
