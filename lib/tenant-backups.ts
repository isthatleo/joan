import crypto from "crypto";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { uploadTenantObjectToStorageProviders } from "@/lib/integrations/runtime";
import {
  accountsPayable,
  accountantReports,
  accountantReportTemplates,
  aiLogs,
  appointments,
  auditLogs,
  bedAssignments,
  branches,
  budgets,
  carePlans,
  carePlanTasks,
  claims,
  departments,
  diagnoses,
  doctorSettings,
  emailSendLog,
  expenses,
  feedbacks,
  guardianPatients,
  guardians,
  insurancePolicies,
  integrations,
  inventoryItems,
  invoiceItems,
  invoices,
  journalEntries,
  labOrders,
  labResults,
  medicationAdministrations,
  messageCallSessions,
  messages,
  messagePresence,
  messageTypingStates,
  notifications,
  otps,
  passwordResets,
  patientAllergies,
  patientConditions,
  patients,
  payments,
  prescriptions,
  prescriptionItems,
  provisioningRuns,
  queues,
  rolePermissions,
  roles,
  scheduledAccountantReports,
  systemAlerts,
  systemConfigurations,
  systemMetrics,
  taxRecords,
  tenantSettings,
  tenants,
  userOverrides,
  userRoles,
  users,
  userSettings,
  visits,
  vitals,
} from "@/lib/db/schema";

const BACKUP_HISTORY_KEY = "tenantDataBackups";
const MAX_STORED_BACKUPS = 3;

type SnapshotTable = {
  rows: unknown[];
  count: number;
  error?: string;
};

type BackupSnapshot = {
  id: string;
  formatVersion: 1;
  tenantId: string;
  createdAt: string;
  createdBy: string | null;
  source: "tenant-workflow-backup";
  security: {
    containsProtectedHealthInformation: true;
    containsCredentialHashes: true;
    note: string;
  };
  tables: Record<string, SnapshotTable>;
  tableCounts: Record<string, number>;
  totalRows: number;
  files: {
    references: Array<{ table: string; rowId?: string | null; field: string; url: string }>;
    count: number;
    note: string;
  };
  storageDeliveries: Array<{ ok: boolean; provider: string; data?: unknown; error?: string }>;
};

function ids(rows: Array<{ id?: string | null }>) {
  return rows.map((row) => row.id).filter((value): value is string => Boolean(value));
}

function isLikelyFileField(key: string) {
  return /(avatar|logo|favicon|file|url|receipt|download|document|image|photo|attachment)/i.test(key);
}

function collectFileReferences(tables: Record<string, SnapshotTable>) {
  const references: Array<{ table: string; rowId?: string | null; field: string; url: string }> = [];
  for (const [table, payload] of Object.entries(tables)) {
    for (const row of payload.rows as Array<Record<string, any>>) {
      for (const [field, value] of Object.entries(row || {})) {
        if (!isLikelyFileField(field)) continue;
        if (typeof value === "string" && /^(https?:\/\/|data:|\/uploads\/|\/storage\/)/i.test(value)) {
          references.push({ table, rowId: typeof row.id === "string" ? row.id : null, field, url: value });
        }
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            const url = typeof item === "string" ? item : typeof item?.url === "string" ? item.url : typeof item?.fileUrl === "string" ? item.fileUrl : "";
            if (/^(https?:\/\/|data:|\/uploads\/|\/storage\/)/i.test(url)) {
              references.push({ table, rowId: typeof row.id === "string" ? row.id : null, field: `${field}[${index}]`, url });
            }
          });
        }
      }
    }
  }
  return references;
}

async function selectTenantRows(label: string, table: any, tenantId: string): Promise<[string, SnapshotTable]> {
  try {
    const rows = await db.select().from(table).where(eq(table.tenantId, tenantId));
    return [label, { rows, count: rows.length }];
  } catch (error: any) {
    return [label, { rows: [], count: 0, error: error?.message || "Failed to snapshot table" }];
  }
}

async function selectByIds(label: string, table: any, column: any, values: string[]): Promise<[string, SnapshotTable]> {
  if (values.length === 0) return [label, { rows: [], count: 0 }];
  try {
    const rows = await db.select().from(table).where(inArray(column, values));
    return [label, { rows, count: rows.length }];
  } catch (error: any) {
    return [label, { rows: [], count: 0, error: error?.message || "Failed to snapshot table" }];
  }
}

async function selectTenantSettingsRows(tenantId: string): Promise<[string, SnapshotTable]> {
  try {
    const rows = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, tenantId));
    const filteredRows = rows.filter((row) => row.key !== BACKUP_HISTORY_KEY);
    return ["tenantSettings", { rows: filteredRows, count: filteredRows.length }];
  } catch (error: any) {
    return ["tenantSettings", { rows: [], count: 0, error: error?.message || "Failed to snapshot table" }];
  }
}

async function upsertBackupHistory(tenantId: string, snapshot: BackupSnapshot, createdBy?: string | null) {
  const existing = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, BACKUP_HISTORY_KEY)),
  });
  const value = (existing?.value as { backups?: BackupSnapshot[] } | undefined) || { backups: [] };
  const backups = [snapshot, ...(Array.isArray(value.backups) ? value.backups : [])].slice(0, MAX_STORED_BACKUPS);

  if (existing) {
    await db.update(tenantSettings)
      .set({ value: { backups }, updatedAt: new Date(), updatedBy: createdBy || null })
      .where(eq(tenantSettings.id, existing.id));
    return;
  }

  await db.insert(tenantSettings).values({
    tenantId,
    key: BACKUP_HISTORY_KEY,
    value: { backups },
    updatedBy: createdBy || null,
  });
}

export async function createTenantBackupSnapshot(tenantId: string, createdBy?: string | null) {
  const tenantRows = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  const tenantUsers = await db.select().from(users).where(eq(users.tenantId, tenantId));
  const tenantPatients = await db.select().from(patients).where(eq(patients.tenantId, tenantId));
  const tenantRoles = await db.select().from(roles).where(eq(roles.tenantId, tenantId));
  const tenantVisits = await db.select().from(visits).where(eq(visits.tenantId, tenantId));
  const tenantPrescriptions = await db.select().from(prescriptions).where(eq(prescriptions.tenantId, tenantId));
  const tenantCarePlans = await db.select().from(carePlans).where(eq(carePlans.tenantId, tenantId));
  const tenantInvoices = await db.select().from(invoices).where(eq(invoices.tenantId, tenantId));
  const tenantGuardians = await db.select().from(guardians).where(eq(guardians.tenantId, tenantId));

  const userIds = ids(tenantUsers);
  const patientIds = ids(tenantPatients);
  const roleIds = ids(tenantRoles);
  const visitIds = ids(tenantVisits);
  const prescriptionIds = ids(tenantPrescriptions);
  const carePlanIds = ids(tenantCarePlans);
  const invoiceIds = ids(tenantInvoices);
  const guardianIds = ids(tenantGuardians);

  const tableEntries: Array<[string, SnapshotTable]> = [
    ["tenants", { rows: tenantRows, count: tenantRows.length }],
    ["users", { rows: tenantUsers, count: tenantUsers.length }],
    ["patients", { rows: tenantPatients, count: tenantPatients.length }],
    ["roles", { rows: tenantRoles, count: tenantRoles.length }],
    ["visits", { rows: tenantVisits, count: tenantVisits.length }],
    ["prescriptions", { rows: tenantPrescriptions, count: tenantPrescriptions.length }],
    ["carePlans", { rows: tenantCarePlans, count: tenantCarePlans.length }],
    ["invoices", { rows: tenantInvoices, count: tenantInvoices.length }],
    ["guardians", { rows: tenantGuardians, count: tenantGuardians.length }],
    ...(await Promise.all([
      selectTenantRows("branches", branches, tenantId),
      selectTenantRows("departments", departments, tenantId),
      selectTenantRows("appointments", appointments, tenantId),
      selectTenantRows("queues", queues, tenantId),
      selectTenantRows("medicationAdministrations", medicationAdministrations, tenantId),
      selectTenantRows("bedAssignments", bedAssignments, tenantId),
      selectTenantRows("inventoryItems", inventoryItems, tenantId),
      selectTenantRows("labOrders", labOrders, tenantId),
      selectTenantRows("labResults", labResults, tenantId),
      selectTenantRows("payments", payments, tenantId),
      selectTenantRows("insurancePolicies", insurancePolicies, tenantId),
      selectTenantRows("claims", claims, tenantId),
      selectTenantRows("messagePresence", messagePresence, tenantId),
      selectTenantRows("messageTypingStates", messageTypingStates, tenantId),
      selectTenantRows("messageCallSessions", messageCallSessions, tenantId),
      selectTenantRows("notifications", notifications, tenantId),
      selectTenantRows("feedbacks", feedbacks, tenantId),
      selectTenantRows("auditLogs", auditLogs, tenantId),
      selectTenantRows("aiLogs", aiLogs, tenantId),
      selectTenantRows("provisioningRuns", provisioningRuns, tenantId),
      selectTenantRows("otps", otps, tenantId),
      selectTenantRows("passwordResets", passwordResets, tenantId),
      selectTenantSettingsRows(tenantId),
      selectTenantRows("integrations", integrations, tenantId),
      selectTenantRows("systemMetrics", systemMetrics, tenantId),
      selectTenantRows("systemAlerts", systemAlerts, tenantId),
      selectTenantRows("systemConfigurations", systemConfigurations, tenantId),
      selectTenantRows("expenses", expenses, tenantId),
      selectTenantRows("accountsPayable", accountsPayable, tenantId),
      selectTenantRows("budgets", budgets, tenantId),
      selectTenantRows("journalEntries", journalEntries, tenantId),
      selectTenantRows("taxRecords", taxRecords, tenantId),
      selectTenantRows("emailSendLog", emailSendLog, tenantId),
      selectTenantRows("accountantReportTemplates", accountantReportTemplates, tenantId),
      selectTenantRows("accountantReports", accountantReports, tenantId),
      selectTenantRows("scheduledAccountantReports", scheduledAccountantReports, tenantId),
      selectByIds("userSettings", userSettings, userSettings.userId, userIds),
      selectByIds("doctorSettings", doctorSettings, doctorSettings.userId, userIds),
      selectByIds("userRoles", userRoles, userRoles.userId, userIds),
      selectByIds("userOverrides", userOverrides, userOverrides.userId, userIds),
      selectByIds("rolePermissions", rolePermissions, rolePermissions.roleId, roleIds),
      selectByIds("patientAllergies", patientAllergies, patientAllergies.patientId, patientIds),
      selectByIds("patientConditions", patientConditions, patientConditions.patientId, patientIds),
      selectByIds("diagnoses", diagnoses, diagnoses.visitId, visitIds),
      selectByIds("vitals", vitals, vitals.visitId, visitIds),
      selectByIds("prescriptionItems", prescriptionItems, prescriptionItems.prescriptionId, prescriptionIds),
      selectByIds("carePlanTasks", carePlanTasks, carePlanTasks.carePlanId, carePlanIds),
      selectByIds("invoiceItems", invoiceItems, invoiceItems.invoiceId, invoiceIds),
      selectByIds("guardianPatients", guardianPatients, guardianPatients.guardianId, guardianIds),
    ])),
  ];

  const messageScopes = [
    userIds.length ? inArray(messages.senderId, userIds) : null,
    userIds.length ? inArray(messages.receiverId, userIds) : null,
    patientIds.length ? inArray(messages.patientId, patientIds) : null,
  ].filter(Boolean) as any[];
  const tenantMessages = messageScopes.length
    ? await db.select().from(messages).where(or(...messageScopes))
    : [];
  tableEntries.push(["messages", { rows: tenantMessages, count: tenantMessages.length }]);

  const tables = Object.fromEntries(tableEntries);
  const tableCounts = Object.fromEntries(Object.entries(tables).map(([key, value]) => [key, value.count]));
  const totalRows = Object.values(tableCounts).reduce((sum, count) => sum + count, 0);
  const fileReferences = collectFileReferences(tables);
  const snapshot: BackupSnapshot = {
    id: crypto.randomUUID(),
    formatVersion: 1,
    tenantId,
    createdAt: new Date().toISOString(),
    createdBy: createdBy || null,
    source: "tenant-workflow-backup",
    security: {
      containsProtectedHealthInformation: true,
      containsCredentialHashes: true,
      note: "This backup is tenant-scoped and contains sensitive clinical, billing, operational, and authentication-adjacent records. Store and transmit it only through approved secure channels.",
    },
    tables,
    tableCounts,
    totalRows,
    files: {
      references: fileReferences,
      count: fileReferences.length,
      note: "File-backed records are included in the data snapshot and indexed here so restore/import tooling can rehydrate objects from the tenant storage provider.",
    },
    storageDeliveries: [],
  };

  const storageKey = `tenant-backups/${tenantRows[0]?.slug || tenantId}/${snapshot.createdAt.slice(0, 10)}/${snapshot.id}.json`;
  const storageDeliveries = await uploadTenantObjectToStorageProviders(tenantRows[0]?.slug || tenantId, {
    key: storageKey,
    content: JSON.stringify(snapshot, null, 2),
    contentType: "application/json",
    metadata: {
      tenantId,
      backupId: snapshot.id,
      createdAt: snapshot.createdAt,
      rows: String(snapshot.totalRows),
      files: String(snapshot.files.count),
    },
  });
  snapshot.storageDeliveries = storageDeliveries;

  await upsertBackupHistory(tenantId, snapshot, createdBy);

  return {
    backup: snapshot,
    manifest: {
      id: snapshot.id,
      createdAt: snapshot.createdAt,
      tableCounts: snapshot.tableCounts,
      totalRows: snapshot.totalRows,
      tables: Object.keys(snapshot.tables).length,
      fileReferences: snapshot.files.count,
      storageDeliveries: snapshot.storageDeliveries.map((delivery) => ({
        ok: delivery.ok,
        provider: delivery.provider,
        error: delivery.error,
        data: delivery.data,
      })),
      storedBackupsRetained: MAX_STORED_BACKUPS,
    },
  };
}
