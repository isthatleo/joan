import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantSettings, tenants } from "@/lib/db/schema";

export type BillingSettings = {
  paymentMethods: {
    creditCard: boolean;
    bankTransfer: boolean;
    cash: boolean;
    insurance: boolean;
  };
  billingPreferences: {
    autoInvoiceNumbers: boolean;
    taxCalculations: boolean;
    discountCodes: boolean;
    paymentPlans: boolean;
  };
  insuranceIntegration: {
    realTimeEligibility: boolean;
    autoClaimsSubmission: boolean;
    eobProcessing: boolean;
    patientResponsibility: boolean;
    secondaryBilling: boolean;
    claimTracking: boolean;
  };
  financialPolicies: {
    lateFeePercent: number;
    gracePeriodDays: number;
    statementFrequency: string;
  };
};

export const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  paymentMethods: { creditCard: true, bankTransfer: true, cash: true, insurance: true },
  billingPreferences: { autoInvoiceNumbers: true, taxCalculations: true, discountCodes: false, paymentPlans: true },
  insuranceIntegration: {
    realTimeEligibility: true,
    autoClaimsSubmission: true,
    eobProcessing: true,
    patientResponsibility: true,
    secondaryBilling: true,
    claimTracking: true,
  },
  financialPolicies: { lateFeePercent: 1.5, gracePeriodDays: 15, statementFrequency: "monthly" },
};

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function normalizeBillingSettings(value?: Partial<BillingSettings> | Record<string, any> | null): BillingSettings {
  const source = value || {};
  const paymentMethods = source.paymentMethods || {};
  const billingPreferences = source.billingPreferences || {};
  const insuranceIntegration = source.insuranceIntegration || {};
  const financialPolicies = source.financialPolicies || {};

  return {
    paymentMethods: {
      creditCard: asBoolean(paymentMethods.creditCard, DEFAULT_BILLING_SETTINGS.paymentMethods.creditCard),
      bankTransfer: asBoolean(paymentMethods.bankTransfer, DEFAULT_BILLING_SETTINGS.paymentMethods.bankTransfer),
      cash: asBoolean(paymentMethods.cash, DEFAULT_BILLING_SETTINGS.paymentMethods.cash),
      insurance: asBoolean(paymentMethods.insurance, DEFAULT_BILLING_SETTINGS.paymentMethods.insurance),
    },
    billingPreferences: {
      autoInvoiceNumbers: asBoolean(billingPreferences.autoInvoiceNumbers, DEFAULT_BILLING_SETTINGS.billingPreferences.autoInvoiceNumbers),
      taxCalculations: asBoolean(billingPreferences.taxCalculations, DEFAULT_BILLING_SETTINGS.billingPreferences.taxCalculations),
      discountCodes: asBoolean(billingPreferences.discountCodes, DEFAULT_BILLING_SETTINGS.billingPreferences.discountCodes),
      paymentPlans: asBoolean(billingPreferences.paymentPlans, DEFAULT_BILLING_SETTINGS.billingPreferences.paymentPlans),
    },
    insuranceIntegration: {
      realTimeEligibility: asBoolean(insuranceIntegration.realTimeEligibility, DEFAULT_BILLING_SETTINGS.insuranceIntegration.realTimeEligibility),
      autoClaimsSubmission: asBoolean(insuranceIntegration.autoClaimsSubmission, DEFAULT_BILLING_SETTINGS.insuranceIntegration.autoClaimsSubmission),
      eobProcessing: asBoolean(insuranceIntegration.eobProcessing, DEFAULT_BILLING_SETTINGS.insuranceIntegration.eobProcessing),
      patientResponsibility: asBoolean(insuranceIntegration.patientResponsibility, DEFAULT_BILLING_SETTINGS.insuranceIntegration.patientResponsibility),
      secondaryBilling: asBoolean(insuranceIntegration.secondaryBilling, DEFAULT_BILLING_SETTINGS.insuranceIntegration.secondaryBilling),
      claimTracking: asBoolean(insuranceIntegration.claimTracking, DEFAULT_BILLING_SETTINGS.insuranceIntegration.claimTracking),
    },
    financialPolicies: {
      lateFeePercent: asNumber(financialPolicies.lateFeePercent, DEFAULT_BILLING_SETTINGS.financialPolicies.lateFeePercent),
      gracePeriodDays: asNumber(financialPolicies.gracePeriodDays, DEFAULT_BILLING_SETTINGS.financialPolicies.gracePeriodDays),
      statementFrequency: asString(financialPolicies.statementFrequency, DEFAULT_BILLING_SETTINGS.financialPolicies.statementFrequency),
    },
  };
}

async function getTenantBySlug(tenantSlug: string) {
  return db.query.tenants.findFirst({
    where: eq(tenants.slug, tenantSlug),
  });
}

export async function getBillingSettings(tenantSlug: string): Promise<BillingSettings> {
  try {
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) throw new Error("Tenant not found");

    const settings = await db.query.tenantSettings.findFirst({
      where: and(eq(tenantSettings.tenantId, tenant.id), eq(tenantSettings.key, "billing")),
    });

    return normalizeBillingSettings((settings?.value as Record<string, any>) || {});
  } catch (error) {
    console.error("Error fetching billing settings:", error);
    return DEFAULT_BILLING_SETTINGS;
  }
}

export async function upsertBillingSettings(tenantSlug: string, value: BillingSettings) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const existing = await db.query.tenantSettings.findFirst({
    where: and(eq(tenantSettings.tenantId, tenant.id), eq(tenantSettings.key, "billing")),
  });

  if (existing) {
    await db.update(tenantSettings).set({ value, updatedAt: new Date() }).where(eq(tenantSettings.id, existing.id));
    return;
  }

  await db.insert(tenantSettings).values({
    tenantId: tenant.id,
    key: "billing",
    value,
  });
}

export async function isPaymentMethodEnabled(tenantSlug: string, method: keyof BillingSettings["paymentMethods"]): Promise<boolean> {
  const settings = await getBillingSettings(tenantSlug);
  return settings.paymentMethods[method];
}

export async function isCreditCardEnabled(tenantSlug: string): Promise<boolean> {
  return isPaymentMethodEnabled(tenantSlug, "creditCard");
}

export async function isBankTransferEnabled(tenantSlug: string): Promise<boolean> {
  return isPaymentMethodEnabled(tenantSlug, "bankTransfer");
}

export async function isCashEnabled(tenantSlug: string): Promise<boolean> {
  return isPaymentMethodEnabled(tenantSlug, "cash");
}

export async function isInsuranceEnabled(tenantSlug: string): Promise<boolean> {
  return isPaymentMethodEnabled(tenantSlug, "insurance");
}

export async function getAvailablePaymentMethods(tenantSlug: string): Promise<string[]> {
  const settings = await getBillingSettings(tenantSlug);
  const methods: string[] = [];
  if (settings.paymentMethods.creditCard) methods.push("credit_card");
  if (settings.paymentMethods.bankTransfer) methods.push("bank_transfer");
  if (settings.paymentMethods.cash) methods.push("cash");
  if (settings.paymentMethods.insurance) methods.push("insurance");
  return methods;
}

export async function validatePaymentMethod(tenantSlug: string, method: string): Promise<boolean> {
  const availableMethods = await getAvailablePaymentMethods(tenantSlug);
  const methodMap: Record<string, string> = {
    credit_card: "credit_card",
    "credit-card": "credit_card",
    card: "credit_card",
    bank_transfer: "bank_transfer",
    "bank-transfer": "bank_transfer",
    ach: "bank_transfer",
    wire: "bank_transfer",
    cash: "cash",
    insurance: "insurance",
    self_pay: "cash",
    "self-pay": "cash",
  };
  const normalizedMethod = methodMap[method.toLowerCase()] || method.toLowerCase();
  return availableMethods.includes(normalizedMethod);
}

export async function getBillingPreferences(tenantSlug: string) {
  const settings = await getBillingSettings(tenantSlug);
  return settings.billingPreferences;
}

export async function getInsuranceIntegrationSettings(tenantSlug: string) {
  const settings = await getBillingSettings(tenantSlug);
  return settings.insuranceIntegration;
}

export async function getFinancialPolicies(tenantSlug: string) {
  const settings = await getBillingSettings(tenantSlug);
  return settings.financialPolicies;
}
