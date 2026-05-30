import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { db } from "@/lib/db";
import {
  appointments,
  diagnoses,
  feedbacks,
  patientConditions,
  patients,
  queues,
  roles,
  userRoles,
  users,
  userSettings,
  visits,
} from "@/lib/db/schema";
import { mergeUserSettings } from "@/lib/user-settings";

type TimeRange = "7d" | "30d" | "90d" | "1y";

type PatientUserRow = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
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

function getRangeStart(timeRange: TimeRange, now = new Date()) {
  const start = new Date(now);
  if (timeRange === "7d") start.setDate(now.getDate() - 7);
  if (timeRange === "30d") start.setDate(now.getDate() - 30);
  if (timeRange === "90d") start.setDate(now.getDate() - 90);
  if (timeRange === "1y") start.setFullYear(now.getFullYear() - 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en", { month: "short", year: "numeric" });
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function ageFromDate(value?: Date | string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const timeRange = (request.nextUrl.searchParams.get("timeRange") || "30d") as TimeRange;
    const safeTimeRange: TimeRange = ["7d", "30d", "90d", "1y"].includes(timeRange) ? timeRange : "30d";
    const tenantId = await getTenantIdBySlug(slug);

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const now = new Date();
    const startDate = getRangeStart(safeTimeRange, now);
    const previousStart = new Date(startDate);
    previousStart.setTime(startDate.getTime() - (now.getTime() - startDate.getTime()));

    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        dateOfBirth: users.dateOfBirth,
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
      .where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt), patientRoleWhereClause()))
      .orderBy(asc(users.createdAt));

    const assignedRolesByUserId = new Map<string, string[]>();
    for (const row of userRows) {
      const roleName = normalize(row.linkedRole);
      if (!roleName) continue;
      const existing = assignedRolesByUserId.get(row.id) || [];
      existing.push(roleName);
      assignedRolesByUserId.set(row.id, existing);
    }

    const patientUsersById = new Map<string, PatientUserRow>();
    for (const row of userRows) {
      const assignedRoleNames = assignedRolesByUserId.get(row.id) || [];
      const hasAssignedRoles = assignedRoleNames.length > 0;
      const isPatient = hasAssignedRoles ? assignedRoleNames.includes("patient") : hasPatientRole(row);
      if (!isPatient) continue;
      const existing = patientUsersById.get(row.id);
      if (!existing || normalize(row.linkedRole) === "patient") patientUsersById.set(row.id, row);
    }

    const patientUsers = Array.from(patientUsersById.values());
    const patientRecords = await db.query.patients.findMany({
      where: and(eq(patients.tenantId, tenantId), isNull(patients.deletedAt)),
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

    const patientRecordIds = Array.from(new Set(Array.from(matchedPatientsByUserId.values()).map((patient) => patient.id)));

    const [appointmentRows, visitRows, queueRows, conditionRows, diagnosisRows, feedbackRows] = await Promise.all([
      patientRecordIds.length
        ? db.query.appointments.findMany({
            where: and(eq(appointments.tenantId, tenantId), inArray(appointments.patientId, patientRecordIds)),
          }).catch(() => [])
        : Promise.resolve([]),
      patientRecordIds.length
        ? db.query.visits.findMany({
            where: and(eq(visits.tenantId, tenantId), inArray(visits.patientId, patientRecordIds)),
          }).catch(() => [])
        : Promise.resolve([]),
      patientRecordIds.length
        ? db.query.queues.findMany({
            where: and(eq(queues.tenantId, tenantId), inArray(queues.patientId, patientRecordIds)),
          }).catch(() => [])
        : Promise.resolve([]),
      patientRecordIds.length
        ? db.select().from(patientConditions).where(inArray(patientConditions.patientId, patientRecordIds)).catch(() => [])
        : Promise.resolve([]),
      patientRecordIds.length
        ? db
            .select({ description: diagnoses.description, code: diagnoses.code, patientId: visits.patientId })
            .from(diagnoses)
            .innerJoin(visits, eq(visits.id, diagnoses.visitId))
            .where(and(eq(visits.tenantId, tenantId), inArray(visits.patientId, patientRecordIds)))
            .catch(() => [])
        : Promise.resolve([]),
      db.query.feedbacks.findMany({
        where: and(eq(feedbacks.tenantId, tenantId), eq(feedbacks.patientFeedback, true)),
      }).catch(() => []),
    ]);

    const totalPatients = patientUsers.length;
    const activePatients = patientUsers.filter((user) => user.isActive).length;
    const newPatientsThisMonth = patientUsers.filter((user) => user.createdAt >= startDate && user.createdAt <= now).length;
    const previousNewPatients = patientUsers.filter((user) => user.createdAt >= previousStart && user.createdAt < startDate).length;
    const patientGrowth = previousNewPatients ? percent(newPatientsThisMonth - previousNewPatients, previousNewPatients) : (newPatientsThisMonth > 0 ? 100 : 0);

    const ages = patientUsers
      .map((user) => {
        const patient = matchedPatientsByUserId.get(user.id);
        return ageFromDate(patient?.dob || user.dateOfBirth);
      })
      .filter((age): age is number => typeof age === "number");

    const genderCounts = { male: 0, female: 0, other: 0 };
    for (const patient of matchedPatientsByUserId.values()) {
      const gender = normalize(patient.gender);
      if (gender.startsWith("m")) genderCounts.male += 1;
      else if (gender.startsWith("f")) genderCounts.female += 1;
      else genderCounts.other += 1;
    }

    const ageCounts = { "0-18": 0, "19-35": 0, "36-55": 0, "56+": 0 };
    for (const age of ages) {
      if (age <= 18) ageCounts["0-18"] += 1;
      else if (age <= 35) ageCounts["19-35"] += 1;
      else if (age <= 55) ageCounts["36-55"] += 1;
      else ageCounts["56+"] += 1;
    }

    const rangedAppointments = appointmentRows.filter((appointment) => {
      const scheduledAt = appointment.scheduledAt || appointment.createdAt;
      return scheduledAt && scheduledAt >= startDate && scheduledAt <= now;
    });
    const completedAppointments = rangedAppointments.filter((appointment) => normalize(appointment.status) === "completed").length;
    const noShowAppointments = rangedAppointments.filter((appointment) => ["no_show", "no-show", "missed"].includes(normalize(appointment.status))).length;

    const queueWaitTimes = queueRows
      .filter((queue) => queue.calledAt && queue.createdAt)
      .map((queue) => Math.max(0, Math.round(((queue.calledAt as Date).getTime() - queue.createdAt.getTime()) / 60000)));

    const visitsByPatient = new Map<string, Date[]>();
    for (const visit of visitRows) {
      if (!visit.patientId || !visit.createdAt) continue;
      const dates = visitsByPatient.get(visit.patientId) || [];
      dates.push(visit.createdAt);
      visitsByPatient.set(visit.patientId, dates);
    }

    let readmissionPatients = 0;
    for (const dates of visitsByPatient.values()) {
      const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
      if (sorted.some((date, index) => index > 0 && date.getTime() - sorted[index - 1].getTime() <= 30 * 24 * 60 * 60 * 1000)) {
        readmissionPatients += 1;
      }
    }

    const patientsWithConditions = new Set(conditionRows.map((row) => row.patientId).filter(Boolean));
    const resolvedFeedback = feedbackRows.filter((feedback) => ["resolved", "closed"].includes(normalize(feedback.status))).length;

    const trendKeys = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return monthKey(date);
    });

    const monthlyTrends = trendKeys.map((key) => {
      const [year, month] = key.split("-").map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 1);
      return {
        month: monthLabel(key),
        newPatients: patientUsers.filter((user) => user.createdAt >= monthStart && user.createdAt < monthEnd).length,
        totalPatients: patientUsers.filter((user) => user.createdAt < monthEnd).length,
        appointments: appointmentRows.filter((appointment) => {
          const scheduledAt = appointment.scheduledAt || appointment.createdAt;
          return scheduledAt && scheduledAt >= monthStart && scheduledAt < monthEnd;
        }).length,
      };
    });

    const topDiagnoses = Object.entries(
      [...conditionRows.map((row) => row.condition), ...diagnosisRows.map((row) => row.description || row.code)]
        .filter(Boolean)
        .reduce<Record<string, number>>((acc, label) => {
          const key = String(label);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));

    return NextResponse.json({
      generatedAt: now.toISOString(),
      timeRange: safeTimeRange,
      totalPatients,
      activePatients,
      newPatientsThisMonth,
      patientGrowth,
      avgAge: average(ages),
      genderDistribution: {
        male: percent(genderCounts.male, Math.max(1, matchedPatientsByUserId.size)),
        female: percent(genderCounts.female, Math.max(1, matchedPatientsByUserId.size)),
        other: percent(genderCounts.other, Math.max(1, matchedPatientsByUserId.size)),
      },
      ageGroups: {
        "0-18": percent(ageCounts["0-18"], Math.max(1, ages.length)),
        "19-35": percent(ageCounts["19-35"], Math.max(1, ages.length)),
        "36-55": percent(ageCounts["36-55"], Math.max(1, ages.length)),
        "56+": percent(ageCounts["56+"], Math.max(1, ages.length)),
      },
      appointmentStats: {
        totalAppointments: rangedAppointments.length,
        completedAppointments,
        noShowRate: percent(noShowAppointments, rangedAppointments.length),
        avgWaitTime: average(queueWaitTimes),
      },
      healthMetrics: {
        avgLengthOfStay: 0,
        readmissionRate: percent(readmissionPatients, visitsByPatient.size),
        patientSatisfaction: feedbackRows.length ? percent(resolvedFeedback, feedbackRows.length) : 0,
        chronicConditions: percent(patientsWithConditions.size, patientRecordIds.length),
      },
      careQuality: {
        excellentCare: feedbackRows.length ? percent(resolvedFeedback, feedbackRows.length) : 0,
        needsAttention: percent(feedbackRows.length - resolvedFeedback, Math.max(1, feedbackRows.length)),
        preventiveCare: 0,
        chronicManagement: percent(patientsWithConditions.size, patientRecordIds.length),
      },
      monthlyTrends,
      topDiagnoses,
    });
  } catch (error) {
    console.error("Error fetching patient analytics:", error);
    return NextResponse.json({ error: "Failed to fetch patient analytics" }, { status: 500 });
  }
}
