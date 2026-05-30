import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import { appointments, patients, roles, userRoles, users, userSettings, visits } from "@/lib/db/schema";
import { mergeUserSettings } from "@/lib/user-settings";

type PatientUserRow = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  isActive: boolean | null;
  createdAt: Date;
  baseRole: string | null;
  linkedRole: string | null;
  settings: unknown;
};

function normalize(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function hasPatientRole(row: PatientUserRow) {
  return [row.baseRole, row.linkedRole].some((role) => normalize(role) === "patient");
}

function patientRoleWhereClause() {
  return sql`(
    exists (
      select 1
      from user_roles patient_user_roles
      inner join roles patient_roles on patient_roles.id = patient_user_roles.role_id
      where patient_user_roles.user_id = ${users.id}
        and lower(trim(patient_roles.name)) = 'patient'
    )
    or (
      not exists (
        select 1
        from user_roles assigned_user_roles
        where assigned_user_roles.user_id = ${users.id}
      )
      and lower(trim(${users.role})) = 'patient'
    )
  )`;
}

function splitName(fullName?: string | null) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function patientDisplayName(patient: typeof patients.$inferSelect | undefined, user: PatientUserRow) {
  const fromPatient = patient?.fullName || [patient?.firstName, patient?.lastName].filter(Boolean).join(" ").trim();
  return fromPatient || user.fullName || user.email;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        isActive: users.isActive,
        createdAt: users.createdAt,
        baseRole: users.role,
        linkedRole: roles.name,
        settings: userSettings.settings,
      })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .leftJoin(roles, eq(roles.id, userRoles.roleId))
      .leftJoin(userSettings, eq(userSettings.userId, users.id))
      .where(and(
        eq(users.tenantId, tenantId),
        isNull(users.deletedAt),
        patientRoleWhereClause(),
      ))
      .orderBy(asc(users.fullName), asc(users.email));

    const patientUsersById = new Map<string, PatientUserRow>();
    for (const row of userRows) {
      if (!hasPatientRole(row)) continue;
      const existing = patientUsersById.get(row.id);
      if (!existing || normalize(row.linkedRole) === "patient") {
        patientUsersById.set(row.id, row);
      }
    }

    const patientUsers = Array.from(patientUsersById.values());
    if (!patientUsers.length) {
      return NextResponse.json({
        patients: [],
        stats: { total: 0, active: 0, inactive: 0, newThisMonth: 0, withPatientRecord: 0 },
      });
    }

    const patientRecords = await db.query.patients.findMany({
      where: and(eq(patients.tenantId, tenantId), isNull(patients.deletedAt)),
      orderBy: [asc(patients.firstName), asc(patients.lastName)],
    });

    const patientById = new Map(patientRecords.map((patient) => [patient.id, patient]));
    const patientByEmail = new Map<string, typeof patientRecords[number]>();
    const patientByPhone = new Map<string, typeof patientRecords[number]>();
    const patientByName = new Map<string, typeof patientRecords[number]>();

    for (const patient of patientRecords) {
      const email = normalize(patient.email);
      const phone = normalize(patient.phone);
      const name = normalize(patient.fullName || `${patient.firstName || ""} ${patient.lastName || ""}`);
      if (email && !patientByEmail.has(email)) patientByEmail.set(email, patient);
      if (phone && !patientByPhone.has(phone)) patientByPhone.set(phone, patient);
      if (name && !patientByName.has(name)) patientByName.set(name, patient);
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const matchedPatientsByUserId = new Map<string, typeof patientRecords[number]>();
    for (const user of patientUsers) {
      const settings = mergeUserSettings(user.settings);
      const linkedPatientId = settings.workflow.linkedPatientId;
      const patient =
        (linkedPatientId && patientById.get(linkedPatientId)) ||
        patientByEmail.get(normalize(user.email)) ||
        patientByPhone.get(normalize(user.phone)) ||
        patientByName.get(normalize(user.fullName));

      if (patient) matchedPatientsByUserId.set(user.id, patient);
    }

    const patientRecordIds = Array.from(
      new Set(Array.from(matchedPatientsByUserId.values()).map((patient) => patient.id).filter(Boolean)),
    );

    const [appointmentStats, visitStats] = patientRecordIds.length
      ? await Promise.all([
          db
            .select({
              patientId: appointments.patientId,
              count: sql<number>`count(*)::int`,
            })
            .from(appointments)
            .where(and(eq(appointments.tenantId, tenantId), inArray(appointments.patientId, patientRecordIds)))
            .groupBy(appointments.patientId)
            .catch(() => []),
          db
            .select({
              patientId: visits.patientId,
              count: sql<number>`count(*)::int`,
              lastVisitAt: sql<Date | null>`max(${visits.createdAt})`,
            })
            .from(visits)
            .where(and(eq(visits.tenantId, tenantId), inArray(visits.patientId, patientRecordIds)))
            .groupBy(visits.patientId)
            .catch(() => []),
        ])
      : [[], []];

    const appointmentCountByPatientId = new Map(appointmentStats.map((row) => [row.patientId, Number(row.count) || 0]));
    const visitStatsByPatientId = new Map(visitStats.map((row) => [row.patientId, row]));

    const rows = patientUsers.map((user) => {
      const patient = matchedPatientsByUserId.get(user.id);
      const patientRecordId = patient?.id || null;
      const visitSummary = patientRecordId ? visitStatsByPatientId.get(patientRecordId) : null;

      const fullName = patientDisplayName(patient, user);
      const split = splitName(fullName);

      return {
        id: user.id,
        userId: user.id,
        patientRecordId,
        firstName: patient?.firstName || split.firstName,
        lastName: patient?.lastName || split.lastName,
        fullName,
        email: patient?.email || user.email || "",
        phone: patient?.phone || user.phone || "",
        dob: patient?.dob || null,
        gender: patient?.gender || "",
        address: patient?.address || "",
        mrn: patient?.globalPatientId || patient?.mrn || null,
        medicalRecordNumber: patient?.globalPatientId || patient?.mrn || null,
        role: "patient",
        roles: Array.from(new Set([user.baseRole, user.linkedRole].filter(Boolean).map((role) => normalize(role)))),
        status: user.isActive ? "active" : "inactive",
        isActive: Boolean(user.isActive),
        appointmentCount: patientRecordId ? appointmentCountByPatientId.get(patientRecordId) || 0 : 0,
        visitCount: Number(visitSummary?.count) || 0,
        lastVisitAt: visitSummary?.lastVisitAt || null,
        createdAt: user.createdAt,
        updatedAt: patient?.updatedAt || user.createdAt,
      };
    });

    const stats = {
      total: rows.length,
      active: rows.filter((row) => row.isActive).length,
      inactive: rows.filter((row) => !row.isActive).length,
      newThisMonth: rows.filter((row) => new Date(row.createdAt) >= monthStart).length,
      withPatientRecord: rows.filter((row) => row.patientRecordId).length,
    };

    return NextResponse.json({ patients: rows, stats });
  } catch (error) {
    console.error("Failed to fetch tenant patient users:", error);
    return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 });
  }
}
