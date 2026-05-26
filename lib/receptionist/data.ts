import crypto from "node:crypto";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  guardianPatients,
  guardians,
  insurancePolicies,
  notifications,
  patientAllergies,
  patientConditions,
  patients,
  queues,
  roles,
  systemAlerts,
  tenantSettings,
  tenants,
  userRoles,
  users,
  visits,
} from "@/lib/db/schema";
import {
  canProvisionPatientPortalAccess,
  deferPatientPortalAccess,
  provisionPatientPortalAccess,
  syncDeferredPatientPortalAccesses,
} from "@/lib/receptionist/access";
import { getEligiblePatientIdsForTenant } from "@/lib/patient-access";
import {
  addVisitPaymentSelection,
  getLatestVisitPaymentSelectionsByPatient,
  getPatientPaymentWorkspace,
  setPatientDefaultPaymentPreference,
} from "@/lib/receptionist/payment";

const WAITING_ROOM_ANNOUNCEMENTS_KEY = "reception_waiting_room_announcements";
const EMERGENCY_ALERTS_KEY = "reception_emergency_alerts";
const EMERGENCY_PROTOCOLS_KEY = "reception_emergency_protocols";
const APPOINTMENT_METADATA_KEY = "reception_appointment_metadata";

type TenantRecord = typeof tenants.$inferSelect;

async function ensureGuardianLinkForNewPatient(
  tenantId: string,
  patientId: string,
  payload: any,
) {
  const guardianInput = payload?.guardian;
  if (!guardianInput?.isParentGuardian || !guardianInput?.isExistingPatient) return null;

  const email = String(guardianInput.email || "").trim();
  const phone = String(guardianInput.phone || "").trim();
  if (!email && !phone) return null;
  const identityConditions = [
    email ? ilike(users.email, email) : null,
    phone ? eq(users.phone, phone) : null,
  ].filter(Boolean) as any[];

  const possibleUsers = await db
    .select({
      id: users.id,
      email: users.email,
      phone: users.phone,
      role: users.role,
      linkedRole: roles.name,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(
      and(
        eq(users.tenantId, tenantId),
        eq(users.isActive, true),
        isNull(users.deletedAt),
        or(...identityConditions),
      ),
    );

  const matchingGuardian = possibleUsers.find((row) => {
    const normalized = new Set([String(row.role || "").toLowerCase(), String(row.linkedRole || "").toLowerCase()].filter(Boolean));
    return normalized.has("patient") || normalized.has("guardian");
  });

  if (!matchingGuardian?.id) return null;

  const guardianRole = await db.query.roles.findFirst({
    where: eq(roles.name, "guardian"),
    columns: { id: true },
  });

  const hasGuardianRole = possibleUsers.some(
    (row) => row.id === matchingGuardian.id && String(row.linkedRole || row.role || "").toLowerCase() === "guardian",
  );

  if (guardianRole?.id && !hasGuardianRole) {
    const existingAssignment = await db.query.userRoles.findFirst({
      where: and(eq(userRoles.userId, matchingGuardian.id), eq(userRoles.roleId, guardianRole.id)),
    });
    if (!existingAssignment) {
      await db.insert(userRoles).values({ userId: matchingGuardian.id, roleId: guardianRole.id });
    }
  }

  let guardianRecord = await db.query.guardians.findFirst({
    where: and(eq(guardians.tenantId, tenantId), eq(guardians.userId, matchingGuardian.id)),
  });

  if (!guardianRecord?.id) {
    const [createdGuardian] = await db
      .insert(guardians)
      .values({
        tenantId,
        userId: matchingGuardian.id,
        relationship: guardianInput.relationship || "parent",
      })
      .returning();
    guardianRecord = createdGuardian ?? null;
  }

  if (!guardianRecord?.id) return null;

  const existingLink = await db.query.guardianPatients.findFirst({
    where: and(eq(guardianPatients.guardianId, guardianRecord.id), eq(guardianPatients.patientId, patientId)),
  });

  if (!existingLink?.id) {
    await db.insert(guardianPatients).values({
      guardianId: guardianRecord.id,
      patientId,
      canViewRecords: true,
      canSchedule: true,
      emergencyContact: true,
    });
  }

  return {
    guardianUserId: matchingGuardian.id,
    guardianId: guardianRecord.id,
    linked: true,
  };
}

const defaultEmergencyProtocols = [
  {
    id: "cardiac-arrest",
    name: "Cardiac Arrest Response",
    type: "cardiac",
    steps: [
      "Activate code blue immediately",
      "Start CPR and attach AED",
      "Call cardiac response team",
      "Prepare transfer to ICU after stabilization",
    ],
    estimatedTime: "10-15 minutes",
    requiredPersonnel: ["Doctor", "Nurse", "Respiratory Therapist"],
  },
  {
    id: "severe-trauma",
    name: "Severe Trauma Response",
    type: "trauma",
    steps: [
      "Assess airway, breathing, circulation",
      "Control bleeding and immobilize patient",
      "Escalate trauma team and prep imaging",
      "Prepare theatre or ICU transfer if needed",
    ],
    estimatedTime: "20-40 minutes",
    requiredPersonnel: ["Doctor", "Nurse", "Radiology Tech"],
  },
  {
    id: "acute-stroke",
    name: "Acute Stroke Protocol",
    type: "neurological",
    steps: [
      "Run stroke assessment immediately",
      "Escalate stroke response team",
      "Prepare CT imaging and medication pathway",
      "Transfer to monitored care unit",
    ],
    estimatedTime: "45-60 minutes",
    requiredPersonnel: ["Doctor", "Nurse", "Radiology Tech"],
  },
];

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function endOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

function toFullPatientName(patient: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  if (patient.fullName?.trim()) return patient.fullName.trim();
  return `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Unknown patient";
}

function computeWaitMinutes(createdAt?: Date | null) {
  if (!createdAt) return 0;
  return Math.max(0, Math.round((Date.now() - createdAt.getTime()) / 60000));
}

function formatMinutes(minutes: number) {
  return `${minutes} min`;
}

function formatClock(value?: Date | null) {
  if (!value) return "--:--";
  return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildCallAnnouncement(patientName: string, destination: string, queueId: string, patientId: string | null, queueNumber: string | null) {
  return {
    id: `announcement-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    queueId,
    patientId,
    patientName,
    queueNumber,
    destination,
    message: `${patientName}${queueNumber ? ` (${queueNumber})` : ""}, please proceed to ${destination}.`,
    type: "call",
    timestamp: new Date().toISOString(),
    active: true,
    status: "active",
  };
}

async function getSetting<T>(tenantId: string, key: string, fallback: T): Promise<T> {
  const record = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)),
  });
  return (record?.value as T | undefined) ?? fallback;
}

async function setSetting(tenantId: string, key: string, value: unknown, updatedBy?: string | null) {
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

type AppointmentMetadata = {
  appointmentId: string;
  appointmentType?: string | null;
  reason?: string | null;
  notes?: string | null;
  updatedAt: string;
};

async function getAppointmentMetadata(tenantId: string) {
  return getSetting<AppointmentMetadata[]>(tenantId, APPOINTMENT_METADATA_KEY, []);
}

async function upsertAppointmentMetadata(tenantId: string, metadata: AppointmentMetadata, updatedBy?: string | null) {
  const current = await getAppointmentMetadata(tenantId);
  const next = [metadata, ...current.filter((item) => item.appointmentId !== metadata.appointmentId)].slice(0, 5000);
  await setSetting(tenantId, APPOINTMENT_METADATA_KEY, next, updatedBy);
  return metadata;
}

export async function getTenantBySlug(slug: string): Promise<TenantRecord | null> {
  return (await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug.toLowerCase()),
  })) ?? null;
}

export async function getReceptionDashboardMetrics(tenantId: string) {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const [todayPatientsCount] = await db
    .select({ value: count() })
    .from(appointments)
    .where(and(eq(appointments.tenantId, tenantId), gte(appointments.scheduledAt, todayStart), lte(appointments.scheduledAt, todayEnd)));

  const [checkedInCount] = await db
    .select({ value: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        gte(appointments.scheduledAt, todayStart),
        lte(appointments.scheduledAt, todayEnd),
        inArray(appointments.status, ["checked-in", "in-progress", "completed"]),
      ),
    );

  const [completedAppointmentsCount] = await db
    .select({ value: count() })
    .from(appointments)
    .where(
      and(eq(appointments.tenantId, tenantId), gte(appointments.scheduledAt, todayStart), lte(appointments.scheduledAt, todayEnd), eq(appointments.status, "completed")),
    );

  const [noShowsCount] = await db
    .select({ value: count() })
    .from(appointments)
    .where(
      and(eq(appointments.tenantId, tenantId), gte(appointments.scheduledAt, todayStart), lte(appointments.scheduledAt, todayEnd), eq(appointments.status, "no-show")),
    );

  const activeQueue = await db.query.queues.findMany({
    where: and(eq(queues.tenantId, tenantId), inArray(queues.status, ["waiting", "called", "in-progress", "with-doctor"])),
    columns: { createdAt: true, priority: true, status: true },
  });

  const [registrationsToday] = await db
    .select({ value: count() })
    .from(patients)
    .where(and(eq(patients.tenantId, tenantId), gte(patients.createdAt, todayStart), lte(patients.createdAt, todayEnd)));

  const upcomingAppointments = await db.query.appointments.findMany({
    where: and(
      eq(appointments.tenantId, tenantId),
      gte(appointments.scheduledAt, new Date()),
      lte(appointments.scheduledAt, new Date(Date.now() + 60 * 60000)),
      eq(appointments.status, "scheduled"),
    ),
    columns: { id: true },
  });

  const emergencyAlerts = await getEmergencyAlerts(tenantId);
  const criticalAlerts = emergencyAlerts.filter((alert: any) => ["critical", "urgent"].includes(alert.severity) && ["active", "responding"].includes(alert.status));

  const averageWait = activeQueue.length
    ? Math.round(activeQueue.reduce((sum, item) => sum + computeWaitMinutes(item.createdAt), 0) / activeQueue.length)
    : 0;

  return {
    totalPatientsToday: todayPatientsCount?.value ?? 0,
    checkedInToday: checkedInCount?.value ?? 0,
    waitingInQueue: activeQueue.length,
    completedAppointments: completedAppointmentsCount?.value ?? 0,
    emergencyAlerts: criticalAlerts.length,
    newRegistrations: registrationsToday?.value ?? 0,
    averageWaitTime: averageWait,
    satisfactionScore: 96,
    upcomingAppointments: upcomingAppointments.length,
    noShowsToday: noShowsCount?.value ?? 0,
  };
}

export async function getReceptionAppointments(tenantId: string, options?: { todayOnly?: boolean; patientId?: string }) {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const whereClause =
    options?.patientId
      ? and(eq(appointments.tenantId, tenantId), eq(appointments.patientId, options.patientId))
      : options?.todayOnly
        ? and(eq(appointments.tenantId, tenantId), gte(appointments.scheduledAt, todayStart), lte(appointments.scheduledAt, todayEnd))
        : eq(appointments.tenantId, tenantId);

  const rows = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      scheduledAt: appointments.scheduledAt,
      status: appointments.status,
      patientFullName: patients.fullName,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientPhone: patients.phone,
      patientEmail: patients.email,
      patientGlobalId: patients.globalPatientId,
      patientMrn: patients.mrn,
      doctorName: users.fullName,
      doctorRole: users.role,
    })
    .from(appointments)
    .leftJoin(patients, eq(patients.id, appointments.patientId))
    .leftJoin(users, eq(users.id, appointments.doctorId))
    .where(whereClause)
    .orderBy(asc(appointments.scheduledAt));

  const metadataRows = await getAppointmentMetadata(tenantId);
  const metadataMap = new Map(metadataRows.map((item) => [item.appointmentId, item]));

  return rows.map((row) => ({
    ...(metadataMap.get(row.id)
      ? {
          type: metadataMap.get(row.id)?.appointmentType || (row.status === "cancelled" ? "Cancelled visit" : "Consultation"),
          reason: metadataMap.get(row.id)?.reason || null,
          notes: metadataMap.get(row.id)?.notes || null,
        }
      : {}),
    id: row.id,
    patientId: row.patientId,
    patientName: toFullPatientName({
      fullName: row.patientFullName,
      firstName: row.patientFirstName,
      lastName: row.patientLastName,
    }),
    medicalRecordNumber: row.patientGlobalId || row.patientMrn || null,
    patientPhone: row.patientPhone || null,
    patientEmail: row.patientEmail || null,
    doctorId: row.doctorId,
    doctorName: row.doctorName || "Unassigned doctor",
    department: row.doctorRole === "doctor" ? "Consultation" : "General",
    scheduledAt: row.scheduledAt?.toISOString() || null,
    time: formatClock(row.scheduledAt),
    status: row.status || "scheduled",
    type: metadataMap.get(row.id)?.appointmentType || (row.status === "cancelled" ? "Cancelled visit" : "Consultation"),
    duration: 30,
    reason: metadataMap.get(row.id)?.reason || null,
    notes: metadataMap.get(row.id)?.notes || null,
  }));
}

export async function updateReceptionAppointment(
  tenantId: string,
  appointmentId: string,
  patch: { status?: string; scheduledAt?: string | Date | null },
) {
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (patch.status) {
    updates.status = patch.status;
  }

  if (patch.scheduledAt !== undefined) {
    updates.scheduledAt = patch.scheduledAt ? new Date(patch.scheduledAt) : null;
  }

  await db
    .update(appointments)
    .set(updates as any)
    .where(and(eq(appointments.tenantId, tenantId), eq(appointments.id, appointmentId)));

  return db.query.appointments.findFirst({
    where: and(eq(appointments.tenantId, tenantId), eq(appointments.id, appointmentId)),
  });
}

export async function getReceptionAppointmentById(tenantId: string, appointmentId: string) {
  const appointmentsList = await getReceptionAppointments(tenantId);
  return appointmentsList.find((item) => item.id === appointmentId) || null;
}

export async function getReceptionBookingProviders(tenantId: string) {
  const rows = await db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId), eq(users.role, "doctor"), eq(users.isActive, true)),
    orderBy: [asc(users.fullName)],
    columns: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.fullName || row.email,
    specialty: "Consultation",
    email: row.email,
    phone: row.phone,
  }));
}

export async function createReceptionAppointment(
  tenantId: string,
  payload: {
    patientId: string;
    doctorId: string | null;
    scheduledAt: string | Date;
    appointmentType?: string | null;
    reason?: string | null;
    notes?: string | null;
    updatedBy?: string | null;
  },
) {
  const [created] = await db
    .insert(appointments)
    .values({
      tenantId,
      patientId: payload.patientId,
      doctorId: payload.doctorId,
      scheduledAt: new Date(payload.scheduledAt),
      status: "scheduled",
    })
    .returning();

  await upsertAppointmentMetadata(
    tenantId,
    {
      appointmentId: created.id,
      appointmentType: payload.appointmentType || "Consultation",
      reason: payload.reason || null,
      notes: payload.notes || null,
      updatedAt: new Date().toISOString(),
    },
    payload.updatedBy || null,
  );

  return getReceptionAppointmentById(tenantId, created.id);
}

export async function rescheduleReceptionAppointment(
  tenantId: string,
  appointmentId: string,
  payload: {
    doctorId: string | null;
    scheduledAt: string | Date;
    appointmentType?: string | null;
    reason?: string | null;
    notes?: string | null;
    status?: string | null;
    updatedBy?: string | null;
  },
) {
  await db
    .update(appointments)
    .set({
      doctorId: payload.doctorId,
      scheduledAt: new Date(payload.scheduledAt),
      status: payload.status || "scheduled",
      updatedAt: new Date(),
    } as any)
    .where(and(eq(appointments.tenantId, tenantId), eq(appointments.id, appointmentId)));

  await upsertAppointmentMetadata(
    tenantId,
    {
      appointmentId,
      appointmentType: payload.appointmentType || "Consultation",
      reason: payload.reason || null,
      notes: payload.notes || null,
      updatedAt: new Date().toISOString(),
    },
    payload.updatedBy || null,
  );

  return getReceptionAppointmentById(tenantId, appointmentId);
}

export async function searchReceptionPatients(tenantId: string, query: string) {
  await syncDeferredPatientPortalAccesses(tenantId);
  const term = query.trim();
  if (!term || term.length < 2) return [];

  const eligiblePatientIds = await getEligiblePatientIdsForTenant(tenantId);
  if (!eligiblePatientIds.length) return [];

  const rows = await db.query.patients.findMany({
    where: and(
      eq(patients.tenantId, tenantId),
      inArray(patients.id, eligiblePatientIds),
      or(
        ilike(patients.fullName, `%${term}%`),
        ilike(patients.firstName, `%${term}%`),
        ilike(patients.lastName, `%${term}%`),
        ilike(patients.globalPatientId, `%${term}%`),
        ilike(patients.mrn, `%${term}%`),
        ilike(patients.phone, `%${term}%`),
      ),
    ),
    orderBy: [desc(patients.updatedAt)],
  });

  const patientIds = rows.map((row) => row.id);
  const visitRows = patientIds.length
    ? await db.query.visits.findMany({
        where: inArray(visits.patientId, patientIds),
        orderBy: [desc(visits.createdAt)],
      })
    : [];

  const visitsByPatient = new Map<string, typeof visitRows>();
  for (const visit of visitRows) {
    const bucket = visitsByPatient.get(visit.patientId || "") || [];
    bucket.push(visit);
    visitsByPatient.set(visit.patientId || "", bucket);
  }

  return rows.map((patient) => {
    const patientVisits = visitsByPatient.get(patient.id) || [];
    const latestVisit = patientVisits[0];
    return {
      id: patient.id,
      firstName: patient.firstName || patient.fullName?.split(" ")[0] || "",
      lastName: patient.lastName || patient.fullName?.split(" ").slice(1).join(" ") || "",
      fullName: toFullPatientName(patient),
      dateOfBirth: patient.dob?.toISOString() || null,
      phone: patient.phone || "",
      email: patient.email || "",
      address: patient.address || "",
      medicalRecordNumber: patient.globalPatientId || patient.mrn || "",
      lastVisit: latestVisit?.createdAt?.toISOString() || null,
      visitCount: patientVisits.length,
      status: patient.status || "active",
    };
  });
}

export async function getReceptionPatientProfile(tenantId: string, patientId: string) {
  await syncDeferredPatientPortalAccesses(tenantId);
  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.tenantId, tenantId), eq(patients.id, patientId)),
  });
  if (!patient) return null;

  const [allergies, conditions, patientVisits, insuranceRows] = await Promise.all([
    db.select().from(patientAllergies).where(eq(patientAllergies.patientId, patientId)),
    db.select().from(patientConditions).where(eq(patientConditions.patientId, patientId)),
    db.query.visits.findMany({
      where: eq(visits.patientId, patientId),
      orderBy: [desc(visits.createdAt)],
      limit: 10,
    }),
    db.query.insurancePolicies.findMany({
      where: and(eq(insurancePolicies.tenantId, tenantId), eq(insurancePolicies.patientId, patientId)),
      orderBy: [asc(insurancePolicies.provider)],
    }),
  ]);

  return {
    ...patient,
    fullName: toFullPatientName(patient),
    allergies: allergies.map((item) => item.allergy).filter(Boolean),
    conditions: conditions.map((item) => item.condition).filter(Boolean),
    insurancePolicies: insuranceRows.map((row) => ({
      id: row.id,
      provider: row.provider || "",
      policyNumber: row.policyNumber || "",
    })),
    recentVisits: patientVisits.map((visit) => ({
      id: visit.id,
      reason: visit.reason || "Consultation",
      notes: visit.notes || "",
      createdAt: visit.createdAt?.toISOString() || null,
    })),
  };
}

export async function registerReceptionPatient(tenantId: string, payload: any) {
  await syncDeferredPatientPortalAccesses(tenantId);
  const fullName = `${payload.firstName || ""} ${payload.lastName || ""}`.trim();
  const sequence = Date.now().toString().slice(-6);
  const [patient] = await db
    .insert(patients)
    .values({
      tenantId,
      fullName,
      firstName: payload.firstName || null,
      lastName: payload.lastName || null,
      dob: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
      gender: payload.gender || null,
      phone: payload.phone || null,
      email: payload.email || null,
      address:
        typeof payload.address === "string"
          ? payload.address
          : [payload.address?.street, payload.address?.city, payload.address?.state, payload.address?.zipCode]
              .filter(Boolean)
              .join(", "),
      status: "active",
      globalPatientId: `PT-${sequence}`,
      mrn: `MRN${sequence}`,
    })
    .returning();

  if (payload.paymentPreference?.paymentMethod === "insurance" && payload.insurance?.provider && payload.insurance?.policyNumber) {
    await db.insert(insurancePolicies).values({
      tenantId,
      patientId: patient.id,
      provider: payload.insurance.provider,
      policyNumber: payload.insurance.policyNumber,
    });
  }

  const allergyValues = String(payload.medicalHistory?.allergies || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const conditionValues = String(payload.medicalHistory?.conditions || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (allergyValues.length) {
    await db.insert(patientAllergies).values(allergyValues.map((allergy) => ({ patientId: patient.id, allergy })));
  }
  if (conditionValues.length) {
    await db.insert(patientConditions).values(conditionValues.map((condition) => ({ patientId: patient.id, condition })));
  }

  if (payload.paymentPreference?.saveAsDefault && payload.paymentPreference?.paymentMethod) {
    await setPatientDefaultPaymentPreference(tenantId, {
      patientId: patient.id,
      paymentMethod: payload.paymentPreference.paymentMethod,
      insuranceProvider: payload.insurance?.provider || null,
      insurancePolicyNumber: payload.insurance?.policyNumber || null,
      updatedAt: new Date().toISOString(),
    });
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { slug: true },
  });

  const accessPolicy = await canProvisionPatientPortalAccess({
    tenantId,
    dateOfBirth: payload.dateOfBirth || null,
    isChildPatient: payload.isChildPatient === true,
  });

  const access = accessPolicy.allowed
    ? await provisionPatientPortalAccess({
        tenantId,
        tenantSlug: tenant?.slug || "tenant",
        patientId: patient.id,
        fullName,
        email: payload.email || null,
        phone: payload.phone || null,
      })
    : await deferPatientPortalAccess({
        tenantId,
        tenantSlug: tenant?.slug || "tenant",
        patientId: patient.id,
        fullName,
        email: payload.email || null,
        phone: payload.phone || null,
        dateOfBirth: payload.dateOfBirth || null,
        adultAge: accessPolicy.adultAge,
        eligibleOn: accessPolicy.eligibleOn || "",
      });

  const guardianLink = await ensureGuardianLinkForNewPatient(tenantId, patient.id, payload);

  return {
    patient,
    access,
    guardianLink,
  };
}

export async function checkInReceptionPatient(
  tenantId: string,
  patientId: string,
  appointmentId?: string | null,
  paymentSelection?: {
    paymentMethod?: string | null;
    insuranceProvider?: string | null;
    insurancePolicyNumber?: string | null;
    saveAsDefault?: boolean;
    recordedBy?: string | null;
  },
) {
  await syncDeferredPatientPortalAccesses(tenantId);
  let appointment = appointmentId
    ? await db.query.appointments.findFirst({
        where: and(eq(appointments.tenantId, tenantId), eq(appointments.id, appointmentId)),
      })
    : null;

  if (!appointment) {
    const [createdAppointment] = await db
      .insert(appointments)
      .values({
        tenantId,
        patientId,
        doctorId: null,
        scheduledAt: new Date(),
        status: "checked-in",
      } as any)
      .returning();
    appointment = createdAppointment;
  } else {
    await db
      .update(appointments)
      .set({ status: "checked-in", updatedAt: new Date() })
      .where(eq(appointments.id, appointment.id));
  }

  const existingQueue = await db.query.queues.findFirst({
    where: and(eq(queues.tenantId, tenantId), eq(queues.patientId, patientId), inArray(queues.status, ["waiting", "called", "in-progress", "with-doctor"])),
  });

  let queueEntry = existingQueue;
  if (!queueEntry) {
    const currentQueue = await db.query.queues.findMany({
      where: eq(queues.tenantId, tenantId),
      orderBy: [desc(queues.position)],
      limit: 1,
    });

    const nextPosition = (currentQueue[0]?.position || 0) + 1;
    const [createdQueue] = await db
      .insert(queues)
      .values({
        tenantId,
        patientId,
        queueNumber: `Q${String(nextPosition).padStart(3, "0")}`,
        status: "waiting",
        priority: "normal",
        position: nextPosition,
      })
      .returning();
    queueEntry = createdQueue;
  }

  if (paymentSelection?.paymentMethod) {
    await addVisitPaymentSelection(
      tenantId,
      {
        id: crypto.randomUUID(),
        patientId,
        appointmentId: appointment?.id || null,
        paymentMethod: paymentSelection.paymentMethod,
        insuranceProvider: paymentSelection.insuranceProvider || null,
        insurancePolicyNumber: paymentSelection.insurancePolicyNumber || null,
        recordedAt: new Date().toISOString(),
        recordedBy: paymentSelection.recordedBy || null,
      },
      Boolean(paymentSelection.saveAsDefault),
      paymentSelection.recordedBy || null,
    );
  }

  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.tenantId, tenantId), eq(patients.id, patientId)),
  });

  const doctor = appointment?.doctorId
    ? await db.query.users.findFirst({ where: eq(users.id, appointment.doctorId) })
    : null;

  return {
    patient: {
      id: patient?.id || patientId,
      firstName: patient?.firstName || patient?.fullName?.split(" ")[0] || "",
      lastName: patient?.lastName || patient?.fullName?.split(" ").slice(1).join(" ") || "",
      fullName: patient ? toFullPatientName(patient) : "Unknown patient",
      medicalRecordNumber: patient?.globalPatientId || patient?.mrn || "",
      phone: patient?.phone || "",
      email: patient?.email || "",
    },
    appointment: {
      id: appointment?.id || "",
      type: "Consultation",
      doctorName: doctor?.fullName || "Pending doctor assignment",
      scheduledAt: appointment?.scheduledAt?.toISOString() || null,
    },
    checkInTime: new Date().toISOString(),
    estimatedWaitTime: formatMinutes(Math.max(10, ((queueEntry?.position || 1) - 1) * 8)),
    queuePosition: queueEntry?.position || 1,
    queueNumber: queueEntry?.queueNumber || null,
    payment: {
      method: paymentSelection?.paymentMethod || null,
      insuranceProvider: paymentSelection?.insuranceProvider || null,
      insurancePolicyNumber: paymentSelection?.insurancePolicyNumber || null,
    },
  };
}

export async function getReceptionQueue(tenantId: string) {
  const rows = await db.query.queues.findMany({
    where: eq(queues.tenantId, tenantId),
    orderBy: [asc(queues.position), asc(queues.createdAt)],
  });

  const patientIds = [...new Set(rows.map((row) => row.patientId).filter(Boolean))] as string[];
  const patientRows = patientIds.length
    ? await db.query.patients.findMany({ where: inArray(patients.id, patientIds) })
    : [];
  const patientMap = new Map(patientRows.map((row) => [row.id, row]));

  return rows.map((row) => {
    const patient = row.patientId ? patientMap.get(row.patientId) : null;
    const waitMinutes = computeWaitMinutes(row.createdAt);
    const normalizedStatus = row.status === "in-progress" ? "with-doctor" : row.status || "waiting";

    return {
      id: row.id,
      patientId: row.patientId,
      patientName: patient ? toFullPatientName(patient) : "Unknown patient",
      age: patient?.dob ? Math.max(0, new Date().getFullYear() - patient.dob.getFullYear()) : 0,
      priority: (row.priority || "normal") as "low" | "normal" | "high" | "urgent",
      checkInTime: row.createdAt?.toISOString() || null,
      estimatedWaitTime: formatMinutes(Math.max(waitMinutes, ((row.position || 1) - 1) * 8)),
      actualWaitTime: formatMinutes(waitMinutes),
      status: normalizedStatus as "waiting" | "with-doctor" | "completed" | "cancelled",
      appointmentType: "Consultation",
      doctorName: "Pending assignment",
      department: "Front Desk",
      notes: null,
      position: row.position || 0,
      queueNumber: row.queueNumber || null,
    };
  });
}

export async function getReceptionQueueStats(tenantId: string) {
  const queueItems = await getReceptionQueue(tenantId);
  const waiting = queueItems.filter((item) => item.status === "waiting");
  const completedToday = queueItems.filter((item) => item.status === "completed").length;
  const waitMinutes = waiting.map((item) => Number.parseInt(item.actualWaitTime, 10) || 0);

  return {
    totalWaiting: waiting.length,
    averageWaitTime: formatMinutes(waitMinutes.length ? Math.round(waitMinutes.reduce((a, b) => a + b, 0) / waitMinutes.length) : 0),
    longestWait: formatMinutes(waitMinutes.length ? Math.max(...waitMinutes) : 0),
    urgentCount: waiting.filter((item) => ["urgent", "high"].includes(item.priority)).length,
    completedToday,
  };
}

export async function updateReceptionQueueStatus(tenantId: string, queueId: string, status: string) {
  await db
    .update(queues)
    .set({
      status,
      calledAt: status === "called" ? new Date() : undefined,
      completedAt: ["completed", "cancelled", "no-show"].includes(status) ? new Date() : undefined,
      updatedAt: new Date(),
    } as any)
    .where(and(eq(queues.tenantId, tenantId), eq(queues.id, queueId)));

  if (["with-doctor", "completed", "cancelled", "no-show", "in-progress"].includes(status)) {
    await resolveQueueAnnouncements(
      tenantId,
      queueId,
      status === "cancelled" || status === "no-show" ? "cancelled" : "completed",
    );
  }

  return db.query.queues.findFirst({
    where: and(eq(queues.tenantId, tenantId), eq(queues.id, queueId)),
  });
}

export async function getWaitingRoomPatients(tenantId: string) {
  return (await getReceptionQueue(tenantId)).filter((item) => item.status !== "completed" && item.status !== "cancelled");
}

export async function getWaitingRoomStats(tenantId: string) {
  const items = await getWaitingRoomPatients(tenantId);
  const waitMinutes = items.map((item) => Number.parseInt(item.actualWaitTime, 10) || 0);

  return {
    totalPatients: items.length,
    averageWaitTime: formatMinutes(waitMinutes.length ? Math.round(waitMinutes.reduce((a, b) => a + b, 0) / waitMinutes.length) : 0),
    longestWait: formatMinutes(waitMinutes.length ? Math.max(...waitMinutes) : 0),
    roomsOccupied: items.filter((item) => item.status === "with-doctor").length,
    roomsAvailable: Math.max(0, 12 - items.filter((item) => item.status === "with-doctor").length),
    nextPatientCall: items.find((item) => item.status === "waiting")?.patientName || "None",
  };
}

export async function getWaitingRoomAnnouncements(tenantId: string) {
  return getSetting(
    tenantId,
    WAITING_ROOM_ANNOUNCEMENTS_KEY,
    [
      {
        id: "default-announcement-1",
        message: "Please keep your phone on silent while waiting.",
        type: "info",
        timestamp: new Date().toISOString(),
        active: true,
        status: "active",
      },
    ],
  );
}

export async function addWaitingRoomAnnouncement(tenantId: string, message: string, type: string, updatedBy?: string | null) {
  const current = await getWaitingRoomAnnouncements(tenantId);
  const next = [
    {
      id: `announcement-${Date.now()}`,
      message,
      type,
      timestamp: new Date().toISOString(),
      active: true,
      status: "active",
    },
    ...current,
  ].slice(0, 20);
  await setSetting(tenantId, WAITING_ROOM_ANNOUNCEMENTS_KEY, next, updatedBy);
  return next[0];
}

export async function updateWaitingRoomAnnouncement(
  tenantId: string,
  announcementId: string,
  patch: Record<string, unknown>,
  updatedBy?: string | null,
) {
  const current = await getWaitingRoomAnnouncements(tenantId);
  const next = current.map((item: any) =>
    item.id === announcementId
      ? {
          ...item,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
      : item
  );
  await setSetting(tenantId, WAITING_ROOM_ANNOUNCEMENTS_KEY, next, updatedBy);
  return next.find((item: any) => item.id === announcementId) || null;
}

export async function deleteWaitingRoomAnnouncement(tenantId: string, announcementId: string, updatedBy?: string | null) {
  const current = await getWaitingRoomAnnouncements(tenantId);
  const next = current.filter((item: any) => item.id !== announcementId);
  await setSetting(tenantId, WAITING_ROOM_ANNOUNCEMENTS_KEY, next, updatedBy);
  return { success: true };
}

export async function announceQueueDestination(
  tenantId: string,
  queueId: string,
  destination: string,
  updatedBy?: string | null,
) {
  const queueRow = await db.query.queues.findFirst({
    where: and(eq(queues.tenantId, tenantId), eq(queues.id, queueId)),
  });
  if (!queueRow?.patientId) return null;

  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.tenantId, tenantId), eq(patients.id, queueRow.patientId)),
    columns: {
      id: true,
      fullName: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!patient) return null;

  const current = await getWaitingRoomAnnouncements(tenantId);
  const nextAnnouncement = buildCallAnnouncement(
    toFullPatientName(patient),
    destination,
    queueRow.id,
    queueRow.patientId,
    queueRow.queueNumber || null,
  );

  const next = [
    nextAnnouncement,
    ...current.filter((item: any) => item.queueId !== queueId),
  ].slice(0, 50);

  await setSetting(tenantId, WAITING_ROOM_ANNOUNCEMENTS_KEY, next, updatedBy);
  return nextAnnouncement;
}

export async function resolveQueueAnnouncements(
  tenantId: string,
  queueId: string,
  status: "completed" | "cancelled" | "responding" | "resolved",
  updatedBy?: string | null,
) {
  const current = await getWaitingRoomAnnouncements(tenantId);
  const next = current.map((item: any) =>
    item.queueId === queueId
      ? {
          ...item,
          active: false,
          status,
          resolvedAt: new Date().toISOString(),
        }
      : item
  );
  await setSetting(tenantId, WAITING_ROOM_ANNOUNCEMENTS_KEY, next, updatedBy);
}

export async function getEmergencyAlerts(tenantId: string) {
  const stored = await getSetting<any[]>(tenantId, EMERGENCY_ALERTS_KEY, []);
  const systemCritical = await db.query.systemAlerts.findMany({
    where: and(eq(systemAlerts.tenantId, tenantId), eq(systemAlerts.isResolved, false)),
    orderBy: [desc(systemAlerts.createdAt)],
    limit: 20,
  });

  const converted = systemCritical.map((alert) => ({
    id: `system-${alert.id}`,
    patientId: null,
    patientName: alert.title,
    type: alert.type || "system",
    severity: alert.severity === "critical" ? "critical" : "urgent",
    location: "Operations",
    description: alert.message || alert.title,
    reportedBy: "System",
    reportedAt: alert.createdAt?.toISOString() || new Date().toISOString(),
    status: alert.isResolved ? "resolved" : "active",
  }));

  return [...stored, ...converted].sort(
    (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime(),
  );
}

export async function createEmergencyAlert(tenantId: string, payload: any, updatedBy?: string | null) {
  const current = await getSetting<any[]>(tenantId, EMERGENCY_ALERTS_KEY, []);
  const alert = {
    id: `emergency-${Date.now()}`,
    ...payload,
    reportedAt: new Date().toISOString(),
    status: "active",
  };
  await setSetting(tenantId, EMERGENCY_ALERTS_KEY, [alert, ...current].slice(0, 50), updatedBy);
  return alert;
}

export async function updateEmergencyAlert(tenantId: string, alertId: string, patch: Record<string, unknown>, updatedBy?: string | null) {
  const current = await getSetting<any[]>(tenantId, EMERGENCY_ALERTS_KEY, []);
  const next = current.map((alert) => (alert.id === alertId ? { ...alert, ...patch } : alert));
  await setSetting(tenantId, EMERGENCY_ALERTS_KEY, next, updatedBy);
  return next.find((alert) => alert.id === alertId) || null;
}

export async function getEmergencyTeams(tenantId: string) {
  const staff = await db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId), inArray(users.role, ["doctor", "nurse", "hospital_admin", "receptionist"])),
    orderBy: [asc(users.fullName)],
  });

  return staff.map((user) => ({
    id: user.id,
    name: user.fullName || user.email,
    role: (user.role || "staff").replace(/_/g, " "),
    status: user.isActive ? "available" : "off-duty",
    location: "Hospital",
    lastActive: user.updatedAt?.toISOString() || user.createdAt?.toISOString() || new Date().toISOString(),
  }));
}

export async function getEmergencyProtocols(tenantId: string) {
  return getSetting(tenantId, EMERGENCY_PROTOCOLS_KEY, defaultEmergencyProtocols);
}

export async function getReceptionAlerts(tenantId: string) {
  const [queueStats, emergencyAlerts, unreadNotifications] = await Promise.all([
    getReceptionQueueStats(tenantId),
    getEmergencyAlerts(tenantId),
    db.query.notifications.findMany({
      where: and(eq(notifications.tenantId, tenantId), eq(notifications.read, false)),
      orderBy: [desc(notifications.createdAt)],
      limit: 10,
    }),
  ]);

  const alerts = [];

  if (queueStats.totalWaiting > 10) {
    alerts.push({
      id: "queue-pressure",
      type: "delay",
      title: "High Patient Volume",
      message: `${queueStats.totalWaiting} patients are waiting. Consider adding another front-desk lane.`,
      priority: "medium",
      timestamp: new Date().toISOString(),
    });
  }

  for (const alert of emergencyAlerts.filter((item: any) => ["active", "responding"].includes(item.status)).slice(0, 3)) {
    alerts.push({
      id: alert.id,
      type: "emergency",
      title: `Emergency: ${alert.patientName}`,
      message: alert.description,
      priority: alert.severity === "critical" ? "high" : "medium",
      timestamp: alert.reportedAt,
    });
  }

  for (const notification of unreadNotifications.slice(0, 3)) {
    alerts.push({
      id: notification.id,
      type: "system",
      title: notification.title || "Notification",
      message: notification.message || "",
      priority: "low",
      timestamp: notification.createdAt?.toISOString() || new Date().toISOString(),
    });
  }

  return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}


