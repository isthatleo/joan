import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { insurancePolicies, tenantSettings } from "@/lib/db/schema";

const DEFAULT_METHODS = ["cash", "card", "insurance", "bank_transfer"] as const;
const VISIT_PAYMENT_SELECTIONS_KEY = "patient_visit_payment_preferences";
const DEFAULT_PAYMENT_PREFERENCES_KEY = "patient_default_payment_preferences";
const INSURANCE_PROVIDERS_KEY = "insuranceProviders";

export type PaymentSelection = {
  id: string;
  patientId: string;
  appointmentId: string | null;
  paymentMethod: string;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  recordedAt: string;
  recordedBy: string | null;
};

export type PatientDefaultPaymentPreference = {
  patientId: string;
  paymentMethod: string;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  updatedAt: string;
};

type TenantBillingSettings = {
  paymentMethods?: string[];
  currency?: string;
};

type TenantPreferenceSettings = {
  currency?: string;
};

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

function normalizePaymentMethod(method: string) {
  const value = method.trim().toLowerCase();
  if (value === "credit_card" || value === "credit-card") return "card";
  if (value === "self_pay" || value === "self-pay") return "cash";
  return value;
}

export function paymentMethodLabel(method: string) {
  if (method === "bank_transfer") return "Bank Transfer";
  if (method === "card") return "Card";
  if (method === "insurance") return "Insurance";
  if (method === "cash") return "Cash";
  return method
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getTenantPaymentConfiguration(tenantId: string) {
  const [billing, preferences, configuredProviders, providerRows] = await Promise.all([
    getSetting<TenantBillingSettings>(tenantId, "billing", {}),
    getSetting<TenantPreferenceSettings>(tenantId, "preferences", {}),
    getSetting<string[]>(tenantId, INSURANCE_PROVIDERS_KEY, []),
    db
      .select({ provider: insurancePolicies.provider })
      .from(insurancePolicies)
      .where(eq(insurancePolicies.tenantId, tenantId))
      .orderBy(asc(insurancePolicies.provider)),
  ]);

  const methods = Array.from(
    new Set((billing.paymentMethods || [...DEFAULT_METHODS]).map((value) => normalizePaymentMethod(String(value))))
  );

  const insuranceProviders = Array.from(
    new Set(
      [...configuredProviders, ...providerRows.map((row) => row.provider || "").filter(Boolean)]
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  return {
    methods,
    currency: billing.currency || preferences.currency || "USD",
    insuranceProviders,
  };
}

export async function getPatientInsurancePolicies(tenantId: string, patientId: string) {
  const rows = await db.query.insurancePolicies.findMany({
    where: and(eq(insurancePolicies.tenantId, tenantId), eq(insurancePolicies.patientId, patientId)),
    orderBy: [asc(insurancePolicies.provider)],
  });

  return rows.map((row) => ({
    id: row.id,
    provider: row.provider || "",
    policyNumber: row.policyNumber || "",
  }));
}

export async function getPatientDefaultPaymentPreference(tenantId: string, patientId: string) {
  const rows = await getSetting<PatientDefaultPaymentPreference[]>(tenantId, DEFAULT_PAYMENT_PREFERENCES_KEY, []);
  return rows.find((row) => row.patientId === patientId) || null;
}

export async function setPatientDefaultPaymentPreference(
  tenantId: string,
  preference: PatientDefaultPaymentPreference,
  updatedBy?: string | null,
) {
  const current = await getSetting<PatientDefaultPaymentPreference[]>(tenantId, DEFAULT_PAYMENT_PREFERENCES_KEY, []);
  const next = [
    preference,
    ...current.filter((row) => row.patientId !== preference.patientId),
  ].slice(0, 5000);
  await setSetting(tenantId, DEFAULT_PAYMENT_PREFERENCES_KEY, next, updatedBy);
  return preference;
}

export async function addVisitPaymentSelection(
  tenantId: string,
  selection: PaymentSelection,
  saveAsDefault?: boolean,
  updatedBy?: string | null,
) {
  const current = await getSetting<PaymentSelection[]>(tenantId, VISIT_PAYMENT_SELECTIONS_KEY, []);
  const next = [selection, ...current.filter((row) => row.id !== selection.id)].slice(0, 5000);
  await setSetting(tenantId, VISIT_PAYMENT_SELECTIONS_KEY, next, updatedBy);

  if (saveAsDefault) {
    await setPatientDefaultPaymentPreference(
      tenantId,
      {
        patientId: selection.patientId,
        paymentMethod: selection.paymentMethod,
        insuranceProvider: selection.insuranceProvider,
        insurancePolicyNumber: selection.insurancePolicyNumber,
        updatedAt: selection.recordedAt,
      },
      updatedBy,
    );
  }

  return selection;
}

export async function getLatestVisitPaymentSelectionsByPatient(tenantId: string, patientIds: string[]) {
  if (!patientIds.length) return new Map<string, PaymentSelection>();
  const current = await getSetting<PaymentSelection[]>(tenantId, VISIT_PAYMENT_SELECTIONS_KEY, []);
  const allowed = new Set(patientIds);
  const map = new Map<string, PaymentSelection>();

  for (const entry of current) {
    if (!allowed.has(entry.patientId)) continue;
    if (!map.has(entry.patientId)) {
      map.set(entry.patientId, entry);
    }
  }

  return map;
}

export async function getPatientPaymentWorkspace(tenantId: string, patientId: string) {
  const [config, defaultPreference, insurancePolicyRows] = await Promise.all([
    getTenantPaymentConfiguration(tenantId),
    getPatientDefaultPaymentPreference(tenantId, patientId),
    getPatientInsurancePolicies(tenantId, patientId),
  ]);

  return {
    ...config,
    defaultPreference,
    insurancePolicies: insurancePolicyRows,
  };
}

export async function getVisitPaymentSelection(tenantId: string, appointmentId: string | null, patientId: string) {
  const current = await getSetting<PaymentSelection[]>(tenantId, VISIT_PAYMENT_SELECTIONS_KEY, []);
  return (
    current.find((row) => appointmentId && row.appointmentId === appointmentId) ||
    current.find((row) => row.patientId === patientId) ||
    null
  );
}
