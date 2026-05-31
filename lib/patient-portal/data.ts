import * as crypto from "node:crypto";
import { and, desc, eq, ilike, inArray, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getAvailablePaymentMethods, validatePaymentMethod } from "@/lib/billing-settings";
import { db } from "@/lib/db";
import {
  appointments,
  claims,
  insurancePolicies,
  invoices,
  labOrders,
  labResults,
  medicationAdministrations,
  patientAllergies,
  patientConditions,
  patients,
  payments,
  prescriptionItems,
  prescriptions,
  roles,
  tenantSettings,
  tenants,
  userRoles,
  users,
  userSettings,
  visits,
  vitals,
} from "@/lib/db/schema";
import { mergeUserSettings } from "@/lib/user-settings";

const PATIENT_GOALS_KEY = "patient_health_goals";
const PATIENT_SYMPTOMS_KEY = "patient_symptom_logs";
const PATIENT_REFILLS_KEY = "patient_prescription_refills";
const APPOINTMENT_METADATA_KEY = "reception_appointment_metadata";

type ResolvedPatientContext = {
  userId: string;
  email: string;
  fullName: string | null;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  patientId: string;
  patientName: string;
  currency: string;
  settings: ReturnType<typeof mergeUserSettings>;
  hasGuardianRole: boolean;
};

export type PatientPortalContextResult =
  | { ok: true; context: ResolvedPatientContext }
  | { ok: false; status: number; error: string };

type AppointmentMetadata = {
  appointmentId: string;
  appointmentType?: string | null;
  reason?: string | null;
  notes?: string | null;
  updatedAt: string;
};

type StoredGoal = {
  id: string;
  patientId: string;
  title: string;
  target: string;
  unit: string;
  current: string;
  deadline?: string | null;
  notes?: string | null;
  status: "active" | "completed" | "paused";
  updatedAt: string;
};

type StoredSymptom = {
  id: string;
  patientId: string;
  symptom: string;
  severity: number;
  notes?: string | null;
  recordedAt: string;
};

type StoredRefillRequest = {
  id: string;
  patientId: string;
  prescriptionId: string;
  requestedAt: string;
  status: "pending" | "approved" | "denied" | "ready";
  notes?: string | null;
};

function toPatientName(patient: { fullName?: string | null; firstName?: string | null; lastName?: string | null }) {
  if (patient.fullName?.trim()) return patient.fullName.trim();
  return `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Patient";
}

function toMoneyNumber(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoneyValue(value: number) {
  return value.toFixed(2);
}

function toIso(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function getTenantSettingValue<T>(tenantId: string, key: string, fallback: T): Promise<T> {
  const record = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)),
  });
  return (record?.value as T | undefined) ?? fallback;
}

async function setTenantSettingValue(tenantId: string, key: string, value: unknown, updatedBy?: string | null) {
  const existing = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)),
    columns: { id: true },
  });

  if (existing?.id) {
    await db
      .update(tenantSettings)
      .set({ value, updatedAt: new Date(), updatedBy: updatedBy || null })
      .where(eq(tenantSettings.id, existing.id));
    return;
  }

  await db.insert(tenantSettings).values({
    tenantId,
    key,
    value,
    updatedBy: updatedBy || null,
  });
}

async function getAppointmentMetadataMap(tenantId: string) {
  const list = await getTenantSettingValue<AppointmentMetadata[]>(tenantId, APPOINTMENT_METADATA_KEY, []);
  return new Map(list.map((item) => [item.appointmentId, item]));
}

async function upsertAppointmentMetadata(tenantId: string, metadata: AppointmentMetadata, updatedBy?: string | null) {
  const list = await getTenantSettingValue<AppointmentMetadata[]>(tenantId, APPOINTMENT_METADATA_KEY, []);
  const next = [metadata, ...list.filter((item) => item.appointmentId !== metadata.appointmentId)].slice(0, 5000);
  await setTenantSettingValue(tenantId, APPOINTMENT_METADATA_KEY, next, updatedBy);
}

async function getTenantCurrency(tenantId: string) {
  const billing = await getTenantSettingValue<any>(tenantId, "billing", {});
  const preferences = await getTenantSettingValue<any>(tenantId, "preferences", {});
  return String(billing?.currency || preferences?.currency || "USD");
}

async function getPatientPaymentStatus(tenantId: string, patientId: string) {
  const patientInvoices = await db.query.invoices.findMany({
    where: and(eq(invoices.tenantId, tenantId), eq(invoices.patientId, patientId)),
    columns: { id: true, status: true, amountDue: true, totalAmount: true, amount: true, description: true, dueDate: true, createdAt: true },
    orderBy: [desc(invoices.createdAt)],
  });

  const invoiceIds = patientInvoices.map((invoice) => invoice.id);
  const paymentRows = invoiceIds.length
    ? await db.query.payments.findMany({
        where: inArray(payments.invoiceId, invoiceIds),
        orderBy: [desc(payments.createdAt)],
      })
    : [];

  const completedPaymentExists = paymentRows.some((payment) => payment.status === "completed");
  const paidInvoiceExists = patientInvoices.some((invoice) => ["paid", "completed"].includes(String(invoice.status || "").toLowerCase()));
  const outstandingAmount = patientInvoices.reduce((sum, invoice) => sum + toMoneyNumber(invoice.amountDue ?? invoice.totalAmount ?? invoice.amount), 0);

  return {
    invoices: patientInvoices,
    payments: paymentRows,
    hasPaymentClearance: completedPaymentExists || paidInvoiceExists,
    outstandingAmount,
  };
}

async function getPatientCoreProfile(tenantId: string, patientId: string) {
  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.tenantId, tenantId), eq(patients.id, patientId)),
  });

  if (!patient) return null;

  const [allergies, conditions, policies] = await Promise.all([
    db.query.patientAllergies.findMany({ where: eq(patientAllergies.patientId, patientId) }),
    db.query.patientConditions.findMany({ where: eq(patientConditions.patientId, patientId) }),
    db.query.insurancePolicies.findMany({ where: and(eq(insurancePolicies.tenantId, tenantId), eq(insurancePolicies.patientId, patientId)) }),
  ]);

  return {
    patient,
    allergies,
    conditions,
    policies,
  };
}

export async function resolvePatientPortalContext(headers: Headers, rawSlug?: string | null): Promise<PatientPortalContextResult> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.email) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const rows = await db
    .select({
      id: users.id,
      tenantId: users.tenantId,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      baseRole: users.role,
      linkedRole: roles.name,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
      settings: userSettings.settings,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(tenants, eq(tenants.id, users.tenantId))
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(and(ilike(users.email, session.user.email), isNull(users.deletedAt), eq(users.isActive, true)));

  const roleNames = new Set(
    rows.flatMap((item) => [String(item.baseRole || "").toLowerCase(), String(item.linkedRole || "").toLowerCase()]).filter(Boolean),
  );
  const row = rows.find((item) => String(item.baseRole || "").toLowerCase() === "patient" || String(item.linkedRole || "").toLowerCase() === "patient");
  if (!row?.tenantId || !row.tenantSlug) {
    return { ok: false, status: 403, error: "Patient access required" };
  }

  if (rawSlug && rawSlug !== row.tenantSlug) {
    return { ok: false, status: 403, error: "Invalid tenant scope" };
  }

  const settings = mergeUserSettings(row.settings);
  let patientRecord = settings.workflow.linkedPatientId
    ? await db.query.patients.findFirst({
        where: and(eq(patients.tenantId, row.tenantId), eq(patients.id, settings.workflow.linkedPatientId)),
      })
    : null;

  if (!patientRecord && row.email) {
    patientRecord = await db.query.patients.findFirst({
      where: and(eq(patients.tenantId, row.tenantId), ilike(patients.email, row.email)),
    });
  }

  if (!patientRecord && row.phone) {
    patientRecord = await db.query.patients.findFirst({
      where: and(eq(patients.tenantId, row.tenantId), eq(patients.phone, row.phone)),
    });
  }

  if (!patientRecord && row.fullName) {
    patientRecord = await db.query.patients.findFirst({
      where: and(eq(patients.tenantId, row.tenantId), ilike(patients.fullName, row.fullName)),
    });
  }

  if (!patientRecord) {
    return { ok: false, status: 404, error: "Linked patient record not found" };
  }

  const nextSettings = mergeUserSettings({
    ...(row.settings && typeof row.settings === "object" && !Array.isArray(row.settings) ? row.settings as Record<string, unknown> : {}),
    workflow: {
      ...(row.settings && typeof row.settings === "object" ? (row.settings as Record<string, any>).workflow ?? {} : {}),
      linkedPatientId: patientRecord.id,
    },
  });

  await db
    .insert(userSettings)
    .values({
      userId: row.id,
      settings: nextSettings,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        settings: nextSettings,
        updatedAt: new Date(),
      },
    });

  return {
    ok: true,
    context: {
      userId: row.id,
      email: row.email,
      fullName: row.fullName ?? null,
      tenantId: row.tenantId,
      tenantSlug: row.tenantSlug,
      tenantName: row.tenantName || "Hospital",
      patientId: patientRecord.id,
      patientName: toPatientName(patientRecord),
      currency: await getTenantCurrency(row.tenantId),
      settings: nextSettings,
      hasGuardianRole: roleNames.has("guardian"),
    },
  };
}

export async function getPatientDashboardData(context: ResolvedPatientContext) {
  const profile = await getPatientCoreProfile(context.tenantId, context.patientId);
  const latestVisit = await db.query.visits.findFirst({
    where: and(eq(visits.tenantId, context.tenantId), eq(visits.patientId, context.patientId)),
    orderBy: [desc(visits.createdAt)],
  });

  const latestVitals = latestVisit?.id
    ? await db.query.vitals.findMany({
        where: eq(vitals.visitId, latestVisit.id),
        orderBy: [desc(vitals.recordedAt)],
        limit: 5,
      })
    : [];

  const appointmentRows = await db
    .select({
      id: appointments.id,
      scheduledAt: appointments.scheduledAt,
      status: appointments.status,
      doctorName: users.fullName,
      doctorEmail: users.email,
      createdAt: appointments.createdAt,
    })
    .from(appointments)
    .leftJoin(users, eq(users.id, appointments.doctorId))
    .where(and(eq(appointments.tenantId, context.tenantId), eq(appointments.patientId, context.patientId)))
    .orderBy(desc(appointments.scheduledAt));

  const upcomingAppointments = appointmentRows
    .filter((item) => item.scheduledAt && item.scheduledAt >= new Date() && !["cancelled", "completed"].includes(String(item.status || "").toLowerCase()))
    .slice(0, 5);

  const activePrescriptions = await db.query.prescriptions.findMany({
    where: and(eq(prescriptions.tenantId, context.tenantId), eq(prescriptions.patientId, context.patientId)),
    orderBy: [desc(prescriptions.prescribedAt), desc(prescriptions.createdAt)],
    limit: 8,
  });

  const labOrderRows = await db.query.labOrders.findMany({
    where: and(eq(labOrders.tenantId, context.tenantId), eq(labOrders.patientId, context.patientId)),
    orderBy: [desc(labOrders.orderedAt), desc(labOrders.createdAt)],
    limit: 8,
  });
  const orderIds = labOrderRows.map((row) => row.id);
  const resultRows = orderIds.length
    ? await db.query.labResults.findMany({
        where: inArray(labResults.labOrderId, orderIds),
        orderBy: [desc(labResults.createdAt)],
      })
    : [];

  const billing = await getPatientPaymentStatus(context.tenantId, context.patientId);

  return {
    patient: {
      id: context.patientId,
      name: context.patientName,
      email: profile?.patient.email || context.email,
      phone: profile?.patient.phone || null,
      mrn: profile?.patient.mrn || null,
      dob: toIso(profile?.patient.dob),
      gender: profile?.patient.gender || null,
      address: profile?.patient.address || null,
      allergies: profile?.allergies.map((item) => item.allergy),
      conditions: profile?.conditions.map((item) => item.condition),
    },
    stats: {
      upcomingAppointments: upcomingAppointments.length,
      activePrescriptions: activePrescriptions.filter((item) => !["completed", "discontinued", "expired"].includes(String(item.status || "").toLowerCase())).length,
      outstandingInvoices: billing.invoices.filter((item) => !["paid", "completed"].includes(String(item.status || "").toLowerCase())).length,
      completedLabResults: resultRows.length,
    },
    latestVitals: latestVitals.map((item) => ({
      id: item.id,
      temperature: item.temperature,
      bloodPressure: item.bloodPressure,
      heartRate: item.heartRate,
      respiratoryRate: item.respiratoryRate,
      oxygenSaturation: item.oxygenSaturation,
      painScore: item.painScore,
      recordedAt: toIso(item.recordedAt),
      notes: item.notes,
    })),
    latestVisit: latestVisit
      ? {
          id: latestVisit.id,
          reason: latestVisit.reason,
          notes: latestVisit.notes,
          date: toIso(latestVisit.createdAt),
        }
      : null,
    upcomingAppointments: upcomingAppointments.map((item) => ({
      id: item.id,
      scheduledAt: toIso(item.scheduledAt),
      status: item.status || "scheduled",
      doctorName: item.doctorName || item.doctorEmail || "Care team",
    })),
    activePrescriptions: activePrescriptions.slice(0, 5).map((item) => ({
      id: item.id,
      medication: item.medication,
      dosage: item.dosage,
      frequency: item.frequency,
      status: item.status,
      prescribedAt: toIso(item.prescribedAt || item.createdAt),
      prescribedBy: item.prescribedBy,
    })),
    recentLabResults: labOrderRows.slice(0, 5).map((order) => ({
      id: order.id,
      testName: order.testName,
      status: order.status,
      orderedAt: toIso(order.orderedAt || order.createdAt),
      hasResult: resultRows.some((result) => result.labOrderId === order.id),
    })),
    billing: {
      outstandingAmount: billing.outstandingAmount,
      hasPaymentClearance: billing.hasPaymentClearance,
      openInvoices: billing.invoices
        .filter((item) => !["paid", "completed"].includes(String(item.status || "").toLowerCase()))
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          description: item.description,
          amountDue: toMoneyNumber(item.amountDue ?? item.totalAmount ?? item.amount),
          dueDate: toIso(item.dueDate),
          status: item.status,
        })),
    },
    currency: context.currency,
    hasGuardianRole: context.hasGuardianRole,
  };
}

export async function getPatientHealthData(context: ResolvedPatientContext) {
  const visitsForPatient = await db.query.visits.findMany({
    where: and(eq(visits.tenantId, context.tenantId), eq(visits.patientId, context.patientId)),
    orderBy: [desc(visits.createdAt)],
    limit: 20,
  });
  const visitIds = visitsForPatient.map((item) => item.id);
  const vitalsRows = visitIds.length ? await db.query.vitals.findMany({ where: inArray(vitals.visitId, visitIds), orderBy: [desc(vitals.recordedAt)] }) : [];
  const goals = (await getTenantSettingValue<StoredGoal[]>(context.tenantId, PATIENT_GOALS_KEY, [])).filter((goal) => goal.patientId === context.patientId);
  const symptoms = (await getTenantSettingValue<StoredSymptom[]>(context.tenantId, PATIENT_SYMPTOMS_KEY, [])).filter((item) => item.patientId === context.patientId);
  const profile = await getPatientCoreProfile(context.tenantId, context.patientId);

  const latest = vitalsRows[0] || null;
  const metrics = [
    { key: "temperature", label: "Temperature", value: latest?.temperature || "--", unit: "deg C", status: "stable" },
    { key: "heartRate", label: "Heart Rate", value: latest?.heartRate || "--", unit: "bpm", status: "stable" },
    { key: "bloodPressure", label: "Blood Pressure", value: latest?.bloodPressure || "--", unit: "mmHg", status: "stable" },
    { key: "oxygenSaturation", label: "Oxygen Saturation", value: latest?.oxygenSaturation || "--", unit: "%", status: "stable" },
  ];

  return {
    latestVitals: latest
      ? {
          id: latest.id,
          temperature: latest.temperature,
          bloodPressure: latest.bloodPressure,
          heartRate: latest.heartRate,
          respiratoryRate: latest.respiratoryRate,
          oxygenSaturation: latest.oxygenSaturation,
          painScore: latest.painScore,
          notes: latest.notes,
          recordedAt: toIso(latest.recordedAt),
        }
      : null,
    vitalsHistory: vitalsRows.slice(0, 12).map((item) => ({
      id: item.id,
      temperature: item.temperature,
      bloodPressure: item.bloodPressure,
      heartRate: item.heartRate,
      respiratoryRate: item.respiratoryRate,
      oxygenSaturation: item.oxygenSaturation,
      painScore: item.painScore,
      recordedAt: toIso(item.recordedAt),
      notes: item.notes,
    })),
    metrics,
    goals: goals.map((goal) => ({ ...goal })),
    symptoms: symptoms.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()),
    allergies: profile?.allergies.map((item) => item.allergy) ?? [],
    conditions: profile?.conditions.map((item) => item.condition) ?? [],
    currency: context.currency,
  };
}

export async function createPatientHealthGoal(
  context: ResolvedPatientContext,
  payload: { title: string; target: string; unit: string; current?: string; deadline?: string; notes?: string },
) {
  const goals = await getTenantSettingValue<StoredGoal[]>(context.tenantId, PATIENT_GOALS_KEY, []);
  const next: StoredGoal = {
    id: crypto.randomUUID(),
    patientId: context.patientId,
    title: payload.title,
    target: payload.target,
    unit: payload.unit,
    current: payload.current || "0",
    deadline: payload.deadline || null,
    notes: payload.notes || null,
    status: "active",
    updatedAt: new Date().toISOString(),
  };
  await setTenantSettingValue(context.tenantId, PATIENT_GOALS_KEY, [next, ...goals], context.userId);
  return next;
}

export async function createPatientSymptomLog(context: ResolvedPatientContext, payload: { symptom: string; severity: number; notes?: string }) {
  const symptoms = await getTenantSettingValue<StoredSymptom[]>(context.tenantId, PATIENT_SYMPTOMS_KEY, []);
  const next: StoredSymptom = {
    id: crypto.randomUUID(),
    patientId: context.patientId,
    symptom: payload.symptom,
    severity: payload.severity,
    notes: payload.notes || null,
    recordedAt: new Date().toISOString(),
  };
  await setTenantSettingValue(context.tenantId, PATIENT_SYMPTOMS_KEY, [next, ...symptoms], context.userId);
  return next;
}

export async function getPatientRecordsData(context: ResolvedPatientContext) {
  const [visitRows, prescriptionRows, labOrderRows] = await Promise.all([
    db.query.visits.findMany({ where: and(eq(visits.tenantId, context.tenantId), eq(visits.patientId, context.patientId)), orderBy: [desc(visits.createdAt)], limit: 50 }),
    db.query.prescriptions.findMany({ where: and(eq(prescriptions.tenantId, context.tenantId), eq(prescriptions.patientId, context.patientId)), orderBy: [desc(prescriptions.prescribedAt), desc(prescriptions.createdAt)], limit: 50 }),
    db.query.labOrders.findMany({ where: and(eq(labOrders.tenantId, context.tenantId), eq(labOrders.patientId, context.patientId)), orderBy: [desc(labOrders.orderedAt), desc(labOrders.createdAt)], limit: 50 }),
  ]);

  const doctorIds = Array.from(
    new Set([...visitRows.map((item) => item.doctorId).filter(Boolean), ...prescriptionRows.map((item) => item.doctorId).filter(Boolean), ...labOrderRows.map((item) => item.doctorId).filter(Boolean)]),
  ) as string[];
  const providerRows = doctorIds.length ? await db.query.users.findMany({ where: inArray(users.id, doctorIds) }) : [];
  const providerMap = new Map(providerRows.map((item) => [item.id, item.fullName || item.email]));
  const labResultRows = labOrderRows.length ? await db.query.labResults.findMany({ where: inArray(labResults.labOrderId, labOrderRows.map((item) => item.id)) }) : [];
  const labResultMap = new Map(labResultRows.map((item) => [item.labOrderId, item]));

  const records = [
    ...visitRows.map((visit) => ({
      id: visit.id,
      type: "visit",
      title: visit.reason || "Clinical visit",
      description: visit.notes || "Visit record",
      provider: providerMap.get(visit.doctorId || "") || "Care team",
      date: toIso(visit.createdAt),
      status: "final",
      category: "visits",
      notes: visit.notes,
    })),
    ...prescriptionRows.map((item) => ({
      id: item.id,
      type: "prescription",
      title: item.medication || "Medication",
      description: `${item.dosage || ""} ${item.frequency || ""}`.trim() || "Prescription record",
      provider: item.prescribedBy || providerMap.get(item.doctorId || "") || "Doctor",
      date: toIso(item.prescribedAt || item.createdAt),
      status: "final",
      category: "prescriptions",
      notes: item.instructions || item.notes,
    })),
    ...labOrderRows.map((item) => ({
      id: item.id,
      type: "lab",
      title: item.testName || item.testCode || "Lab order",
      description: item.notes || "Lab result record",
      provider: providerMap.get(item.doctorId || item.orderedBy || "") || "Lab",
      date: toIso(item.completedAt || item.orderedAt || item.createdAt),
      status: labResultMap.has(item.id) ? "final" : "preliminary",
      category: "labs",
      notes: item.notes,
    })),
  ].sort((a, b) => new Date(String(b.date || 0)).getTime() - new Date(String(a.date || 0)).getTime());

  const categories = [
    { id: "all", name: "All Records", count: records.length },
    { id: "visits", name: "Visits", count: records.filter((item) => item.category === "visits").length },
    { id: "labs", name: "Lab Results", count: records.filter((item) => item.category === "labs").length },
    { id: "prescriptions", name: "Prescriptions", count: records.filter((item) => item.category === "prescriptions").length },
  ];

  return { records, categories, patientName: context.patientName };
}

export async function getPatientAppointmentOptions(context: ResolvedPatientContext) {
  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      baseRole: users.role,
      linkedRole: roles.name,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(users.tenantId, context.tenantId), eq(users.isActive, true), isNull(users.deletedAt)));

  const doctors = Array.from(
    new Map(
      rows
        .filter((item) => String(item.baseRole || "").toLowerCase() === "doctor" || String(item.linkedRole || "").toLowerCase() === "doctor")
        .map((item) => [item.id, { id: item.id, name: item.fullName || item.email, email: item.email }]),
    ).values(),
  );

  return {
    doctors,
    appointmentTypes: ["Consultation", "Follow-up", "Review", "Telehealth", "Procedure"],
  };
}

export async function getPatientAppointmentsData(context: ResolvedPatientContext) {
  const metadataMap = await getAppointmentMetadataMap(context.tenantId);
  const rows = await db
    .select({
      id: appointments.id,
      scheduledAt: appointments.scheduledAt,
      status: appointments.status,
      doctorId: appointments.doctorId,
      doctorName: users.fullName,
      doctorEmail: users.email,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
    })
    .from(appointments)
    .leftJoin(users, eq(users.id, appointments.doctorId))
    .where(and(eq(appointments.tenantId, context.tenantId), eq(appointments.patientId, context.patientId)))
    .orderBy(desc(appointments.scheduledAt), desc(appointments.createdAt));

  const appointmentsData = rows.map((item) => {
    const metadata = metadataMap.get(item.id);
    return {
      id: item.id,
      scheduledAt: toIso(item.scheduledAt),
      status: item.status || "scheduled",
      doctorId: item.doctorId,
      doctorName: item.doctorName || item.doctorEmail || "Care team",
      appointmentType: metadata?.appointmentType || "Consultation",
      reason: metadata?.reason || "",
      notes: metadata?.notes || "",
      createdAt: toIso(item.createdAt),
      updatedAt: toIso(item.updatedAt),
    };
  });

  return {
    appointments: appointmentsData,
    summary: {
      upcoming: appointmentsData.filter((item) => item.scheduledAt && new Date(item.scheduledAt) >= new Date() && !["cancelled", "completed"].includes(item.status)).length,
      completed: appointmentsData.filter((item) => item.status === "completed").length,
      cancelled: appointmentsData.filter((item) => item.status === "cancelled").length,
    },
  };
}

export async function createPatientAppointment(
  context: ResolvedPatientContext,
  payload: { doctorId: string; scheduledAt: string; appointmentType?: string; reason?: string; notes?: string },
) {
  const [created] = await db
    .insert(appointments)
    .values({
      tenantId: context.tenantId,
      patientId: context.patientId,
      doctorId: payload.doctorId,
      scheduledAt: new Date(payload.scheduledAt),
      status: "scheduled",
    })
    .returning({ id: appointments.id });

  if (created?.id) {
    await upsertAppointmentMetadata(
      context.tenantId,
      {
        appointmentId: created.id,
        appointmentType: payload.appointmentType || "Consultation",
        reason: payload.reason || null,
        notes: payload.notes || null,
        updatedAt: new Date().toISOString(),
      },
      context.userId,
    );
  }

  return created;
}

export async function updatePatientAppointment(
  context: ResolvedPatientContext,
  appointmentId: string,
  payload: Partial<{ doctorId: string; scheduledAt: string; appointmentType: string; reason: string; notes: string; status: string }>,
) {
  const existing = await db.query.appointments.findFirst({
    where: and(eq(appointments.id, appointmentId), eq(appointments.tenantId, context.tenantId), eq(appointments.patientId, context.patientId)),
  });
  if (!existing) {
    throw new Error("Appointment not found");
  }

  await db
    .update(appointments)
    .set({
      doctorId: payload.doctorId ?? existing.doctorId,
      scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : existing.scheduledAt,
      status: payload.status ?? existing.status,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId));

  await upsertAppointmentMetadata(
    context.tenantId,
    {
      appointmentId,
      appointmentType: payload.appointmentType ?? undefined,
      reason: payload.reason ?? undefined,
      notes: payload.notes ?? undefined,
      updatedAt: new Date().toISOString(),
    },
    context.userId,
  );
}

export async function getPatientPrescriptionsData(context: ResolvedPatientContext) {
  const rows = await db.query.prescriptions.findMany({
    where: and(eq(prescriptions.tenantId, context.tenantId), eq(prescriptions.patientId, context.patientId)),
    orderBy: [desc(prescriptions.prescribedAt), desc(prescriptions.createdAt)],
  });
  const prescriptionIds = rows.map((item) => item.id);
  const [items, admins, refillRequests] = await Promise.all([
    prescriptionIds.length ? db.query.prescriptionItems.findMany({ where: inArray(prescriptionItems.prescriptionId, prescriptionIds) }) : [],
    prescriptionIds.length
      ? db.query.medicationAdministrations.findMany({
          where: and(eq(medicationAdministrations.tenantId, context.tenantId), inArray(medicationAdministrations.prescriptionId, prescriptionIds)),
          orderBy: [desc(medicationAdministrations.scheduledAt)],
        })
      : [],
    getTenantSettingValue<StoredRefillRequest[]>(context.tenantId, PATIENT_REFILLS_KEY, []),
  ]);

  const itemMap = new Map<string, typeof items>(prescriptionIds.map((id) => [id, items.filter((item) => item.prescriptionId === id)]));
  const adminMap = new Map<string, typeof admins>(prescriptionIds.map((id) => [id, admins.filter((item) => item.prescriptionId === id)]));

  return {
    prescriptions: rows.map((item) => ({
      id: item.id,
      medication: item.medication,
      genericName: item.genericName,
      strength: item.strength,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
      status: item.status || "active",
      diagnosis: item.diagnosis,
      prescribedBy: item.prescribedBy,
      prescribedAt: toIso(item.prescribedAt || item.createdAt),
      filledAt: toIso(item.filledAt),
      validUntil: toIso(item.validUntil || item.expiresAt),
      refillsRemaining: item.refillsRemaining ?? item.refills ?? 0,
      pharmacy: item.pharmacy,
      notes: item.notes,
      items: (itemMap.get(item.id) || []).map((entry) => ({
        id: entry.id,
        name: entry.drugName,
        genericName: entry.genericName,
        strength: entry.strength,
        dosage: entry.dosage,
        frequency: entry.frequency,
        duration: entry.duration,
        quantity: entry.quantity,
        route: entry.route,
      })),
      administrations: (adminMap.get(item.id) || []).slice(0, 6).map((entry) => ({
        id: entry.id,
        status: entry.status,
        scheduledAt: toIso(entry.scheduledAt),
        administeredAt: toIso(entry.administeredAt),
        notes: entry.notes,
      })),
      refillRequest: refillRequests.find((request) => request.patientId === context.patientId && request.prescriptionId === item.id) || null,
    })),
    refillRequests: refillRequests.filter((item) => item.patientId === context.patientId).sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
  };
}

export async function requestPatientPrescriptionRefill(context: ResolvedPatientContext, prescriptionId: string) {
  const prescription = await db.query.prescriptions.findFirst({
    where: and(eq(prescriptions.tenantId, context.tenantId), eq(prescriptions.patientId, context.patientId), eq(prescriptions.id, prescriptionId)),
  });
  if (!prescription) throw new Error("Prescription not found");

  const requests = await getTenantSettingValue<StoredRefillRequest[]>(context.tenantId, PATIENT_REFILLS_KEY, []);
  const existing = requests.find((item) => item.patientId === context.patientId && item.prescriptionId === prescriptionId && ["pending", "approved", "ready"].includes(item.status));
  if (existing) return existing;

  const next: StoredRefillRequest = {
    id: crypto.randomUUID(),
    patientId: context.patientId,
    prescriptionId,
    requestedAt: new Date().toISOString(),
    status: "pending",
    notes: null,
  };
  await setTenantSettingValue(context.tenantId, PATIENT_REFILLS_KEY, [next, ...requests], context.userId);
  return next;
}

export async function getPatientLabResultsData(context: ResolvedPatientContext) {
  const orders = await db.query.labOrders.findMany({
    where: and(eq(labOrders.tenantId, context.tenantId), eq(labOrders.patientId, context.patientId)),
    orderBy: [desc(labOrders.orderedAt), desc(labOrders.createdAt)],
  });
  const orderIds = orders.map((order) => order.id);
  const results: Array<typeof labResults.$inferSelect> = orderIds.length ? await db.query.labResults.findMany({ where: inArray(labResults.labOrderId, orderIds), orderBy: [desc(labResults.createdAt)] }) : [];
  const resultMap = new Map(results.map((result) => [result.labOrderId, result]));
  const providerIds = Array.from(new Set(orders.map((order) => order.doctorId || order.orderedBy).filter(Boolean))) as string[];
  const providers = providerIds.length ? await db.query.users.findMany({ where: inArray(users.id, providerIds) }) : [];
  const providerMap = new Map(providers.map((provider) => [provider.id, provider.fullName || provider.email]));
  const billing = await getPatientPaymentStatus(context.tenantId, context.patientId);

  const items = orders.map((order) => {
    const result = resultMap.get(order.id);
    return {
      id: result?.id || order.id,
      orderId: order.id,
      testName: order.testName || order.testCode || "Lab result",
      testCode: order.testCode,
      category: order.category || "general",
      status: result ? "completed" : order.status || "pending",
      orderedAt: toIso(order.orderedAt || order.createdAt),
      completedAt: toIso(order.completedAt || result?.createdAt),
      provider: providerMap.get(order.doctorId || order.orderedBy || "") || "Lab team",
      notes: order.notes,
      resultData: result?.resultData || order.results || null,
      fileUrl: result?.fileUrl || null,
      patientPortalEligible: billing.hasPaymentClearance,
    };
  });

  const categories = [
    { id: "all", name: "All Results", count: items.length },
    ...Array.from(new Set(items.map((item) => item.category || "general"))).map((category) => ({
      id: category,
      name: category,
      count: items.filter((item) => item.category === category).length,
    })),
  ];

  return {
    results: items,
    categories,
    summary: {
      total: items.length,
      payable: items.filter((item) => !item.patientPortalEligible).length,
      ready: items.filter((item) => item.patientPortalEligible && item.resultData).length,
    },
    currency: context.currency,
  };
}

export async function getPatientLabResultById(context: ResolvedPatientContext, resultId: string) {
  const data = await getPatientLabResultsData(context);
  return data.results.find((item) => item.id === resultId || item.orderId === resultId) || null;
}

export async function getPatientBillingData(context: ResolvedPatientContext) {
  const [invoiceRows, policyRows] = await Promise.all([
    db.query.invoices.findMany({ where: and(eq(invoices.tenantId, context.tenantId), eq(invoices.patientId, context.patientId)), orderBy: [desc(invoices.createdAt)] }),
    db.query.insurancePolicies.findMany({ where: and(eq(insurancePolicies.tenantId, context.tenantId), eq(insurancePolicies.patientId, context.patientId)) }),
  ]);
  const invoiceIds = invoiceRows.map((item) => item.id);
  const [paymentRows, claimRows] = await Promise.all([
    invoiceIds.length ? db.query.payments.findMany({ where: inArray(payments.invoiceId, invoiceIds), orderBy: [desc(payments.createdAt)] }) : [],
    invoiceIds.length ? db.query.claims.findMany({ where: and(eq(claims.tenantId, context.tenantId), inArray(claims.invoiceId, invoiceIds)), orderBy: [desc(claims.createdAt)] }) : [],
  ]);
  const methods = await getAvailablePaymentMethods(context.tenantSlug);

  return {
    invoices: invoiceRows.map((item) => ({
      id: item.id,
      invoiceNumber: item.invoiceNumber || item.id.slice(0, 8),
      description: item.description || "Patient invoice",
      status: item.status || "pending",
      amount: toMoneyNumber(item.totalAmount ?? item.amount),
      amountDue: toMoneyNumber(item.amountDue ?? item.totalAmount ?? item.amount),
      dueDate: toIso(item.dueDate),
      createdAt: toIso(item.createdAt),
      notes: item.notes,
      items: Array.isArray(item.items) ? item.items : [],
      payments: paymentRows.filter((payment) => payment.invoiceId === item.id).map((payment) => ({
        id: payment.id,
        method: payment.method,
        amount: toMoneyNumber(payment.amount),
        status: payment.status,
        transactionId: payment.transactionId,
        processedAt: toIso(payment.processedAt || payment.createdAt),
      })),
      claims: claimRows.filter((claim) => claim.invoiceId === item.id).map((claim) => ({
        id: claim.id,
        status: claim.status,
        claimAmount: toMoneyNumber(claim.claimAmount),
        approvedAmount: toMoneyNumber(claim.approvedAmount),
        submittedAt: toIso(claim.submittedAt),
        denialReason: claim.denialReason,
      })),
    })),
    paymentMethods: methods,
    policies: policyRows.map((item) => ({
      id: item.id,
      provider: item.provider,
      policyNumber: item.policyNumber,
    })),
    summary: {
      totalOutstanding: invoiceRows.reduce((sum, item) => sum + toMoneyNumber(item.amountDue ?? item.totalAmount ?? item.amount), 0),
      paidInvoices: invoiceRows.filter((item) => ["paid", "completed"].includes(String(item.status || "").toLowerCase())).length,
      openInvoices: invoiceRows.filter((item) => !["paid", "completed"].includes(String(item.status || "").toLowerCase())).length,
    },
    currency: context.currency,
  };
}

export async function submitPatientPayment(
  context: ResolvedPatientContext,
  payload: { invoiceId: string; amount: number; method: string; policyId?: string | null; notes?: string | null },
) {
  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.tenantId, context.tenantId), eq(invoices.patientId, context.patientId), eq(invoices.id, payload.invoiceId)),
  });
  if (!invoice) throw new Error("Invoice not found");
  const method = String(payload.method || "").toLowerCase();
  const normalizedMethod = method === "card" ? "credit_card" : method;
  const valid = await validatePaymentMethod(context.tenantSlug, normalizedMethod);
  if (!valid) throw new Error("Payment method is not enabled for this hospital");

  const amount = toMoneyNumber(payload.amount);
  if (amount <= 0) throw new Error("Payment amount must be greater than zero");

  const completedMethods = new Set(["credit_card", "bank_transfer"]);
  const status = completedMethods.has(normalizedMethod) ? "completed" : "pending";

  const [payment] = await db
    .insert(payments)
    .values({
      tenantId: context.tenantId,
      invoiceId: invoice.id,
      method: normalizedMethod,
      amount: formatMoneyValue(amount),
      status,
      transactionId: `PT-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      notes: payload.notes || null,
      createdBy: context.userId,
      processedAt: status === "completed" ? new Date() : null,
    })
    .returning();

  if (normalizedMethod === "insurance" && payload.policyId) {
    await db.insert(claims).values({
      tenantId: context.tenantId,
      invoiceId: invoice.id,
      policyId: payload.policyId,
      status: "submitted",
      claimAmount: formatMoneyValue(amount),
      approvedAmount: "0",
      notes: payload.notes || null,
    });
  }

  if (status === "completed") {
    const currentDue = toMoneyNumber(invoice.amountDue ?? invoice.totalAmount ?? invoice.amount);
    const nextDue = Math.max(0, currentDue - amount);
    await db
      .update(invoices)
      .set({
        amountDue: formatMoneyValue(nextDue),
        status: nextDue <= 0 ? "paid" : "partial",
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoice.id));
  }

  return payment;
}
