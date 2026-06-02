import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { medicationAdministrations, notifications, roles, userRoles, users } from "@/lib/db/schema";

const NURSE_ADMIN_ROUTES = new Set([
  "iv",
  "intravenous",
  "intravenous infusion",
  "infusion",
  "injection",
  "injectable",
  "im",
  "intramuscular",
  "sc",
  "sq",
  "subcutaneous",
  "intradermal",
  "id",
]);

const TAKE_HOME_ROUTES = new Set([
  "oral",
  "po",
  "tablet",
  "capsule",
  "liquid",
  "syrup",
  "topical",
  "inhaled",
  "inhalation",
  "sublingual",
  "rectal",
]);

const TERMINAL_ADMINISTRATION_STATUSES = new Set(["administered", "skipped", "missed", "cancelled", "reaction"]);
const CLOSED_PRESCRIPTION_STATUSES = new Set(["completed", "discontinued", "cancelled", "canceled"]);

export function normalizeMedicationRoute(route?: string | null) {
  return String(route || "")
    .trim()
    .toLowerCase()
    .replace(/[./_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function isNurseAdministrationRoute(route?: string | null) {
  const normalized = normalizeMedicationRoute(route);
  return NURSE_ADMIN_ROUTES.has(normalized);
}

export function isTakeHomeRoute(route?: string | null) {
  const normalized = normalizeMedicationRoute(route);
  return !normalized || TAKE_HOME_ROUTES.has(normalized) || !isNurseAdministrationRoute(normalized);
}

export function isPrescriptionClosed(status?: string | null) {
  return CLOSED_PRESCRIPTION_STATUSES.has(String(status || "").trim().toLowerCase());
}

export function isTerminalAdministrationStatus(status?: string | null) {
  return TERMINAL_ADMINISTRATION_STATUSES.has(String(status || "").trim().toLowerCase());
}

export function administrationDoseCount(quantity?: number | null) {
  const parsed = Math.floor(Number(quantity || 1));
  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : 1, 1), 60);
}

function intervalHoursFromFrequency(frequency?: string | null) {
  const value = String(frequency || "").toLowerCase();
  const qMatch = value.match(/q\s*(\d{1,2})\s*h/);
  if (qMatch) return Math.max(1, Number(qMatch[1]));
  if (value.includes("twice") || value.includes("bid")) return 12;
  if (value.includes("three") || value.includes("tid")) return 8;
  if (value.includes("four") || value.includes("qid")) return 6;
  if (value.includes("weekly")) return 168;
  if (value.includes("daily") || value.includes("once")) return 24;
  return 8;
}

export function scheduledDoseAt(baseDate: Date, index: number, frequency?: string | null) {
  const next = new Date(baseDate);
  next.setHours(next.getHours() + intervalHoursFromFrequency(frequency) * index);
  return next;
}

export async function notifyMedicationRoleUsers({
  tenantId,
  roleNames,
  type,
  title,
  message,
  metadata,
}: {
  tenantId: string;
  roleNames: string[];
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
}) {
  const wantedRoles = expandRoleNames(roleNames);
  const activeUsers = await db
    .select({
      id: users.id,
      baseRole: users.role,
      linkedRole: roles.name,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true), isNull(users.deletedAt)));

  const recipients = Array.from(
    new Set(
      activeUsers
        .filter((user) => [user.baseRole, user.linkedRole].some((role) => wantedRoles.has(normalizeRoleName(role))))
        .map((user) => user.id)
    )
  );

  if (!recipients.length) return;

  await db.insert(notifications).values(
    recipients.map((userId) => ({
      tenantId,
      userId,
      type,
      title,
      message,
      metadata,
      read: false,
    }))
  );
}

export async function createMedicationAdministrationRecords({
  tenantId,
  prescriptionId,
  patientId,
  items,
  startAt = new Date(),
}: {
  tenantId: string;
  prescriptionId: string;
  patientId: string;
  items: Array<{
    id: string;
    drugName?: string | null;
    quantity?: number | null;
    frequency?: string | null;
    route?: string | null;
  }>;
  startAt?: Date;
}) {
  const rows = items.flatMap((item) => {
    if (!isNurseAdministrationRoute(item.route)) return [];
    const totalDoses = administrationDoseCount(item.quantity);
    return Array.from({ length: totalDoses }).map((_, index) => ({
      tenantId,
      prescriptionId,
      prescriptionItemId: item.id,
      patientId,
      scheduledAt: scheduledDoseAt(startAt, index, item.frequency),
      status: "pending",
      notes: `Dose ${index + 1} of ${totalDoses}${item.drugName ? ` for ${item.drugName}` : ""}`,
    }));
  });

  if (!rows.length) return 0;
  await db.insert(medicationAdministrations).values(rows);
  return rows.length;
}

export async function cancelPendingMedicationAdministrations(tenantId: string, prescriptionId: string, notes: string) {
  await db
    .update(medicationAdministrations)
    .set({ status: "cancelled", notes, updatedAt: new Date() })
    .where(
      and(
        eq(medicationAdministrations.tenantId, tenantId),
        eq(medicationAdministrations.prescriptionId, prescriptionId),
        eq(medicationAdministrations.status, "pending"),
        isNull(medicationAdministrations.deletedAt)
      )
    );
}

function normalizeRoleName(role?: string | null) {
  return String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function expandRoleNames(roleNames: string[]) {
  const normalized = roleNames.map(normalizeRoleName);
  const expanded = new Set(normalized);
  if (normalized.some((role) => ["nurse", "nursing"].includes(role))) {
    expanded.add("nursing_staff");
    expanded.add("registered_nurse");
  }
  if (normalized.some((role) => ["pharmacist", "pharmacy"].includes(role))) {
    expanded.add("pharmacy_staff");
  }
  return expanded;
}
