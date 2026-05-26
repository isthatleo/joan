
import { db } from "@/lib/db";
import {
  inventoryItems,
  notifications,
  patients,
  payments,
  prescriptionItems,
  prescriptions,
  tenantSettings,
  users,
} from "@/lib/db/schema";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getPatientBillingStatus, syncPatientCareInvoice } from "@/lib/billing/patient-ledger";
import { getEligiblePatientIdsForTenant } from "@/lib/patient-access";

export type SupplierRecord = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  address?: string | null;
  leadTimeDays?: number | null;
  rating?: number | null;
  active?: boolean;
  notes?: string | null;
  createdAt?: string;
};

export type InteractionRuleRecord = {
  id: string;
  medicationA: string;
  medicationB: string;
  severity: "minor" | "moderate" | "major" | "contraindicated";
  effect: string;
  recommendation: string;
  source?: string | null;
  active?: boolean;
  createdAt?: string;
};

type InventoryMetadata = {
  genericName?: string;
  category?: string;
  dosage?: string;
  minStock?: number;
  maxStock?: number;
  supplierId?: string | null;
  supplierName?: string | null;
  unitPrice?: number;
  batchNumber?: string | null;
  reorderLevel?: number;
  location?: string | null;
  notes?: string | null;
};

type AlertState = Record<string, { dismissedAt?: string; reorderRequestedAt?: string; note?: string }>;

type ReportRun = {
  id: string;
  template: string;
  format: string;
  generatedAt: string;
  generatedBy: string;
  title: string;
};

const INVENTORY_META_KEY = "pharmacy_inventory_metadata";
const SUPPLIERS_KEY = "pharmacy_suppliers";
const INTERACTIONS_KEY = "pharmacy_drug_interactions";
const ALERT_STATE_KEY = "pharmacy_alert_state";
const REPORT_RUNS_KEY = "pharmacy_report_runs";

const patientNameSql = sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`;
const doctorNameSql = sql<string>`coalesce(${users.fullName}, '')`;

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value ?? fallback);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function parseStock(value: string | null | undefined) {
  return toNumber(value, 0);
}

function normalizeName(value: string | null | undefined, fallback: string) {
  const trimmed = String(value || "").trim();
  return trimmed || fallback;
}

function statusFromInventory(stock: number, minStock: number, expiryDate: Date | null) {
  if (expiryDate && expiryDate.getTime() < Date.now()) return "expired";
  if (stock <= 0) return "out-of-stock";
  if (stock <= minStock) return "low-stock";
  return "in-stock";
}

export async function getTenantSettingValue<T>(tenantId: string, key: string, fallback: T): Promise<T> {
  const row = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)),
  });
  return (row?.value as T | undefined) ?? fallback;
}

export async function upsertTenantSettingValue<T>(tenantId: string, key: string, value: T, updatedBy?: string | null) {
  const existing = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)),
  });

  if (existing) {
    await db
      .update(tenantSettings)
      .set({ value, updatedAt: new Date(), updatedBy: updatedBy ?? null })
      .where(eq(tenantSettings.id, existing.id));
    return;
  }

  await db.insert(tenantSettings).values({
    tenantId,
    key,
    value,
    updatedBy: updatedBy ?? null,
  });
}

export async function getPharmacySettings(tenantId: string) {
  const [inventoryMetadata, suppliers, interactions, alertState, reportRuns] = await Promise.all([
    getTenantSettingValue<Record<string, InventoryMetadata>>(tenantId, INVENTORY_META_KEY, {}),
    getTenantSettingValue<SupplierRecord[]>(tenantId, SUPPLIERS_KEY, []),
    getTenantSettingValue<InteractionRuleRecord[]>(tenantId, INTERACTIONS_KEY, []),
    getTenantSettingValue<AlertState>(tenantId, ALERT_STATE_KEY, {}),
    getTenantSettingValue<ReportRun[]>(tenantId, REPORT_RUNS_KEY, []),
  ]);

  return { inventoryMetadata, suppliers, interactions, alertState, reportRuns };
}

export async function saveInventoryMetadata(tenantId: string, metadata: Record<string, InventoryMetadata>, updatedBy?: string | null) {
  await upsertTenantSettingValue(tenantId, INVENTORY_META_KEY, metadata, updatedBy);
}

export async function saveSuppliers(tenantId: string, suppliers: SupplierRecord[], updatedBy?: string | null) {
  await upsertTenantSettingValue(tenantId, SUPPLIERS_KEY, suppliers, updatedBy);
}

export async function saveInteractions(tenantId: string, interactions: InteractionRuleRecord[], updatedBy?: string | null) {
  await upsertTenantSettingValue(tenantId, INTERACTIONS_KEY, interactions, updatedBy);
}

export async function saveAlertState(tenantId: string, alertState: AlertState, updatedBy?: string | null) {
  await upsertTenantSettingValue(tenantId, ALERT_STATE_KEY, alertState, updatedBy);
}

export async function saveReportRuns(tenantId: string, reportRuns: ReportRun[], updatedBy?: string | null) {
  await upsertTenantSettingValue(tenantId, REPORT_RUNS_KEY, reportRuns, updatedBy);
}

export async function listPatientsForPharmacy(tenantId: string) {
  const patientIds = await getEligiblePatientIdsForTenant(tenantId);
  if (!patientIds.length) return [];

  const rows = await db
    .select({
      id: patients.id,
      fullName: patientNameSql,
      firstName: patients.firstName,
      lastName: patients.lastName,
      phone: patients.phone,
      email: patients.email,
      status: patients.status,
      mrn: patients.mrn,
    })
    .from(patients)
    .where(and(eq(patients.tenantId, tenantId), inArray(patients.id, patientIds), isNull(patients.deletedAt)))
    .orderBy(asc(patients.firstName), asc(patients.lastName));

  return rows.map((row) => ({
    id: row.id,
    fullName: normalizeName(row.fullName, `${row.firstName || ""} ${row.lastName || ""}`.trim() || "Patient"),
    phone: row.phone || null,
    email: row.email || null,
    status: row.status || "active",
    mrn: row.mrn || null,
  }));
}

export async function listDoctorsForPharmacy(tenantId: string) {
  const rows = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.role, "doctor"), isNull(users.deletedAt), eq(users.isActive, true)))
    .orderBy(asc(users.fullName));

  return rows.map((row) => ({ id: row.id, fullName: normalizeName(row.fullName, row.email), email: row.email }));
}

export async function listInventory(tenantId: string) {
  const [items, { inventoryMetadata, suppliers }] = await Promise.all([
    db.query.inventoryItems.findMany({
      where: and(eq(inventoryItems.tenantId, tenantId), isNull(inventoryItems.deletedAt)),
      orderBy: asc(inventoryItems.name),
    }),
    getPharmacySettings(tenantId),
  ]);

  const supplierMap = new Map(suppliers.map((supplier) => [supplier.id, supplier]));

  const records = items.map((item) => {
    const meta = inventoryMetadata[item.id] || {};
    const stock = parseStock(item.stock);
    const minStock = toNumber(meta.minStock, 10);
    const maxStock = Math.max(toNumber(meta.maxStock, stock || minStock * 3), minStock || 1);
    const supplier = meta.supplierId ? supplierMap.get(meta.supplierId)?.name || meta.supplierName : meta.supplierName;
    const status = statusFromInventory(stock, minStock, item.expiryDate ?? null);
    const daysToExpiry = item.expiryDate ? Math.ceil((item.expiryDate.getTime() - Date.now()) / 86400000) : null;

    return {
      id: item.id,
      name: normalizeName(item.name, "Medication"),
      genericName: normalizeName(meta.genericName, normalizeName(item.name, "Medication")),
      category: normalizeName(meta.category, "General"),
      dosage: normalizeName(meta.dosage, "Standard"),
      stock,
      minStock,
      maxStock,
      supplier: supplier || "Unassigned supplier",
      supplierId: meta.supplierId || null,
      unitPrice: toNumber(meta.unitPrice, 0),
      expiryDate: item.expiryDate?.toISOString() || null,
      batchNumber: meta.batchNumber || item.id.slice(0, 8).toUpperCase(),
      location: meta.location || "Main pharmacy store",
      notes: meta.notes || null,
      reorderLevel: Math.max(toNumber(meta.reorderLevel, minStock), minStock),
      status,
      daysToExpiry,
      updatedAt: item.updatedAt?.toISOString() || item.createdAt?.toISOString() || null,
    };
  });

  return {
    items: records,
    suppliers,
    stats: {
      total: records.length,
      lowStock: records.filter((item) => item.status === "low-stock").length,
      outOfStock: records.filter((item) => item.status === "out-of-stock").length,
      expired: records.filter((item) => item.status === "expired").length,
      inventoryValue: Number(records.reduce((sum, item) => sum + item.stock * item.unitPrice, 0).toFixed(2)),
    },
  };
}
export async function listPrescriptionRows(tenantId: string) {
  const rows = await db
    .select({
      id: prescriptions.id,
      tenantId: prescriptions.tenantId,
      patientId: prescriptions.patientId,
      patientName: patientNameSql,
      patientPhone: patients.phone,
      doctorId: prescriptions.doctorId,
      doctorName: doctorNameSql,
      medication: prescriptions.medication,
      genericName: prescriptions.genericName,
      strength: prescriptions.strength,
      dosage: prescriptions.dosage,
      frequency: prescriptions.frequency,
      duration: prescriptions.duration,
      quantity: prescriptions.quantity,
      refills: prescriptions.refills,
      refillsRemaining: prescriptions.refillsRemaining,
      instructions: prescriptions.instructions,
      status: prescriptions.status,
      priority: prescriptions.priority,
      isEmergency: prescriptions.isEmergency,
      notes: prescriptions.notes,
      diagnosis: prescriptions.diagnosis,
      prescribedBy: prescriptions.prescribedBy,
      prescribedAt: prescriptions.prescribedAt,
      filledAt: prescriptions.filledAt,
      validUntil: prescriptions.validUntil,
      createdAt: prescriptions.createdAt,
      updatedAt: prescriptions.updatedAt,
    })
    .from(prescriptions)
    .leftJoin(patients, eq(patients.id, prescriptions.patientId))
    .leftJoin(users, eq(users.id, prescriptions.doctorId))
    .where(and(eq(prescriptions.tenantId, tenantId), isNull(prescriptions.deletedAt)))
    .orderBy(desc(prescriptions.prescribedAt), desc(prescriptions.createdAt));

  if (!rows.length) return [];

  const itemRows = await db
    .select({
      id: prescriptionItems.id,
      prescriptionId: prescriptionItems.prescriptionId,
      medicationId: prescriptionItems.medicationId,
      drugName: prescriptionItems.drugName,
      genericName: prescriptionItems.genericName,
      strength: prescriptionItems.strength,
      dosage: prescriptionItems.dosage,
      frequency: prescriptionItems.frequency,
      duration: prescriptionItems.duration,
      quantity: prescriptionItems.quantity,
      instructions: prescriptionItems.instructions,
      refills: prescriptionItems.refills,
      route: prescriptionItems.route,
      isPrn: prescriptionItems.isPrn,
    })
    .from(prescriptionItems)
    .where(inArray(prescriptionItems.prescriptionId, rows.map((row) => row.id)));

  const itemsByPrescription = new Map<string, any[]>();
  for (const item of itemRows) {
    if (!item.prescriptionId) continue;
    const list = itemsByPrescription.get(item.prescriptionId) || [];
    list.push(item);
    itemsByPrescription.set(item.prescriptionId, list);
  }

  return rows.map((row) => {
    const items = itemsByPrescription.get(row.id) || [];
    const medications = items.length
      ? items.map((item) => ({
          medicationId: item.medicationId || item.id,
          name: normalizeName(item.drugName, row.medication || "Medication"),
          genericName: item.genericName || row.genericName || null,
          dosage: [item.strength, item.dosage].filter(Boolean).join(" ") || row.dosage || row.strength || "Standard",
          quantity: toNumber(item.quantity, row.quantity || 0),
          instructions: item.instructions || row.instructions || "",
          frequency: item.frequency || row.frequency || null,
          duration: item.duration || row.duration || null,
          refills: toNumber(item.refills, row.refills || 0),
          route: item.route || null,
          isPrn: Boolean(item.isPrn),
        }))
      : [
          {
            medicationId: row.id,
            name: normalizeName(row.medication, "Medication"),
            genericName: row.genericName || null,
            dosage: [row.strength, row.dosage].filter(Boolean).join(" ") || "Standard",
            quantity: toNumber(row.quantity, 0),
            instructions: row.instructions || "",
            frequency: row.frequency || null,
            duration: row.duration || null,
            refills: toNumber(row.refills, 0),
            route: null,
            isPrn: false,
          },
        ];

    return {
      id: row.id,
      tenantId: row.tenantId,
      patientId: row.patientId,
      patientName: normalizeName(row.patientName, "Unknown patient"),
      patientPhone: row.patientPhone || null,
      doctorId: row.doctorId || null,
      doctorName: normalizeName(row.doctorName, row.prescribedBy || "Unassigned doctor"),
      medications,
      status: normalizeName(row.status, "pending"),
      priority: row.isEmergency ? "urgent" : normalizeName(row.priority, "routine"),
      diagnosis: row.diagnosis || null,
      notes: row.notes || null,
      createdAt: (row.prescribedAt || row.createdAt)?.toISOString() || new Date().toISOString(),
      updatedAt: row.updatedAt?.toISOString() || null,
      filledAt: row.filledAt?.toISOString() || null,
      expiresAt: row.validUntil?.toISOString() || null,
      refillsRemaining: toNumber(row.refillsRemaining, 0),
    };
  });
}

export async function listPrescriptions(
  tenantId: string,
  filters?: { search?: string | null; status?: string | null; priority?: string | null }
) {
  const prescriptionsList = await listPrescriptionRows(tenantId);
  const search = String(filters?.search || "").trim().toLowerCase();
  const status = String(filters?.status || "all");
  const priority = String(filters?.priority || "all");

  const items = prescriptionsList.filter((item) => {
    const matchesSearch =
      !search ||
      item.patientName.toLowerCase().includes(search) ||
      item.doctorName.toLowerCase().includes(search) ||
      item.id.toLowerCase().includes(search) ||
      item.medications.some((med) => med.name.toLowerCase().includes(search));
    const matchesStatus = status === "all" || item.status === status;
    const matchesPriority = priority === "all" || item.priority === priority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const withBilling = await Promise.all(items.map(async (item) => ({ ...item, billing: item.patientId ? await getPatientBillingStatus(tenantId, item.patientId) : null })));

  return {
    prescriptions: withBilling,
    stats: {
      total: withBilling.length,
      pending: withBilling.filter((item) => item.status === "pending").length,
      dispensing: withBilling.filter((item) => item.status === "dispensing").length,
      filled: withBilling.filter((item) => item.status === "filled").length,
      partiallyFilled: withBilling.filter((item) => item.status === "partially-filled").length,
      urgent: withBilling.filter((item) => item.priority === "urgent").length,
    },
  };
}

export async function getPrescriptionById(tenantId: string, prescriptionId: string) {
  const { prescriptions } = await listPrescriptions(tenantId);
  return prescriptions.find((item) => item.id === prescriptionId) || null;
}

export async function createPrescriptionRecord(tenantId: string, actorId: string, input: any) {
  const [created] = await db
    .insert(prescriptions)
    .values({
      tenantId,
      patientId: input.patientId || null,
      doctorId: input.doctorId || null,
      medication: input.medications?.[0]?.name || input.medication || "Medication order",
      genericName: input.medications?.[0]?.genericName || null,
      strength: input.medications?.[0]?.strength || null,
      dosage: input.medications?.[0]?.dosage || input.dosage || null,
      frequency: input.medications?.[0]?.frequency || input.frequency || null,
      duration: input.medications?.[0]?.duration || input.duration || null,
      quantity: toNumber(input.medications?.[0]?.quantity, toNumber(input.quantity, 0)),
      refills: toNumber(input.refills, 0),
      refillsRemaining: toNumber(input.refills, 0),
      instructions: input.instructions || input.medications?.[0]?.instructions || null,
      status: input.status || "pending",
      prescribedBy: input.prescribedBy || input.doctorName || "Pharmacy intake",
      prescribedAt: new Date(),
      validUntil: input.expiresAt ? new Date(input.expiresAt) : null,
      notes: input.notes || null,
      diagnosis: input.diagnosis || null,
      priority: input.priority || "routine",
      isEmergency: Boolean(input.priority === "urgent" || input.isEmergency),
      pharmacy: input.pharmacy || "Main pharmacy",
    })
    .returning();

  const medications = Array.isArray(input.medications) && input.medications.length
    ? input.medications
    : [
        {
          medicationId: null,
          name: input.medication || "Medication order",
          genericName: input.genericName || null,
          strength: input.strength || null,
          dosage: input.dosage || null,
          frequency: input.frequency || null,
          duration: input.duration || null,
          quantity: toNumber(input.quantity, 0),
          instructions: input.instructions || null,
          refills: toNumber(input.refills, 0),
        },
      ];

  if (medications.length) {
    await db.insert(prescriptionItems).values(
      medications.map((med: any) => ({
        prescriptionId: created.id,
        medicationId: med.medicationId || null,
        drugName: med.name,
        genericName: med.genericName || null,
        strength: med.strength || null,
        dosage: med.dosage || null,
        frequency: med.frequency || null,
        duration: med.duration || null,
        quantity: toNumber(med.quantity, 0),
        instructions: med.instructions || null,
        refills: toNumber(med.refills, 0),
        route: med.route || null,
        isPrn: Boolean(med.isPrn),
      }))
    );
  }

  await db.insert(notifications).values({
    tenantId,
    userId: actorId,
    type: "pharmacy_prescription_created",
    title: "Prescription queued",
    message: `Prescription ${created.id.slice(-6)} is now available in the pharmacy queue.`,
    metadata: { prescriptionId: created.id },
  });

  return getPrescriptionById(tenantId, created.id);
}

async function consumeInventoryForMedications(tenantId: string, medications: any[]) {
  if (!medications.length) return { shortages: [] as string[] };

  const inventory = await listInventory(tenantId);
  const shortages: string[] = [];

  for (const med of medications) {
    const quantity = Math.max(0, toNumber(med.quantity, 0));
    const matched = inventory.items.find(
      (item) =>
        item.name.toLowerCase() === String(med.name || "").toLowerCase() ||
        item.genericName.toLowerCase() === String(med.name || "").toLowerCase() ||
        item.id === med.medicationId
    );

    if (!matched) continue;
    if (matched.stock < quantity) {
      shortages.push(matched.name);
      continue;
    }

    const nextStock = matched.stock - quantity;
    await db.update(inventoryItems).set({ stock: String(nextStock), updatedAt: new Date() }).where(eq(inventoryItems.id, matched.id));
  }

  return { shortages };
}

export async function updatePrescriptionStatus(
  tenantId: string,
  actorId: string,
  prescriptionId: string,
  action: string,
  payload?: any
) {
  const record = await getPrescriptionById(tenantId, prescriptionId);
  if (!record) {
    throw new Error("Prescription not found");
  }

  if (!record.patientId) {
    throw new Error("Prescription is not linked to a patient");
  }

  await syncPatientCareInvoice(tenantId, record.patientId);
  const billing = await getPatientBillingStatus(tenantId, record.patientId);
  if (["fill", "partial"].includes(action) && billing && !billing.clearedForTakeHomeDispense) {
    throw new Error("Patient billing is not cleared. Complete payment at checkout before take-home dispensing.");
  }

  let nextStatus = record.status;
  const patch: Record<string, any> = { updatedAt: new Date() };

  if (action === "start-dispensing") nextStatus = "dispensing";
  if (action === "fill") {
    const result = await consumeInventoryForMedications(tenantId, record.medications);
    nextStatus = result.shortages.length ? "partially-filled" : "filled";
    patch.filledAt = new Date();
    patch.notes = result.shortages.length
      ? [record.notes, `Shortages: ${result.shortages.join(", ")}`].filter(Boolean).join("\n")
      : record.notes;
  }
  if (action === "partial") {
    await consumeInventoryForMedications(
      tenantId,
      record.medications.map((med) => ({ ...med, quantity: Math.max(1, Math.floor(med.quantity / 2)) }))
    );
    nextStatus = "partially-filled";
    patch.filledAt = new Date();
  }
  if (action === "cancel" || action === "reject") nextStatus = "cancelled";
  if (action === "ready") nextStatus = "pending";

  if (payload?.status) nextStatus = payload.status;
  if (payload?.notes) patch.notes = payload.notes;

  patch.status = nextStatus;

  await db.update(prescriptions).set(patch).where(eq(prescriptions.id, prescriptionId));

  await db.insert(notifications).values({
    tenantId,
    userId: actorId,
    type: "pharmacy_prescription_updated",
    title: "Prescription status updated",
    message: `Prescription ${prescriptionId.slice(-6)} is now ${nextStatus.replace(/-/g, " ")}.`,
    metadata: { prescriptionId, status: nextStatus },
  });

  return getPrescriptionById(tenantId, prescriptionId);
}
export async function listDispensingQueue(tenantId: string, filters?: { status?: string | null; search?: string | null }) {
  const { prescriptions } = await listPrescriptions(tenantId, {
    status: filters?.status && filters.status !== "all" ? filters.status : null,
    search: filters?.search || null,
  });
  const items = prescriptions
    .filter((item) => ["pending", "dispensing", "partially-filled", "filled"].includes(item.status))
    .map((item) => ({
      id: item.id,
      prescriptionId: item.id,
      patientName: item.patientName,
      patientId: item.patientId,
      doctorName: item.doctorName,
      billing: item.billing || null,
      medications: item.medications.map((med) => ({
        ...med,
        dispensed:
          item.status === "filled" ? med.quantity : item.status === "partially-filled" ? Math.max(1, Math.floor(med.quantity / 2)) : 0,
      })),
      status: item.status === "filled" ? "dispensed" : item.status,
      priority: item.priority === "urgent" ? "urgent" : "normal",
      createdAt: item.createdAt,
      completedAt: item.filledAt,
    }));

  return {
    queue: items,
    stats: {
      pending: items.filter((item) => item.status === "pending").length,
      inProgress: items.filter((item) => item.status === "dispensing").length,
      partial: items.filter((item) => item.status === "partially-filled").length,
      dispensedToday: items.filter((item) => item.completedAt && new Date(item.completedAt).toDateString() === new Date().toDateString()).length,
    },
  };
}

export async function listDrugInteractions(tenantId: string) {
  const [{ interactions }, { prescriptions }] = await Promise.all([
    getPharmacySettings(tenantId),
    listPrescriptions(tenantId, { status: "all" }),
  ]);

  const activeRisks: any[] = [];
  for (const prescription of prescriptions.filter((item) => ["pending", "dispensing", "partially-filled"].includes(item.status))) {
    const meds = prescription.medications.map((med) => med.name.toLowerCase());
    for (const rule of interactions.filter((item) => item.active !== false)) {
      const a = rule.medicationA.toLowerCase();
      const b = rule.medicationB.toLowerCase();
      if (meds.includes(a) && meds.includes(b)) {
        activeRisks.push({
          id: `${prescription.id}:${rule.id}`,
          prescriptionId: prescription.id,
          patientName: prescription.patientName,
          severity: rule.severity,
          effect: rule.effect,
          recommendation: rule.recommendation,
          medications: [rule.medicationA, rule.medicationB],
          createdAt: prescription.createdAt,
        });
      }
    }
  }

  return {
    interactions,
    activeRisks,
    stats: {
      configuredRules: interactions.length,
      criticalRules: interactions.filter((item) => item.severity === "contraindicated" || item.severity === "major").length,
      activeRisks: activeRisks.length,
      severeActiveRisks: activeRisks.filter((item) => item.severity === "contraindicated" || item.severity === "major").length,
    },
  };
}

export async function listStockAlerts(tenantId: string) {
  const [{ items }, { alertState }] = await Promise.all([listInventory(tenantId), getPharmacySettings(tenantId)]);

  const alerts = items
    .filter((item) => item.status !== "in-stock" || (item.daysToExpiry !== null && item.daysToExpiry <= 30))
    .map((item) => {
      let type = item.status;
      if (item.daysToExpiry !== null && item.daysToExpiry <= 30 && item.status === "in-stock") type = "expiring-soon";
      const state = alertState[item.id] || {};
      return {
        id: item.id,
        itemId: item.id,
        medicationName: item.name,
        supplier: item.supplier,
        type,
        stock: item.stock,
        minStock: item.minStock,
        expiryDate: item.expiryDate,
        daysToExpiry: item.daysToExpiry,
        dismissedAt: state.dismissedAt || null,
        reorderRequestedAt: state.reorderRequestedAt || null,
        note: state.note || null,
        severity: type === "out-of-stock" || type === "expired" ? "critical" : type === "low-stock" ? "high" : "medium",
        status: state.dismissedAt ? "dismissed" : state.reorderRequestedAt ? "reorder-requested" : "open",
      };
    })
    .sort((a, b) => (a.severity === b.severity ? a.medicationName.localeCompare(b.medicationName) : a.severity === "critical" ? -1 : 1));

  return {
    alerts,
    stats: {
      total: alerts.length,
      open: alerts.filter((item) => item.status === "open").length,
      reorderRequested: alerts.filter((item) => item.status === "reorder-requested").length,
      critical: alerts.filter((item) => item.severity === "critical").length,
    },
  };
}

export async function listPharmacyAnalytics(tenantId: string) {
  const [{ prescriptions }, inventory, alerts, interactions, suppliers, paymentRows] = await Promise.all([
    listPrescriptions(tenantId, { status: "all" }),
    listInventory(tenantId),
    listStockAlerts(tenantId),
    listDrugInteractions(tenantId),
    getPharmacySettings(tenantId).then((settings) => settings.suppliers),
    db
      .select({ amount: payments.amount, processedAt: payments.processedAt, status: payments.status })
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), isNull(payments.deletedAt))),
  ]);

  const monthlyLabels = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return date.toLocaleString("en-US", { month: "short" });
  });

  const monthlyDispensed = monthlyLabels.map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return prescriptions.filter(
      (item) =>
        item.filledAt &&
        new Date(item.filledAt).getMonth() === date.getMonth() &&
        new Date(item.filledAt).getFullYear() === date.getFullYear()
    ).length;
  });

  const monthlyRevenue = monthlyLabels.map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return Number(
      paymentRows
        .filter(
          (item) =>
            item.status === "completed" &&
            item.processedAt &&
            new Date(item.processedAt).getMonth() === date.getMonth() &&
            new Date(item.processedAt).getFullYear() === date.getFullYear()
        )
        .reduce((sum, item) => sum + toNumber(item.amount, 0), 0)
        .toFixed(2)
    );
  });

  const topMedications = new Map<string, number>();
  for (const prescription of prescriptions) {
    for (const med of prescription.medications) {
      topMedications.set(med.name, (topMedications.get(med.name) || 0) + med.quantity);
    }
  }

  return {
    summary: {
      totalPrescriptions: prescriptions.length,
      filledPrescriptions: prescriptions.filter((item) => item.status === "filled").length,
      inventoryValue: inventory.stats.inventoryValue,
      lowStockItems: inventory.stats.lowStock,
      openAlerts: alerts.stats.open,
      activeInteractionRisks: interactions.stats.activeRisks,
      activeSuppliers: suppliers.filter((item) => item.active !== false).length,
    },
    trends: {
      labels: monthlyLabels,
      dispensed: monthlyDispensed,
      revenue: monthlyRevenue,
    },
    topMedications: Array.from(topMedications.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, quantity]) => ({ name, quantity })),
    categoryMix: inventory.items.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {}),
  };
}
export async function buildPharmacyDashboard(tenantId: string, pharmacistId: string) {
  const [inventory, prescriptionsData, alerts, analytics, interactions, notificationRows] = await Promise.all([
    listInventory(tenantId),
    listPrescriptions(tenantId, { status: "all" }),
    listStockAlerts(tenantId),
    listPharmacyAnalytics(tenantId),
    listDrugInteractions(tenantId),
    db
      .select({ id: notifications.id, title: notifications.title, message: notifications.message, type: notifications.type, createdAt: notifications.createdAt })
      .from(notifications)
      .where(and(eq(notifications.tenantId, tenantId), eq(notifications.userId, pharmacistId), isNull(notifications.deletedAt)))
      .orderBy(desc(notifications.createdAt))
      .limit(6),
  ]);

  return {
    metrics: {
      pendingPrescriptions: prescriptionsData.stats.pending,
      dispensingNow: prescriptionsData.stats.dispensing,
      filledToday: prescriptionsData.prescriptions.filter((item) => item.filledAt && new Date(item.filledAt).toDateString() === new Date().toDateString()).length,
      lowStockItems: inventory.stats.lowStock,
      outOfStockItems: inventory.stats.outOfStock,
      inventoryValue: inventory.stats.inventoryValue,
      activeSuppliers: analytics.summary.activeSuppliers,
      openAlerts: alerts.stats.open,
      interactionRisks: interactions.stats.activeRisks,
    },
    inventory: inventory.items.slice(0, 6),
    prescriptions: prescriptionsData.prescriptions.slice(0, 6),
    alerts: alerts.alerts.slice(0, 6),
    notifications: notificationRows,
    analytics: analytics.summary,
    topMedications: analytics.topMedications.slice(0, 5),
    trend: analytics.trends,
  };
}

export async function buildPharmacyReports(tenantId: string) {
  const [analytics, { reportRuns }, prescriptionsData, inventory] = await Promise.all([
    listPharmacyAnalytics(tenantId),
    getPharmacySettings(tenantId),
    listPrescriptions(tenantId, { status: "all" }),
    listInventory(tenantId),
  ]);

  return {
    templates: [
      { id: "dispensing-summary", name: "Dispensing Summary", description: "Prescription volume, status, and turnaround overview." },
      { id: "inventory-exposure", name: "Inventory Exposure", description: "Low stock, expiries, and inventory value snapshot." },
      { id: "supplier-performance", name: "Supplier Performance", description: "Supplier roster and current procurement exposure." },
      { id: "safety-review", name: "Medication Safety Review", description: "Drug interaction rules and active risks." },
    ],
    recentRuns: reportRuns.slice(-8).reverse(),
    preview: {
      prescriptions: prescriptionsData.prescriptions.slice(0, 10),
      inventory: inventory.items.slice(0, 10),
      analytics,
    },
  };
}


