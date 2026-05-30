import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import {
  appointments,
  insurancePolicies,
  patientAllergies,
  patientConditions,
  patients,
  roles,
  userRoles,
  users,
  userSettings,
  visits,
} from "@/lib/db/schema";
import { mergeUserSettings } from "@/lib/user-settings";

function normalize(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function splitName(fullName?: string | null) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function hasPatientRole(baseRole?: string | null, roleNames: string[] = []) {
  if (roleNames.length > 0) {
    return roleNames.some((role) => normalize(role) === "patient");
  }

  return normalize(baseRole) === "patient";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, id } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const patientRecordById = await db.query.patients.findFirst({
      where: and(eq(patients.id, id), eq(patients.tenantId, tenantId), isNull(patients.deletedAt)),
    });

    let appUser = await db.query.users.findFirst({
      where: and(eq(users.id, id), eq(users.tenantId, tenantId), isNull(users.deletedAt)),
      columns: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        address: true,
        dateOfBirth: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }) || null;

    if (!appUser && patientRecordById) {
      const patientName = patientRecordById.fullName || [patientRecordById.firstName, patientRecordById.lastName].filter(Boolean).join(" ").trim();
      const candidates = await db.query.users.findMany({
        where: and(eq(users.tenantId, tenantId), isNull(users.deletedAt)),
        columns: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          address: true,
          dateOfBirth: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });
      appUser = candidates.find((candidate) =>
        normalize(candidate.email) === normalize(patientRecordById.email) ||
        normalize(candidate.phone) === normalize(patientRecordById.phone) ||
        normalize(candidate.fullName) === normalize(patientName)
      ) || null;
    }

    if (!appUser && !patientRecordById) {
      return NextResponse.json({ error: "Patient user not found" }, { status: 404 });
    }

    const [roleRows, settingsRecord] = await Promise.all([
      appUser
        ? db
            .select({ roleName: roles.name })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(userRoles.userId, appUser.id))
            .catch(() => [])
        : Promise.resolve([]),
      appUser
        ? db.query.userSettings.findFirst({
            where: eq(userSettings.userId, appUser.id),
          }).catch(() => null)
        : Promise.resolve(null),
    ]);

    const roleNames = roleRows.map((row) => row.roleName);
    if (appUser && !patientRecordById && !hasPatientRole(appUser.role, roleNames)) {
      return NextResponse.json({ error: "User is not a patient" }, { status: 404 });
    }

    const settings = mergeUserSettings(settingsRecord?.settings || {});
    const linkedPatientId = settings.workflow.linkedPatientId;
    const patientRecords = await db.query.patients.findMany({
      where: and(eq(patients.tenantId, tenantId), isNull(patients.deletedAt)),
    });

    const patient =
      patientRecordById ||
      (linkedPatientId ? patientRecords.find((record) => record.id === linkedPatientId) : null) ||
      patientRecords.find((record) => normalize(record.email) === normalize(appUser?.email)) ||
      patientRecords.find((record) => normalize(record.phone) === normalize(appUser?.phone)) ||
      patientRecords.find((record) => normalize(record.fullName || `${record.firstName || ""} ${record.lastName || ""}`) === normalize(appUser?.fullName)) ||
      null;

    const patientRecordId = patient?.id || null;

    const [allergies, conditions, policies, visitRows, appointmentRows] = patientRecordId
      ? await Promise.all([
          db.select().from(patientAllergies).where(eq(patientAllergies.patientId, patientRecordId)).catch(() => []),
          db.select().from(patientConditions).where(eq(patientConditions.patientId, patientRecordId)).catch(() => []),
          db.select().from(insurancePolicies).where(eq(insurancePolicies.patientId, patientRecordId)).catch(() => []),
          db.select().from(visits).where(eq(visits.patientId, patientRecordId)).orderBy(desc(visits.createdAt)).limit(10).catch(() => []),
          db.select().from(appointments).where(eq(appointments.patientId, patientRecordId)).orderBy(desc(appointments.scheduledAt)).limit(20).catch(() => []),
        ])
      : [[], [], [], [], []];

    const doctorIds = Array.from(new Set(appointmentRows.map((appointment) => appointment.doctorId).filter(Boolean))) as string[];
    const doctorRows = doctorIds.length
      ? await db
          .select({ id: users.id, fullName: users.fullName, email: users.email })
          .from(users)
          .where(inArray(users.id, doctorIds))
          .catch(() => [])
      : [];
    const doctorById = new Map(doctorRows.map((doctor) => [doctor.id, doctor.fullName || doctor.email]));

    const displayName = patient?.fullName || [patient?.firstName, patient?.lastName].filter(Boolean).join(" ").trim() || appUser?.fullName || appUser?.email || "Patient";
    const split = splitName(displayName);

    return NextResponse.json({
      patient: {
        id: appUser?.id || patientRecordId || id,
        userId: appUser?.id || null,
        patientRecordId,
        firstName: patient?.firstName || split.firstName,
        lastName: patient?.lastName || split.lastName,
        fullName: displayName,
        globalPatientId: patient?.globalPatientId || patient?.mrn || null,
        dob: patient?.dob || appUser?.dateOfBirth || null,
        gender: patient?.gender || null,
        phone: patient?.phone || appUser?.phone || null,
        email: patient?.email || appUser?.email || null,
        address: patient?.address || appUser?.address || null,
        status: appUser?.isActive === false ? "inactive" : "active",
        createdAt: appUser?.createdAt || patient?.createdAt || null,
        allergies: allergies.map((row) => row.allergy).filter(Boolean),
        conditions: conditions.map((row) => row.condition).filter(Boolean),
        insurancePolicies: policies.map((policy) => ({
          id: policy.id,
          provider: policy.provider || "Unknown provider",
          policyNumber: policy.policyNumber || "Not recorded",
        })),
        recentVisits: visitRows.map((visit) => ({
          id: visit.id,
          reason: visit.reason || "Visit",
          notes: visit.notes || "",
          createdAt: visit.createdAt,
        })),
      },
      appointments: appointmentRows.map((appointment) => ({
        id: appointment.id,
        doctorName: appointment.doctorId ? doctorById.get(appointment.doctorId) || "Unassigned clinician" : "Unassigned clinician",
        department: "General",
        scheduledAt: appointment.scheduledAt,
        time: appointment.scheduledAt ? appointment.scheduledAt.toLocaleString() : "Not scheduled",
        status: appointment.status || "scheduled",
        type: "Appointment",
      })),
      metrics: {
        appointments: appointmentRows.length,
        visits: visitRows.length,
        allergies: allergies.length,
        insurance: policies.length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch patient user details:", error);
    return NextResponse.json({ error: "Failed to fetch patient" }, { status: 500 });
  }
}
