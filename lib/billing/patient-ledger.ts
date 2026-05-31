import { db } from "@/lib/db";
import { inventoryItems, invoices, labOrders, patients, payments, prescriptionItems, prescriptions, tenantSettings, users, visits } from "@/lib/db/schema";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

export type ChargeCatalog = {
  currency: string;
  consultationFee: number;
  labDefaultFee: number;
  medicationDefaultUnitPrice: number;
  labTests?: Record<string, number>;
  medicationPrices?: Record<string, number>;
};

export type ChargeCatalogCoverage = {
  currency: string;
  missingLabTariffs: Array<{ testCode: string; testName: string; orderCount: number }>;
  missingMedicationPrices: Array<{ medicationId: string; medicationName: string; source: "inventory" | "prescription"; occurrenceCount: number }>;
};

type InvoiceItem = {
  description: string;
  amount: string;
  quantity: number;
  unitPrice: string;
  category: string;
  sourceId?: string;
};

const CATALOG_KEY = "patient_charge_catalog";
const LEDGER_DESCRIPTION = "Patient care ledger";
const LEDGER_PAYMENT_TERMS = "patient-ledger";
const DEFAULT_CATALOG: ChargeCatalog = {
  currency: "USD",
  consultationFee: 50,
  labDefaultFee: 35,
  medicationDefaultUnitPrice: 5,
  labTests: {},
  medicationPrices: {},
};

function amount(value: number) {
  return value.toFixed(2);
}

function parseMoney(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export async function getChargeCatalog(tenantId: string): Promise<ChargeCatalog> {
  const currency = await getTenantDefaultCurrency(tenantId);
  const row = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, CATALOG_KEY)),
  });
  const value = (row?.value as Partial<ChargeCatalog> | undefined) || {};
  return {
    ...DEFAULT_CATALOG,
    ...value,
    currency,
    labTests: typeof value.labTests === "object" && value.labTests ? value.labTests : {},
    medicationPrices: typeof value.medicationPrices === "object" && value.medicationPrices ? value.medicationPrices : {},
  };
}

export async function saveChargeCatalog(tenantId: string, catalog: ChargeCatalog, updatedBy?: string | null) {
  const currency = await getTenantDefaultCurrency(tenantId);
  const normalizedCatalog: ChargeCatalog = {
    ...DEFAULT_CATALOG,
    ...catalog,
    currency,
    labTests: typeof catalog.labTests === "object" && catalog.labTests ? catalog.labTests : {},
    medicationPrices: typeof catalog.medicationPrices === "object" && catalog.medicationPrices ? catalog.medicationPrices : {},
  };
  const existing = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, CATALOG_KEY)),
  });

  if (existing) {
    await db.update(tenantSettings).set({ value: normalizedCatalog, updatedAt: new Date(), updatedBy: updatedBy ?? null }).where(eq(tenantSettings.id, existing.id));
    return;
  }

  await db.insert(tenantSettings).values({ tenantId, key: CATALOG_KEY, value: normalizedCatalog, updatedBy: updatedBy ?? null });
}

async function getMedicationPriceMap(tenantId: string) {
  const metadataRow = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "pharmacy_inventory_metadata")),
  });
  const metadata = (metadataRow?.value || {}) as Record<string, { unitPrice?: number }>;
  return new Map(Object.entries(metadata).map(([id, value]) => [id, Number(value?.unitPrice || 0)]));
}

export async function getTenantDefaultCurrency(tenantId: string): Promise<string> {
  const settingsRows = await db.query.tenantSettings.findMany({
    where: and(eq(tenantSettings.tenantId, tenantId), inArray(tenantSettings.key, ["billing", "preferences"])),
  });

  const settings = new Map(settingsRows.map((row) => [row.key, row.value as Record<string, unknown>]));
  const billingCurrency = String(settings.get("billing")?.currency || "").trim().toUpperCase();
  if (billingCurrency) return billingCurrency;

  const preferenceCurrency = String(settings.get("preferences")?.currency || "").trim().toUpperCase();
  if (preferenceCurrency) return preferenceCurrency;

  return DEFAULT_CATALOG.currency;
}

export async function getChargeCatalogCoverage(tenantId: string): Promise<ChargeCatalogCoverage> {
  const [catalog, labRows, prescriptionRows, inventoryPriceMap] = await Promise.all([
    getChargeCatalog(tenantId),
    db.query.labOrders.findMany({
      where: and(eq(labOrders.tenantId, tenantId), isNull(labOrders.deletedAt)),
    }),
    db
      .select({
        id: prescriptionItems.id,
        medicationId: prescriptionItems.medicationId,
        drugName: prescriptionItems.drugName,
        genericName: prescriptionItems.genericName,
      })
      .from(prescriptionItems)
      .innerJoin(prescriptions, eq(prescriptions.id, prescriptionItems.prescriptionId))
      .where(and(eq(prescriptions.tenantId, tenantId), isNull(prescriptions.deletedAt))),
    getMedicationPriceMap(tenantId),
  ]);

  const missingLabs = new Map<string, { testCode: string; testName: string; orderCount: number }>();
  for (const order of labRows) {
    const code = String(order.testCode || "").trim();
    const name = String(order.testName || "").trim();
    const covered = (code && catalog.labTests?.[code] != null) || (name && catalog.labTests?.[name] != null);
    if (covered) continue;
    const key = code || name || "UNSPECIFIED";
    const existing = missingLabs.get(key);
    if (existing) {
      existing.orderCount += 1;
    } else {
      missingLabs.set(key, { testCode: code, testName: name || code || "Unspecified test", orderCount: 1 });
    }
  }

  const missingMedications = new Map<string, { medicationId: string; medicationName: string; source: "inventory" | "prescription"; occurrenceCount: number }>();
  for (const item of prescriptionRows) {
    const medicationId = String(item.medicationId || item.id);
    const medicationName = String(item.drugName || item.genericName || "Medication");
    const inventoryPrice = item.medicationId ? inventoryPriceMap.get(item.medicationId) : 0;
    const overridePrice =
      catalog.medicationPrices?.[medicationId] ??
      catalog.medicationPrices?.[medicationName] ??
      catalog.medicationPrices?.[String(item.genericName || "")];
    const hasPrice = parseMoney(inventoryPrice) > 0 || parseMoney(overridePrice) > 0;
    if (hasPrice) continue;

    const existing = missingMedications.get(medicationId);
    if (existing) {
      existing.occurrenceCount += 1;
    } else {
      missingMedications.set(medicationId, {
        medicationId,
        medicationName,
        source: item.medicationId ? "inventory" : "prescription",
        occurrenceCount: 1,
      });
    }
  }

  return {
    currency: catalog.currency,
    missingLabTariffs: Array.from(missingLabs.values()).sort((a, b) => b.orderCount - a.orderCount),
    missingMedicationPrices: Array.from(missingMedications.values()).sort((a, b) => b.occurrenceCount - a.occurrenceCount),
  };
}

export async function buildPatientCareLedger(tenantId: string, patientId: string) {
  const [catalog, patient, visitRows, labRows, prescriptionRows, priceMap] = await Promise.all([
    getChargeCatalog(tenantId),
    db.query.patients.findFirst({ where: eq(patients.id, patientId) }),
    db.query.visits.findMany({ where: and(eq(visits.tenantId, tenantId), eq(visits.patientId, patientId), isNull(visits.deletedAt)) }),
    db.query.labOrders.findMany({ where: and(eq(labOrders.tenantId, tenantId), eq(labOrders.patientId, patientId), isNull(labOrders.deletedAt)) }),
    db.query.prescriptions.findMany({ where: and(eq(prescriptions.tenantId, tenantId), eq(prescriptions.patientId, patientId), isNull(prescriptions.deletedAt)) }),
    getMedicationPriceMap(tenantId),
  ]);

  if (!patient) return null;

  const prescriptionIds = prescriptionRows.map((row) => row.id);
  const itemRows = prescriptionIds.length
    ? await db.query.prescriptionItems.findMany({ where: inArray(prescriptionItems.prescriptionId, prescriptionIds) })
    : [];
  const itemsByPrescription = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    if (!item.prescriptionId) continue;
    const list = itemsByPrescription.get(item.prescriptionId) || [];
    list.push(item);
    itemsByPrescription.set(item.prescriptionId, list);
  }

  const visitItems: InvoiceItem[] = visitRows.map((visit) => ({
    description: visit.reason ? `Consultation - ${visit.reason}` : "Consultation",
    quantity: 1,
    unitPrice: amount(catalog.consultationFee),
    amount: amount(catalog.consultationFee),
    category: "consultation",
    sourceId: visit.id,
  }));

  const labItems: InvoiceItem[] = labRows.map((order) => {
    const fee = catalog.labTests?.[String(order.testCode || "")] ?? catalog.labTests?.[String(order.testName || "")] ?? catalog.labDefaultFee;
    return {
      description: `Lab - ${order.testName || order.testCode || "Test"}`,
      quantity: 1,
      unitPrice: amount(fee),
      amount: amount(fee),
      category: "lab",
      sourceId: order.id,
    };
  });

  const medicationItems: InvoiceItem[] = prescriptionRows.flatMap((prescription) => {
    const items = itemsByPrescription.get(prescription.id) || [];
    if (!items.length) {
      const unitPrice =
        catalog.medicationPrices?.[prescription.id] ??
        catalog.medicationPrices?.[String(prescription.medication || "")] ??
        catalog.medicationPrices?.[String(prescription.genericName || "")] ??
        catalog.medicationDefaultUnitPrice;
      const quantity = Number(prescription.quantity || 0) || 1;
      return [{
        description: `Medication - ${prescription.medication || "Prescription"}`,
        quantity,
        unitPrice: amount(unitPrice),
        amount: amount(unitPrice * quantity),
        category: "medication",
        sourceId: prescription.id,
      }];
    }
    return items.map((item) => {
      const inventoryPrice = item.medicationId ? priceMap.get(item.medicationId) : undefined;
      const overridePrice =
        catalog.medicationPrices?.[String(item.medicationId || "")] ??
        catalog.medicationPrices?.[String(item.drugName || "")] ??
        catalog.medicationPrices?.[String(item.genericName || "")];
      const unitPrice = parseMoney(inventoryPrice) || parseMoney(overridePrice) || catalog.medicationDefaultUnitPrice;
      const quantity = Number(item.quantity || 0) || 1;
      return {
        description: `Medication - ${item.drugName || prescription.medication || "Prescription"}`,
        quantity,
        unitPrice: amount(unitPrice),
        amount: amount(unitPrice * quantity),
        category: "medication",
        sourceId: item.id,
      };
    });
  });

  const items = [...visitItems, ...labItems, ...medicationItems];
  const totalAmount = Number(items.reduce((sum, item) => sum + parseMoney(item.amount), 0).toFixed(2));
  return {
    patientId,
    patientName: patient.fullName || [patient.firstName, patient.lastName].filter(Boolean).join(" ") || "Patient",
    currency: catalog.currency,
    items,
    totalAmount,
  };
}

async function getExistingLedgerInvoice(tenantId: string, patientId: string) {
  const rows = await db.select().from(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.patientId, patientId), eq(invoices.description, LEDGER_DESCRIPTION), isNull(invoices.deletedAt))).orderBy(desc(invoices.createdAt));
  return rows[0] || null;
}

async function getPaidAmount(invoiceId: string) {
  const rows = await db.select().from(payments).where(and(eq(payments.invoiceId, invoiceId), eq(payments.status, "completed"), isNull(payments.deletedAt)));
  return rows.reduce((sum, row) => sum + parseMoney(row.amount), 0);
}

export async function syncPatientCareInvoice(tenantId: string, patientId: string) {
  const ledger = await buildPatientCareLedger(tenantId, patientId);
  if (!ledger) return null;

  const existing = await getExistingLedgerInvoice(tenantId, patientId);
  const dueDate = new Date().toISOString().slice(0, 10);

  if (!existing) {
    const status = ledger.totalAmount > 0 ? "pending" : "draft";
    const [created] = await db.insert(invoices).values({
      tenantId,
      patientId,
      invoiceNumber: `CARE-${Date.now()}`,
      amount: amount(ledger.totalAmount),
      totalAmount: amount(ledger.totalAmount),
      amountDue: amount(ledger.totalAmount),
      status,
      dueDate,
      description: LEDGER_DESCRIPTION,
      notes: "Auto-synced from consultation, lab, and pharmacy ledger.",
      paymentTerms: LEDGER_PAYMENT_TERMS,
      items: ledger.items,
    }).returning();
    return { ...created, amountDue: ledger.totalAmount, totalAmount: ledger.totalAmount, paidAmount: 0, currency: ledger.currency };
  }

  const paidAmount = await getPaidAmount(existing.id);
  const amountDue = Math.max(0, ledger.totalAmount - paidAmount);
  const status = amountDue === 0 ? "paid" : paidAmount > 0 ? "partial" : ledger.totalAmount > 0 ? "pending" : "draft";

  const [updated] = await db.update(invoices).set({
    amount: amount(ledger.totalAmount),
    totalAmount: amount(ledger.totalAmount),
    amountDue: amount(amountDue),
    status,
    dueDate,
    paymentTerms: LEDGER_PAYMENT_TERMS,
    notes: "Auto-synced from consultation, lab, and pharmacy ledger.",
    items: ledger.items,
    updatedAt: new Date(),
  }).where(eq(invoices.id, existing.id)).returning();

  return { ...updated, totalAmount: ledger.totalAmount, amountDue, paidAmount, currency: ledger.currency };
}

export async function syncTenantPatientCareLedgers(tenantId: string) {
  const patientRows = await db.select({ id: patients.id }).from(patients).where(and(eq(patients.tenantId, tenantId), isNull(patients.deletedAt)));
  const results = [];
  for (const patient of patientRows) {
    const synced = await syncPatientCareInvoice(tenantId, patient.id);
    if (synced) results.push(synced);
  }
  return results;
}

export async function getPatientBillingStatus(tenantId: string, patientId: string) {
  const invoice = await syncPatientCareInvoice(tenantId, patientId);
  if (!invoice) return null;
  return {
    invoiceId: invoice.id,
    totalAmount: parseMoney((invoice as any).totalAmount ?? (invoice as any).amount),
    amountDue: parseMoney((invoice as any).amountDue),
    paidAmount: parseMoney((invoice as any).paidAmount),
    currency: String((invoice as any).currency || await getTenantDefaultCurrency(tenantId)),
    status: (invoice as any).status,
    clearedForTakeHomeDispense: parseMoney((invoice as any).amountDue) <= 0,
  };
}
