import { and, desc, eq, ilike, inArray, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEligiblePatientRowsForTenant } from "@/lib/patient-access";
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
  tenantSettings,
  tenants,
  userRoles,
  users,
  visits,
  vitals,
} from "@/lib/db/schema";

type GuardianContext = {
  userId: string;
  email: string;
  fullName: string | null;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  guardianId: string;
  hasPatientRole: boolean;
  currency: string;
};

export type GuardianPortalContextResult =
  | { ok: true; context: GuardianContext }
  | { ok: false; status: number; error: string };

type GuardianAppointmentMetadata = {
  appointmentId: string;
  appointmentType?: string | null;
  reason?: string | null;
  notes?: string | null;
  updatedAt: string;
};

type GuardianVaccinationRecord = {
  id: string;
  tenantId: string;
  patientId: string;
  vaccineName: string;
  vaccineType: string;
  scheduledDate: string;
  administeredDate?: string | null;
  status: "scheduled" | "completed" | "overdue" | "upcoming";
  administeredBy?: string | null;
  batchNumber?: string | null;
  location?: string | null;
  nextDueDate?: string | null;
  notes?: string | null;
  sideEffects?: string[];
};

type GuardianAlertSettings = {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  appointmentReminders: boolean;
  vaccinationReminders: boolean;
  medicationReminders: boolean;
  healthCheckReminders: boolean;
  reminderAdvanceTime: number;
};

type GuardianAcknowledgement = {
  id: string;
  status: "acknowledged" | "resolved";
  updatedAt: string;
};

const APPOINTMENT_METADATA_KEY = "guardian_appointment_metadata";
const ALERT_SETTINGS_KEY = "guardian_alert_settings";
const ALERT_ACKS_KEY = "guardian_alert_acknowledgements";
const VACCINATION_RECORDS_KEY = "guardian_vaccination_records";

const DEFAULT_ALERT_SETTINGS: GuardianAlertSettings = {
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  appointmentReminders: true,
  vaccinationReminders: true,
  medicationReminders: true,
  healthCheckReminders: true,
  reminderAdvanceTime: 60,
};

const DEFAULT_VACCINE_SCHEDULE = [
  { vaccineName: "BCG", vaccineType: "Routine", recommendedAges: ["Birth"], description: "Tuberculosis protection", required: true },
  { vaccineName: "OPV", vaccineType: "Routine", recommendedAges: ["Birth", "6 weeks", "10 weeks", "14 weeks"], description: "Polio protection", required: true },
  { vaccineName: "DTP-HepB-Hib", vaccineType: "Routine", recommendedAges: ["6 weeks", "10 weeks", "14 weeks"], description: "Combined infant protection", required: true },
  { vaccineName: "PCV", vaccineType: "Routine", recommendedAges: ["6 weeks", "10 weeks", "14 weeks"], description: "Pneumococcal protection", required: true },
  { vaccineName: "Measles-Rubella", vaccineType: "Routine", recommendedAges: ["9 months", "15 months"], description: "Measles and rubella protection", required: true },
];

function toMoneyNumber(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIso(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toPatientName(patient: { fullName?: string | null; firstName?: string | null; lastName?: string | null }) {
  if (patient.fullName?.trim()) return patient.fullName.trim();
  return `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Patient";
}

function calculateAge(dob?: Date | string | null) {
  if (!dob) return 0;
  const birthDate = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return Math.max(0, age);
}

function healthStatusFromVitals(vital?: { temperature?: string | null; oxygenSaturation?: string | null; heartRate?: string | null } | null) {
  if (!vital) return "good" as const;
  const temp = Number.parseFloat(String(vital.temperature ?? ""));
  const oxygen = Number.parseFloat(String(vital.oxygenSaturation ?? ""));
  const hr = Number.parseFloat(String(vital.heartRate ?? ""));
  if ((Number.isFinite(temp) && temp >= 39) || (Number.isFinite(oxygen) && oxygen < 90)) return "poor" as const;
  if ((Number.isFinite(temp) && temp >= 38) || (Number.isFinite(hr) && hr > 120)) return "fair" as const;
  if ((Number.isFinite(temp) && temp >= 37.5) || (Number.isFinite(oxygen) && oxygen < 95)) return "good" as const;
  return "excellent" as const;
}

async function getTenantSettingValue<T>(tenantId: string, key: string, fallback: T): Promise<T> {
  const record = await db.query.tenantSettings.findFirst({ where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)) });
  return (record?.value as T | undefined) ?? fallback;
}

async function setTenantSettingValue(tenantId: string, key: string, value: unknown, updatedBy?: string | null) {
  const existing = await db.query.tenantSettings.findFirst({ where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)), columns: { id: true } });
  if (existing?.id) {
    await db.update(tenantSettings).set({ value, updatedAt: new Date(), updatedBy: updatedBy || null }).where(eq(tenantSettings.id, existing.id));
    return;
  }
  await db.insert(tenantSettings).values({ tenantId, key, value, updatedBy: updatedBy || null });
}

async function getTenantCurrency(tenantId: string) {
  const billing = await getTenantSettingValue<any>(tenantId, "billing", {});
  const preferences = await getTenantSettingValue<any>(tenantId, "preferences", {});
  return String(billing?.currency || preferences?.currency || "USD");
}

async function getGuardianChildrenRows(context: GuardianContext) {
  return db.select({ relationId: guardianPatients.id, patientId: guardianPatients.patientId, canViewRecords: guardianPatients.canViewRecords, canSchedule: guardianPatients.canSchedule, emergencyContact: guardianPatients.emergencyContact, patient: patients }).from(guardianPatients).innerJoin(patients, eq(guardianPatients.patientId, patients.id)).where(eq(guardianPatients.guardianId, context.guardianId));
}

async function getAppointmentMetadataMap(tenantId: string) {
  const list = await getTenantSettingValue<GuardianAppointmentMetadata[]>(tenantId, APPOINTMENT_METADATA_KEY, []);
  return new Map(list.map((item) => [item.appointmentId, item]));
}

async function upsertAppointmentMetadata(tenantId: string, metadata: GuardianAppointmentMetadata, updatedBy?: string | null) {
  const list = await getTenantSettingValue<GuardianAppointmentMetadata[]>(tenantId, APPOINTMENT_METADATA_KEY, []);
  const next = [metadata, ...list.filter((item) => item.appointmentId !== metadata.appointmentId)].slice(0, 5000);
  await setTenantSettingValue(tenantId, APPOINTMENT_METADATA_KEY, next, updatedBy);
}

async function getVaccinationRecords(tenantId: string) {
  return getTenantSettingValue<GuardianVaccinationRecord[]>(tenantId, VACCINATION_RECORDS_KEY, []);
}

async function getGuardianAlertAcks(tenantId: string) {
  const acks = await getTenantSettingValue<GuardianAcknowledgement[]>(tenantId, ALERT_ACKS_KEY, []);
  return new Map(acks.map((item) => [item.id, item]));
}

async function ensureGuardianRecord(userId: string, tenantId: string) {
  const scopedGuardian = await db.query.guardians.findFirst({
    where: and(eq(guardians.userId, userId), eq(guardians.tenantId, tenantId)),
  });
  if (scopedGuardian?.id) return scopedGuardian;

  const unscopedGuardian = await db.query.guardians.findFirst({
    where: eq(guardians.userId, userId),
    orderBy: [desc(guardians.createdAt)],
  });
  if (unscopedGuardian?.id) {
    if (!unscopedGuardian.tenantId) {
      await db
        .update(guardians)
        .set({ tenantId, updatedAt: new Date() })
        .where(eq(guardians.id, unscopedGuardian.id));
    }
    return { ...unscopedGuardian, tenantId };
  }

  const [createdGuardian] = await db
    .insert(guardians)
    .values({
      tenantId,
      userId,
      relationship: "guardian",
    })
    .returning();

  return createdGuardian ?? null;
}

export async function resolveGuardianPortalContext(headers: Headers, rawSlug?: string | null): Promise<GuardianPortalContextResult> {
  const session = await auth.api.getSession({ headers }).catch(() => null as any);
  if (!session?.user?.email) return { ok: false, status: 401, error: "Unauthorized" };
  const rows = await db.select({ id: users.id, tenantId: users.tenantId, email: users.email, fullName: users.fullName, baseRole: users.role, linkedRole: roles.name, tenantSlug: tenants.slug, tenantName: tenants.name }).from(users).leftJoin(userRoles, eq(userRoles.userId, users.id)).leftJoin(roles, eq(roles.id, userRoles.roleId)).leftJoin(tenants, eq(tenants.id, users.tenantId)).where(and(ilike(users.email, session.user.email), isNull(users.deletedAt), eq(users.isActive, true)));
  const base = rows[0];
  if (!base?.tenantId || !base.tenantSlug) return { ok: false, status: 403, error: "Guardian access required" };
  if (rawSlug && rawSlug !== base.tenantSlug) return { ok: false, status: 403, error: "Invalid tenant scope" };
  const roleNames = new Set(rows.flatMap((item) => [String(item.baseRole || "").toLowerCase(), String(item.linkedRole || "").toLowerCase()]).filter(Boolean));
  if (!roleNames.has("guardian")) return { ok: false, status: 403, error: "Guardian access required" };
  const guardian = await ensureGuardianRecord(base.id, base.tenantId);
  if (!guardian?.id) return { ok: false, status: 404, error: "Guardian record not found" };
  return { ok: true, context: { userId: base.id, email: base.email, fullName: base.fullName ?? null, tenantId: base.tenantId, tenantSlug: base.tenantSlug, tenantName: base.tenantName || "Hospital", guardianId: guardian.id, hasPatientRole: roleNames.has("patient"), currency: await getTenantCurrency(base.tenantId) } };
}

async function getChildLatestData(tenantId: string, patientId: string) {
  const [allergies, conditions, policies, latestVisit, upcomingAppointment, patientInvoices] = await Promise.all([
    db.query.patientAllergies.findMany({ where: eq(patientAllergies.patientId, patientId) }),
    db.query.patientConditions.findMany({ where: eq(patientConditions.patientId, patientId) }),
    db.query.insurancePolicies.findMany({ where: and(eq(insurancePolicies.tenantId, tenantId), eq(insurancePolicies.patientId, patientId)) }),
    db.query.visits.findFirst({ where: and(eq(visits.tenantId, tenantId), eq(visits.patientId, patientId)), orderBy: [desc(visits.createdAt)] }),
    db.query.appointments.findFirst({ where: and(eq(appointments.tenantId, tenantId), eq(appointments.patientId, patientId)), orderBy: [desc(appointments.scheduledAt)] }),
    db.query.invoices.findMany({ where: and(eq(invoices.tenantId, tenantId), eq(invoices.patientId, patientId)), orderBy: [desc(invoices.createdAt)] }),
  ]);
  const latestVitals = latestVisit?.id ? await db.query.vitals.findFirst({ where: eq(vitals.visitId, latestVisit.id), orderBy: [desc(vitals.createdAt)] }) : null;
  return { allergies, conditions, policies, latestVisit, latestVitals, upcomingAppointment, outstandingAmount: patientInvoices.reduce((sum, item) => sum + toMoneyNumber(item.amountDue ?? item.totalAmount ?? item.amount), 0) };
}
export async function getGuardianDashboardData(context: GuardianContext) {
  const children = await getGuardianChildrenRows(context);
  const childIds = children.map((item) => item.patientId);
  const snapshots = await Promise.all(children.map(async (row) => ({ row, detail: await getChildLatestData(context.tenantId, row.patientId) })));
  const appointmentRows = childIds.length ? await db.query.appointments.findMany({ where: and(eq(appointments.tenantId, context.tenantId), inArray(appointments.patientId, childIds)), orderBy: [desc(appointments.scheduledAt)] }) : [];
  const notificationRows = await db.query.notifications.findMany({ where: and(eq(notifications.tenantId, context.tenantId), eq(notifications.userId, context.userId)), orderBy: [desc(notifications.createdAt)], limit: 10 });
  const recentVisits = childIds.length ? await db.query.visits.findMany({ where: and(eq(visits.tenantId, context.tenantId), inArray(visits.patientId, childIds)), orderBy: [desc(visits.createdAt)], limit: 12 }) : [];
  const prescriptionRows = childIds.length ? await db.query.prescriptions.findMany({ where: and(eq(prescriptions.tenantId, context.tenantId), inArray(prescriptions.patientId, childIds)), orderBy: [desc(prescriptions.createdAt)], limit: 12 }) : [];
  const labOrderRows = childIds.length ? await db.query.labOrders.findMany({ where: and(eq(labOrders.tenantId, context.tenantId), inArray(labOrders.patientId, childIds)), orderBy: [desc(labOrders.createdAt)], limit: 12 }) : [];
  const recentActivities = [...recentVisits.map((item) => ({ id: `visit-${item.id}`, type: "visit", patientId: item.patientId, title: item.reason || "Clinical visit", description: item.notes || "Visit recorded", timestamp: toIso(item.createdAt) })), ...prescriptionRows.map((item) => ({ id: `rx-${item.id}`, type: "prescription", patientId: item.patientId, title: item.medication || "Prescription", description: item.instructions || item.notes || "Medication updated", timestamp: toIso(item.prescribedAt || item.createdAt) })), ...labOrderRows.map((item) => ({ id: `lab-${item.id}`, type: "lab", patientId: item.patientId, title: item.testName || item.testCode || "Lab order", description: item.status || "Lab progress updated", timestamp: toIso(item.completedAt || item.orderedAt || item.createdAt) }))].sort((a, b) => new Date(String(b.timestamp || 0)).getTime() - new Date(String(a.timestamp || 0)).getTime()).slice(0, 10);
  const patientNameMap = new Map(children.map((item) => [item.patientId, toPatientName(item.patient)]));
  const now = new Date();
  const upcomingAppointments = appointmentRows.filter((item) => item.scheduledAt && item.scheduledAt >= now && !["cancelled", "completed"].includes(String(item.status || "").toLowerCase())).slice(0, 8).map((item) => ({ id: item.id, childId: item.patientId || "", childName: patientNameMap.get(item.patientId || "") || "Child", scheduledAt: toIso(item.scheduledAt), status: item.status || "scheduled", doctorId: item.doctorId || null }));
  return {
    metrics: {
      totalChildren: children.length,
      activeChildren: snapshots.filter((item) => item.detail.latestVisit || item.detail.upcomingAppointment).length,
      upcomingAppointments: upcomingAppointments.length,
      completedAppointments: appointmentRows.filter((item) => String(item.status || "").toLowerCase() === "completed").length,
      pendingVaccinations: 0,
      completedVaccinations: 0,
      unreadAlerts: notificationRows.filter((item) => !item.read).length,
      healthRecordsCount: recentVisits.length + prescriptionRows.length + labOrderRows.length,
      averageHealthScore: snapshots.length ? Math.round(snapshots.reduce((sum, item) => sum + ({ excellent: 95, good: 85, fair: 70, poor: 45 }[healthStatusFromVitals(item.detail.latestVitals)]), 0) / snapshots.length) : 0,
      recentActivityCount: recentActivities.length,
    },
    children: snapshots.map(({ row, detail }) => ({ id: row.patientId, name: toPatientName(row.patient), age: calculateAge(row.patient.dob), gender: row.patient.gender || "Unknown", lastVisit: toIso(detail.latestVisit?.createdAt), nextAppointment: toIso(detail.upcomingAppointment?.scheduledAt), healthStatus: healthStatusFromVitals(detail.latestVitals), vaccinationStatus: "up-to-date", outstandingAmount: detail.outstandingAmount })),
    upcomingAppointments,
    recentActivities: recentActivities.map((item) => ({ ...item, childName: patientNameMap.get(item.patientId || "") || "Child" })),
    alerts: notificationRows.slice(0, 6).map((item) => ({ id: item.id, type: item.type || "info", title: item.title || "Notification", message: item.message || "", childName: typeof item.metadata === "object" && item.metadata && "childName" in (item.metadata as any) ? String((item.metadata as any).childName) : undefined, read: !!item.read, createdAt: toIso(item.createdAt) })),
    hasPatientRole: context.hasPatientRole,
    currency: context.currency,
  };
}

export async function getGuardianChildrenData(context: GuardianContext) {
  const rows = await getGuardianChildrenRows(context);
  const data = await Promise.all(rows.map(async (row) => {
    const detail = await getChildLatestData(context.tenantId, row.patientId);
    return {
      id: row.patientId,
      firstName: row.patient.firstName || row.patient.fullName?.split(" ")[0] || "Child",
      lastName: row.patient.lastName || row.patient.fullName?.split(" ").slice(1).join(" ") || "",
      fullName: toPatientName(row.patient),
      dob: toIso(row.patient.dob),
      gender: row.patient.gender || "Unknown",
      phone: row.patient.phone || "",
      email: row.patient.email || "",
      address: row.patient.address || "",
      bloodType: null,
      allergies: detail.allergies.map((item) => item.allergy),
      conditions: detail.conditions.map((item) => item.condition),
      emergencyContact: { name: context.fullName || "Guardian", relationship: "Guardian", phone: row.patient.phone || "" },
      insurance: detail.policies[0] ? { provider: detail.policies[0].provider, policyNumber: detail.policies[0].policyNumber } : null,
      avatar: null,
      lastVisit: toIso(detail.latestVisit?.createdAt),
      nextAppointment: toIso(detail.upcomingAppointment?.scheduledAt),
      healthStatus: healthStatusFromVitals(detail.latestVitals),
      vaccinationStatus: "up-to-date",
      permissions: { canViewRecords: row.canViewRecords ?? true, canSchedule: row.canSchedule ?? true, emergencyContact: row.emergencyContact ?? false },
    };
  }));
  const stats = { totalChildren: data.length, activeChildren: data.filter((item) => item.lastVisit || item.nextAppointment).length, childrenWithAppointments: data.filter((item) => item.nextAppointment).length, childrenNeedingVaccinations: data.filter((item) => item.vaccinationStatus !== "up-to-date").length };
  return { children: data, stats, hasPatientRole: context.hasPatientRole };
}

export async function searchGuardianLinkablePatients(context: GuardianContext, query: string) {
  const normalized = query.trim();
  if (!normalized) return { patients: [] };
  const linkedRows = await getGuardianChildrenRows(context);
  const linkedIds = new Set(linkedRows.map((item) => item.patientId));
  const rows = await getEligiblePatientRowsForTenant(context.tenantId);
  const lowered = normalized.toLowerCase();
  const matches = rows
    .filter((item) => !linkedIds.has(item.id))
    .filter((item) => !item.deletedAt)
    .filter((item) => !item.status || String(item.status).toLowerCase() === "active")
    .filter((item) =>
      [item.fullName, item.firstName, item.lastName, item.mrn, item.phone, item.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(lowered)),
    )
    .slice(0, 12)
    .map((item) => ({
      id: item.id,
      fullName: toPatientName(item),
      mrn: item.mrn || "",
      phone: item.phone || "",
      email: item.email || "",
      dob: toIso(item.dob),
      gender: item.gender || "Unknown",
    }));
  return { patients: matches };
}

export async function linkGuardianChild(
  context: GuardianContext,
  payload: { patientId: string; canViewRecords?: boolean; canSchedule?: boolean; emergencyContact?: boolean },
) {
  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.id, payload.patientId), eq(patients.tenantId, context.tenantId)),
  });
  if (!patient?.id) throw new Error("Patient not found");

  const existing = await db.query.guardianPatients.findFirst({
    where: and(eq(guardianPatients.guardianId, context.guardianId), eq(guardianPatients.patientId, payload.patientId)),
  });

  if (existing?.id) {
    await db
      .update(guardianPatients)
      .set({
        canViewRecords: payload.canViewRecords ?? existing.canViewRecords ?? true,
        canSchedule: payload.canSchedule ?? existing.canSchedule ?? true,
        emergencyContact: payload.emergencyContact ?? existing.emergencyContact ?? false,
      })
      .where(eq(guardianPatients.id, existing.id));
    return { id: existing.id, patientId: payload.patientId, linked: true, updated: true };
  }

  const [created] = await db
    .insert(guardianPatients)
    .values({
      guardianId: context.guardianId,
      patientId: payload.patientId,
      canViewRecords: payload.canViewRecords ?? true,
      canSchedule: payload.canSchedule ?? true,
      emergencyContact: payload.emergencyContact ?? false,
    })
    .returning({ id: guardianPatients.id, patientId: guardianPatients.patientId });

  return { ...created, linked: true, updated: false };
}

export async function getGuardianChildProfile(context: GuardianContext, childId: string) {
  const rows = await getGuardianChildrenRows(context);
  const row = rows.find((item) => item.patientId === childId);
  if (!row) return null;
  const [detail, appointmentsData, prescriptionRows, labData] = await Promise.all([
    getChildLatestData(context.tenantId, childId),
    db.query.appointments.findMany({ where: and(eq(appointments.tenantId, context.tenantId), eq(appointments.patientId, childId)), orderBy: [desc(appointments.scheduledAt)], limit: 10 }),
    db.query.prescriptions.findMany({ where: and(eq(prescriptions.tenantId, context.tenantId), eq(prescriptions.patientId, childId)), orderBy: [desc(prescriptions.createdAt)], limit: 10 }),
    db.query.labOrders.findMany({ where: and(eq(labOrders.tenantId, context.tenantId), eq(labOrders.patientId, childId)), orderBy: [desc(labOrders.createdAt)], limit: 10 }),
  ]);
  return {
    child: { id: row.patientId, fullName: toPatientName(row.patient), firstName: row.patient.firstName || "", lastName: row.patient.lastName || "", dob: toIso(row.patient.dob), age: calculateAge(row.patient.dob), gender: row.patient.gender || "Unknown", email: row.patient.email || "", phone: row.patient.phone || "", address: row.patient.address || "", allergies: detail.allergies.map((item) => item.allergy), conditions: detail.conditions.map((item) => item.condition), healthStatus: healthStatusFromVitals(detail.latestVitals), outstandingAmount: detail.outstandingAmount },
    permissions: { canViewRecords: row.canViewRecords ?? true, canSchedule: row.canSchedule ?? true, emergencyContact: row.emergencyContact ?? false },
    latestVisit: detail.latestVisit ? { id: detail.latestVisit.id, reason: detail.latestVisit.reason, notes: detail.latestVisit.notes, createdAt: toIso(detail.latestVisit.createdAt) } : null,
    latestVitals: detail.latestVitals ? { ...detail.latestVitals, recordedAt: toIso(detail.latestVitals.createdAt) } : null,
    upcomingAppointments: appointmentsData.filter((item) => item.scheduledAt && item.scheduledAt >= new Date()).slice(0, 5).map((item) => ({ id: item.id, scheduledAt: toIso(item.scheduledAt), status: item.status || "scheduled" })),
    prescriptions: prescriptionRows.slice(0, 5).map((item) => ({ id: item.id, medication: item.medication, dosage: item.dosage, status: item.status, prescribedAt: toIso(item.prescribedAt || item.createdAt), prescribedBy: item.prescribedBy })),
    labOrders: labData.slice(0, 5).map((item) => ({ id: item.id, testName: item.testName, status: item.status, orderedAt: toIso(item.orderedAt || item.createdAt), completedAt: toIso(item.completedAt) })),
  };
}

export async function updateGuardianChildPermissions(
  context: GuardianContext,
  childId: string,
  payload: Partial<{ canViewRecords: boolean; canSchedule: boolean; emergencyContact: boolean }>,
) {
  const relation = await db.query.guardianPatients.findFirst({
    where: and(eq(guardianPatients.guardianId, context.guardianId), eq(guardianPatients.patientId, childId)),
  });
  if (!relation?.id) throw new Error("Child relationship not found");
  await db
    .update(guardianPatients)
    .set({
      canViewRecords: payload.canViewRecords ?? relation.canViewRecords ?? true,
      canSchedule: payload.canSchedule ?? relation.canSchedule ?? true,
      emergencyContact: payload.emergencyContact ?? relation.emergencyContact ?? false,
    })
    .where(eq(guardianPatients.id, relation.id));
  return { success: true };
}

export async function unlinkGuardianChild(context: GuardianContext, childId: string) {
  const relation = await db.query.guardianPatients.findFirst({
    where: and(eq(guardianPatients.guardianId, context.guardianId), eq(guardianPatients.patientId, childId)),
  });
  if (!relation?.id) throw new Error("Child relationship not found");
  await db.delete(guardianPatients).where(eq(guardianPatients.id, relation.id));
  return { success: true };
}

export async function getGuardianFamilyData(context: GuardianContext) {
  const children = await getGuardianChildrenRows(context);
  const childIds = children.map((item) => item.patientId);
  const [policyRows, invoiceRows, paymentRows] = await Promise.all([
    childIds.length ? db.query.insurancePolicies.findMany({ where: and(eq(insurancePolicies.tenantId, context.tenantId), inArray(insurancePolicies.patientId, childIds)) }) : [],
    childIds.length ? db.query.invoices.findMany({ where: and(eq(invoices.tenantId, context.tenantId), inArray(invoices.patientId, childIds)), orderBy: [desc(invoices.createdAt)] }) : [],
    childIds.length ? db.query.payments.findMany({ where: eq(payments.tenantId, context.tenantId), orderBy: [desc(payments.createdAt)], limit: 100 }) : [],
  ]);
  const familyMembers = await Promise.all(children.map(async (row) => {
    const detail = await getChildLatestData(context.tenantId, row.patientId);
    return { id: row.patientId, name: toPatientName(row.patient), age: calculateAge(row.patient.dob), relationship: row.emergencyContact ? "Emergency contact child" : "Child", healthStatus: healthStatusFromVitals(detail.latestVitals), insuranceProvider: detail.policies[0]?.provider || null, nextAppointment: toIso(detail.upcomingAppointment?.scheduledAt), outstandingAmount: detail.outstandingAmount };
  }));
  return {
    guardian: { fullName: context.fullName || context.email, email: context.email },
    familyMembers,
    coverage: { activePolicies: policyRows.length, providers: Array.from(new Set(policyRows.map((item) => item.provider).filter(Boolean))), outstandingAmount: invoiceRows.reduce((sum, item) => sum + toMoneyNumber(item.amountDue ?? item.totalAmount ?? item.amount), 0), recentPayments: paymentRows.slice(0, 10).map((item) => ({ id: item.id, amount: toMoneyNumber(item.amount), method: item.method, status: item.status, processedAt: toIso(item.processedAt || item.createdAt) })) },
    hasPatientRole: context.hasPatientRole,
    currency: context.currency,
  };
}
export async function getGuardianAppointmentOptions(context: GuardianContext) {
  const childRows = await getGuardianChildrenRows(context);
  const children = childRows.map((row) => ({ id: row.patientId, name: toPatientName(row.patient), age: calculateAge(row.patient.dob), canSchedule: row.canSchedule ?? true }));
  const userRows = await db.select({ id: users.id, fullName: users.fullName, email: users.email, baseRole: users.role, linkedRole: roles.name }).from(users).leftJoin(userRoles, eq(userRoles.userId, users.id)).leftJoin(roles, eq(roles.id, userRoles.roleId)).where(and(eq(users.tenantId, context.tenantId), eq(users.isActive, true), isNull(users.deletedAt)));
  const doctors = Array.from(new Map(userRows.filter((item) => String(item.baseRole || "").toLowerCase() === "doctor" || String(item.linkedRole || "").toLowerCase() === "doctor").map((item) => [item.id, { id: item.id, name: item.fullName || item.email, specialty: "General Practice" }])).values());
  const appointmentTypes = [
    { id: "consultation", name: "Consultation", duration: 30, description: "Standard doctor consultation" },
    { id: "follow_up", name: "Follow-up", duration: 20, description: "Review of previous treatment" },
    { id: "vaccination", name: "Vaccination", duration: 20, description: "Child immunization visit" },
    { id: "wellness", name: "Wellness Check", duration: 30, description: "Routine pediatric health review" },
  ];
  return { children, doctors, appointmentTypes };
}

export async function getGuardianDoctorSlots(context: GuardianContext, doctorId: string, date: string) {
  const selectedDate = new Date(`${date}T00:00:00`);
  const nextDate = new Date(selectedDate);
  nextDate.setDate(selectedDate.getDate() + 1);
  const rows = await db.query.appointments.findMany({ where: and(eq(appointments.tenantId, context.tenantId), eq(appointments.doctorId, doctorId)), orderBy: [desc(appointments.scheduledAt)] });
  const booked = new Set(rows.filter((item) => item.scheduledAt && item.scheduledAt >= selectedDate && item.scheduledAt < nextDate).map((item) => item.scheduledAt?.toTimeString().slice(0, 5)));
  const baseSlots = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
  return baseSlots.map((time) => ({ id: `${doctorId}-${date}-${time}`, time, available: !booked.has(time) }));
}

export async function getGuardianAppointmentsData(context: GuardianContext) {
  const metadataMap = await getAppointmentMetadataMap(context.tenantId);
  const children = await getGuardianChildrenRows(context);
  const childIds = children.map((item) => item.patientId);
  const childMap = new Map(children.map((item) => [item.patientId, item]));
  const rows = childIds.length ? await db.select({ appointment: appointments, patient: patients, doctor: users }).from(appointments).innerJoin(patients, eq(appointments.patientId, patients.id)).leftJoin(users, eq(appointments.doctorId, users.id)).where(and(eq(appointments.tenantId, context.tenantId), inArray(appointments.patientId, childIds))).orderBy(desc(appointments.scheduledAt), desc(appointments.createdAt)) : [];
  const list = rows.map((item) => {
    const metadata = metadataMap.get(item.appointment.id);
    return {
      id: item.appointment.id,
      childId: item.patient.id,
      childName: toPatientName(item.patient),
      doctorId: item.doctor?.id || item.appointment.doctorId || "",
      doctorName: item.doctor?.fullName || item.doctor?.email || "Care Team",
      specialty: "General Practice",
      date: item.appointment.scheduledAt?.toISOString().split("T")[0] || "",
      time: item.appointment.scheduledAt?.toTimeString().slice(0, 5) || "",
      duration: 30,
      type: metadata?.appointmentType || "Consultation",
      status: (item.appointment.status || "scheduled") as "scheduled" | "confirmed" | "completed" | "cancelled" | "no-show",
      location: "Main Clinic",
      notes: metadata?.notes || "",
      reason: metadata?.reason || item.appointment.status || "Appointment",
      createdAt: toIso(item.appointment.createdAt),
      updatedAt: toIso(item.appointment.updatedAt),
      canReschedule: (childMap.get(item.patient.id)?.canSchedule ?? true) && ["scheduled", "confirmed"].includes(String(item.appointment.status || "scheduled").toLowerCase()),
      canCancel: ["scheduled", "confirmed"].includes(String(item.appointment.status || "scheduled").toLowerCase()),
    };
  });
  return { appointments: list, stats: { total: list.length, upcoming: list.filter((item) => item.date && new Date(`${item.date}T${item.time || "00:00"}`) >= new Date() && !["cancelled", "completed"].includes(item.status)).length, completed: list.filter((item) => item.status === "completed").length, cancelled: list.filter((item) => item.status === "cancelled").length } };
}

export async function createGuardianAppointment(context: GuardianContext, payload: { childId: string; doctorId: string; appointmentTypeId?: string; date: string; timeSlot: string; reason: string; notes?: string }) {
  const relation = await db.query.guardianPatients.findFirst({ where: and(eq(guardianPatients.guardianId, context.guardianId), eq(guardianPatients.patientId, payload.childId)) });
  if (!relation?.canSchedule) throw new Error("Not authorized to schedule for this child");
  const [created] = await db.insert(appointments).values({ tenantId: context.tenantId, patientId: payload.childId, doctorId: payload.doctorId, scheduledAt: new Date(`${payload.date}T${payload.timeSlot}`), status: "scheduled" }).returning({ id: appointments.id });
  if (created?.id) {
    await upsertAppointmentMetadata(context.tenantId, { appointmentId: created.id, appointmentType: payload.appointmentTypeId || "Consultation", reason: payload.reason, notes: payload.notes || null, updatedAt: new Date().toISOString() }, context.userId);
  }
  return created;
}

export async function updateGuardianAppointment(context: GuardianContext, appointmentId: string, payload: Partial<{ doctorId: string; date: string; timeSlot: string; appointmentType: string; reason: string; notes: string; status: string }>) {
  const appointment = await db.query.appointments.findFirst({ where: and(eq(appointments.id, appointmentId), eq(appointments.tenantId, context.tenantId)) });
  if (!appointment?.patientId) throw new Error("Appointment not found");
  const relation = await db.query.guardianPatients.findFirst({ where: and(eq(guardianPatients.guardianId, context.guardianId), eq(guardianPatients.patientId, appointment.patientId)) });
  if (!relation?.canSchedule) throw new Error("Not authorized for this appointment");
  await db.update(appointments).set({ doctorId: payload.doctorId ?? appointment.doctorId, scheduledAt: payload.date && payload.timeSlot ? new Date(`${payload.date}T${payload.timeSlot}`) : appointment.scheduledAt, status: payload.status ?? appointment.status, updatedAt: new Date() }).where(eq(appointments.id, appointmentId));
  await upsertAppointmentMetadata(context.tenantId, { appointmentId, appointmentType: payload.appointmentType, reason: payload.reason, notes: payload.notes, updatedAt: new Date().toISOString() }, context.userId);
}

export async function getGuardianRecordsData(context: GuardianContext) {
  const children = await getGuardianChildrenRows(context);
  const childIds = children.map((item) => item.patientId);
  const childMap = new Map(children.map((item) => [item.patientId, toPatientName(item.patient)]));
  const [visitRows, diagnosisRows, prescriptionRows, labOrderRows] = await Promise.all([
    childIds.length ? db.query.visits.findMany({ where: and(eq(visits.tenantId, context.tenantId), inArray(visits.patientId, childIds)), orderBy: [desc(visits.createdAt)], limit: 100 }) : [],
    db.query.diagnoses.findMany({ orderBy: [desc(diagnoses.createdAt)], limit: 200 }),
    childIds.length ? db.query.prescriptions.findMany({ where: and(eq(prescriptions.tenantId, context.tenantId), inArray(prescriptions.patientId, childIds)), orderBy: [desc(prescriptions.createdAt)], limit: 100 }) : [],
    childIds.length ? db.query.labOrders.findMany({ where: and(eq(labOrders.tenantId, context.tenantId), inArray(labOrders.patientId, childIds)), orderBy: [desc(labOrders.createdAt)], limit: 100 }) : [],
  ]);
  const vitalsRows = visitRows.length ? await db.query.vitals.findMany({ where: inArray(vitals.visitId, visitRows.map((item) => item.id)), orderBy: [desc(vitals.createdAt)] }) : [];
  const vitalsMap = new Map(vitalsRows.map((item) => [item.visitId || item.id, item]));
  const diagnosisMap = new Map<string, string[]>();
  diagnosisRows.forEach((item) => {
    if (!item.visitId) return;
    diagnosisMap.set(item.visitId, [...(diagnosisMap.get(item.visitId) || []), item.description || item.code || "Diagnosis"]);
  });
  const records = [...visitRows.map((item) => ({ id: `visit-${item.id}`, childId: item.patientId || "", childName: childMap.get(item.patientId || "") || "Child", type: "visit", title: item.reason || "Clinical visit", description: item.notes || "Visit record", date: toIso(item.createdAt), doctor: item.doctorId || null, facility: "Hospital", attachments: [], details: { diagnosis: diagnosisMap.get(item.id) || [], vitals: vitalsMap.get(item.id) ? { temperature: vitalsMap.get(item.id)?.temperature || undefined, bloodPressure: vitalsMap.get(item.id)?.bloodPressure || undefined, heartRate: vitalsMap.get(item.id)?.heartRate || undefined } : undefined } })), ...prescriptionRows.map((item) => ({ id: `rx-${item.id}`, childId: item.patientId || "", childName: childMap.get(item.patientId || "") || "Child", type: "prescription", title: item.medication || "Prescription", description: item.instructions || item.notes || "Medication order", date: toIso(item.prescribedAt || item.createdAt), doctor: item.prescribedBy || null, facility: item.pharmacy || "Hospital", attachments: [], details: { medications: [{ name: item.medication || "Medication", dosage: item.dosage || "", duration: item.duration || "" }] } })), ...labOrderRows.map((item) => ({ id: `lab-${item.id}`, childId: item.patientId || "", childName: childMap.get(item.patientId || "") || "Child", type: "lab", title: item.testName || item.testCode || "Lab order", description: item.notes || "Lab record", date: toIso(item.completedAt || item.orderedAt || item.createdAt), doctor: item.orderedBy || null, facility: item.labLocation || "Laboratory", attachments: [], details: { labResults: Array.isArray(item.results) ? item.results : [] } }))].sort((a, b) => new Date(String(b.date || 0)).getTime() - new Date(String(a.date || 0)).getTime());
  return { records, children: children.map((item) => ({ id: item.patientId, firstName: item.patient.firstName || "", lastName: item.patient.lastName || "", fullName: toPatientName(item.patient) })), hasPatientRole: context.hasPatientRole };
}
export async function getGuardianVaccinationsData(context: GuardianContext) {
  const children = await getGuardianChildrenRows(context);
  const childIds = new Set(children.map((item) => item.patientId));
  const records = (await getVaccinationRecords(context.tenantId)).filter((item) => childIds.has(item.patientId));
  return {
    vaccinations: records.map((item) => ({ ...item, childName: toPatientName(children.find((row) => row.patientId === item.patientId)?.patient || {}) })),
    children: children.map((item) => ({ id: item.patientId, firstName: item.patient.firstName || "", lastName: item.patient.lastName || "", dob: toIso(item.patient.dob) })),
    schedule: DEFAULT_VACCINE_SCHEDULE,
    summary: { total: records.length, completed: records.filter((item) => item.status === "completed").length, upcoming: records.filter((item) => item.status === "upcoming" || item.status === "scheduled").length, overdue: records.filter((item) => item.status === "overdue").length },
    hasPatientRole: context.hasPatientRole,
  };
}

export async function getGuardianLabResultsData(context: GuardianContext) {
  const children = await getGuardianChildrenRows(context);
  const childIds = children.map((item) => item.patientId);
  const childMap = new Map(children.map((item) => [item.patientId, toPatientName(item.patient)]));
  const orders = childIds.length ? await db.query.labOrders.findMany({ where: and(eq(labOrders.tenantId, context.tenantId), inArray(labOrders.patientId, childIds)), orderBy: [desc(labOrders.orderedAt), desc(labOrders.createdAt)] }) : [];
  const results = orders.length ? await db.query.labResults.findMany({ where: inArray(labResults.labOrderId, orders.map((item) => item.id)), orderBy: [desc(labResults.createdAt)] }) : [];
  const resultMap = new Map(results.map((item) => [item.labOrderId, item]));
  const providerIds = Array.from(new Set(orders.map((item) => item.doctorId || item.orderedBy).filter(Boolean))) as string[];
  const providers = providerIds.length ? await db.query.users.findMany({ where: inArray(users.id, providerIds) }) : [];
  const providerMap = new Map(providers.map((item) => [item.id, item.fullName || item.email]));
  const invoices = childIds.length ? await db.query.invoices.findMany({ where: and(eq(invoices.tenantId, context.tenantId), inArray(invoices.patientId, childIds)) }) : [];
  const paymentsRows = childIds.length ? await db.query.payments.findMany({ where: eq(payments.tenantId, context.tenantId) }) : [];
  const items = orders.map((order) => {
    const orderResult = resultMap.get(order.id);
    const patientInvoices = invoices.filter((item) => item.patientId === order.patientId);
    const patientPaymentIds = new Set(patientInvoices.map((item) => item.id));
    const hasPaymentClearance = paymentsRows.some((item) => patientPaymentIds.has(item.invoiceId || "") && item.status === "completed") || patientInvoices.some((item) => ["paid", "completed"].includes(String(item.status || "").toLowerCase()));
    return { id: orderResult?.id || order.id, orderId: order.id, childId: order.patientId || "", childName: childMap.get(order.patientId || "") || "Child", testName: order.testName || order.testCode || "Lab result", testCode: order.testCode, category: order.category || "general", status: orderResult ? "completed" : order.status || "pending", orderedAt: toIso(order.orderedAt || order.createdAt), completedAt: toIso(order.completedAt || orderResult?.createdAt), provider: providerMap.get(order.doctorId || order.orderedBy || "") || "Lab Team", notes: order.notes, resultData: orderResult?.resultData || order.results || null, fileUrl: orderResult?.fileUrl || null, patientPortalEligible: hasPaymentClearance };
  });
  return { results: items, summary: { total: items.length, ready: items.filter((item) => item.patientPortalEligible && item.resultData).length, payable: items.filter((item) => !item.patientPortalEligible).length }, children: children.map((item) => ({ id: item.patientId, fullName: toPatientName(item.patient) })), categories: [{ id: "all", name: "All Results", count: items.length }, ...Array.from(new Set(items.map((item) => item.category))).map((category) => ({ id: category, name: category, count: items.filter((item) => item.category === category).length }))], hasPatientRole: context.hasPatientRole };
}

export async function getGuardianLabResultById(context: GuardianContext, id: string) {
  const data = await getGuardianLabResultsData(context);
  return data.results.find((item) => item.id === id || item.orderId === id) || null;
}

export async function getGuardianAlertSettings(context: GuardianContext) {
  const all = await getTenantSettingValue<Record<string, GuardianAlertSettings>>(context.tenantId, ALERT_SETTINGS_KEY, {});
  return all[context.userId] || DEFAULT_ALERT_SETTINGS;
}

export async function updateGuardianAlertSettings(context: GuardianContext, settings: GuardianAlertSettings) {
  const all = await getTenantSettingValue<Record<string, GuardianAlertSettings>>(context.tenantId, ALERT_SETTINGS_KEY, {});
  all[context.userId] = settings;
  await setTenantSettingValue(context.tenantId, ALERT_SETTINGS_KEY, all, context.userId);
  return settings;
}

export async function getGuardianAlertsData(context: GuardianContext) {
  const settings = await getGuardianAlertSettings(context);
  const acks = await getGuardianAlertAcks(context.tenantId);
  const children = await getGuardianChildrenRows(context);
  const childIds = children.map((item) => item.patientId);
  const childMap = new Map(children.map((item) => [item.patientId, toPatientName(item.patient)]));
  const [notificationRows, appointmentRows, invoiceRows] = await Promise.all([
    db.query.notifications.findMany({ where: and(eq(notifications.tenantId, context.tenantId), eq(notifications.userId, context.userId)), orderBy: [desc(notifications.createdAt)], limit: 50 }),
    childIds.length ? db.query.appointments.findMany({ where: and(eq(appointments.tenantId, context.tenantId), inArray(appointments.patientId, childIds)), orderBy: [desc(appointments.scheduledAt)], limit: 50 }) : [],
    childIds.length ? db.query.invoices.findMany({ where: and(eq(invoices.tenantId, context.tenantId), inArray(invoices.patientId, childIds)), orderBy: [desc(invoices.createdAt)], limit: 50 }) : [],
  ]);
  const generated = [...appointmentRows.filter((item) => item.scheduledAt && item.scheduledAt >= new Date()).slice(0, 20).map((item) => ({ id: `appointment-${item.id}`, childId: item.patientId || "", childName: childMap.get(item.patientId || "") || "Child", type: "appointment", title: "Upcoming appointment", message: `Upcoming visit scheduled for ${new Date(item.scheduledAt!).toLocaleString()}`, severity: "medium" as const, status: acks.get(`appointment-${item.id}`)?.status || "active", createdAt: toIso(item.createdAt), dueDate: toIso(item.scheduledAt), actionRequired: true, actionUrl: `/tenant/${context.tenantSlug}/guardian/appointments` })), ...invoiceRows.filter((item) => !["paid", "completed"].includes(String(item.status || "").toLowerCase())).slice(0, 20).map((item) => ({ id: `billing-${item.id}`, childId: item.patientId || "", childName: childMap.get(item.patientId || "") || "Child", type: "health", title: "Outstanding balance", message: `${toMoneyNumber(item.amountDue ?? item.totalAmount ?? item.amount).toFixed(2)} is still outstanding for this child visit.`, severity: "high" as const, status: acks.get(`billing-${item.id}`)?.status || "active", createdAt: toIso(item.createdAt), dueDate: toIso(item.dueDate), actionRequired: true, actionUrl: `/tenant/${context.tenantSlug}/guardian/lab-results` })), ...notificationRows.map((item) => ({ id: item.id, childId: typeof item.metadata === "object" && item.metadata && "childId" in (item.metadata as any) ? String((item.metadata as any).childId) : "", childName: typeof item.metadata === "object" && item.metadata && "childName" in (item.metadata as any) ? String((item.metadata as any).childName) : "Family", type: item.type || "system", title: item.title || "Notification", message: item.message || "", severity: "low" as const, status: item.read ? "acknowledged" : "active", createdAt: toIso(item.createdAt), dueDate: null, actionRequired: false, actionUrl: null }))].sort((a, b) => new Date(String(b.createdAt || 0)).getTime() - new Date(String(a.createdAt || 0)).getTime());
  return { alerts: generated, settings, hasPatientRole: context.hasPatientRole };
}

export async function acknowledgeGuardianAlert(context: GuardianContext, alertId: string) {
  if (!alertId.startsWith("appointment-") && !alertId.startsWith("billing-")) {
    const notification = await db.query.notifications.findFirst({ where: and(eq(notifications.tenantId, context.tenantId), eq(notifications.userId, context.userId), eq(notifications.id, alertId)) });
    if (notification?.id) {
      await db.update(notifications).set({ read: true, updatedAt: new Date() }).where(eq(notifications.id, notification.id));
      return { id: alertId, status: "acknowledged" as const };
    }
  }
  const current = await getTenantSettingValue<GuardianAcknowledgement[]>(context.tenantId, ALERT_ACKS_KEY, []);
  const next = [{ id: alertId, status: "acknowledged" as const, updatedAt: new Date().toISOString() }, ...current.filter((item) => item.id !== alertId)].slice(0, 1000);
  await setTenantSettingValue(context.tenantId, ALERT_ACKS_KEY, next, context.userId);
  return { id: alertId, status: "acknowledged" as const };
}

export function getGuardianVaccinationSchedule() {
  return DEFAULT_VACCINE_SCHEDULE;
}
