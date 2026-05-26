import { and, eq, ilike, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { patients, roles, tenants, userRoles, users, userSettings } from "@/lib/db/schema";
import { mergeUserSettings } from "@/lib/user-settings";

type PatientEligibleUserRow = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  baseRole: string | null;
  linkedRole: string | null;
  settings: unknown;
};

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function hasPatientRole(row: PatientEligibleUserRow) {
  return [row.baseRole, row.linkedRole].some((value) => normalizeText(value) === "patient");
}

export async function getEligiblePatientIdsForTenant(tenantId: string) {
  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      baseRole: users.role,
      linkedRole: roles.name,
      settings: userSettings.settings,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true), isNull(users.deletedAt)));

  const eligibleUsers = userRows.filter(hasPatientRole);
  if (!eligibleUsers.length) return [] as string[];

  const tenantPatients = await db.query.patients.findMany({
    where: and(eq(patients.tenantId, tenantId), isNull(patients.deletedAt)),
    columns: {
      id: true,
      fullName: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  });

  const patientById = new Map(tenantPatients.map((patient) => [patient.id, patient.id]));
  const patientByEmail = new Map<string, string>();
  const patientByPhone = new Map<string, string>();
  const patientByName = new Map<string, string>();

  for (const patient of tenantPatients) {
    const email = normalizeText(patient.email);
    const phone = normalizeText(patient.phone);
    const name = normalizeText(patient.fullName || `${patient.firstName || ""} ${patient.lastName || ""}`);
    if (email && !patientByEmail.has(email)) patientByEmail.set(email, patient.id);
    if (phone && !patientByPhone.has(phone)) patientByPhone.set(phone, patient.id);
    if (name && !patientByName.has(name)) patientByName.set(name, patient.id);
  }

  const eligibleIds = new Set<string>();
  for (const user of eligibleUsers) {
    const settings = mergeUserSettings(user.settings);
    const linkedPatientId = settings.workflow.linkedPatientId;
    if (linkedPatientId && patientById.has(linkedPatientId)) {
      eligibleIds.add(linkedPatientId);
      continue;
    }

    const emailMatch = patientByEmail.get(normalizeText(user.email));
    if (emailMatch) {
      eligibleIds.add(emailMatch);
      continue;
    }

    const phoneMatch = patientByPhone.get(normalizeText(user.phone));
    if (phoneMatch) {
      eligibleIds.add(phoneMatch);
      continue;
    }

    const nameMatch = patientByName.get(normalizeText(user.fullName));
    if (nameMatch) {
      eligibleIds.add(nameMatch);
    }
  }

  return Array.from(eligibleIds);
}

export async function getEligiblePatientRowsForTenant(tenantId: string) {
  const patientIds = await getEligiblePatientIdsForTenant(tenantId);
  if (!patientIds.length) return [] as Array<typeof patients.$inferSelect>;

  return db.query.patients.findMany({
    where: and(eq(patients.tenantId, tenantId), inArray(patients.id, patientIds), isNull(patients.deletedAt)),
  });
}

export async function getTenantIdBySlugForPatients(slug: string) {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug.toLowerCase()),
    columns: { id: true },
  });
  return tenant?.id || null;
}
