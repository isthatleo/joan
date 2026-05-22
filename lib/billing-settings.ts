import { db } from "@/lib/db";
import { tenantSettings, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  paymentMethods: { creditCard: true, bankTransfer: true, cash: true, insurance: true },
  billingPreferences: { autoInvoiceNumbers: true, taxCalculations: true, discountCodes: false, paymentPlans: true },
  insuranceIntegration: { realTimeEligibility: true, autoClaimsSubmission: true, eobProcessing: true, patientResponsibility: true, secondaryBilling: true, claimTracking: true },
  financialPolicies: { lateFeePercent: 1.5, gracePeriodDays: 15, statementFrequency: "monthly" },
};

/**
 * Get billing settings for a tenant
 */
export async function getBillingSettings(tenantSlug: string): Promise<BillingSettings> {
  try {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, tenantSlug)
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const settings = await db.query.tenantSettings.findFirst({
      where: eq(tenantSettings.tenantId, tenant.id)
    });

    if (!settings?.value) {
      return DEFAULT_BILLING_SETTINGS;
    }

    const billingSettings = (settings.value as any)?.billing || {};
    return { ...DEFAULT_BILLING_SETTINGS, ...billingSettings };
  } catch (error) {
    console.error("Error fetching billing settings:", error);
    return DEFAULT_BILLING_SETTINGS;
  }
}

/**
 * Check if a payment method is enabled for a tenant
 */
export async function isPaymentMethodEnabled(tenantSlug: string, method: keyof BillingSettings['paymentMethods']): Promise<boolean> {
  const settings = await getBillingSettings(tenantSlug);
  return settings.paymentMethods[method];
}

/**
 * Check if credit card payments are enabled
 */
export async function isCreditCardEnabled(tenantSlug: string): Promise<boolean> {
  return isPaymentMethodEnabled(tenantSlug, 'creditCard');
}

/**
 * Check if bank transfer payments are enabled
 */
export async function isBankTransferEnabled(tenantSlug: string): Promise<boolean> {
  return isPaymentMethodEnabled(tenantSlug, 'bankTransfer');
}

/**
 * Check if cash payments are enabled
 */
export async function isCashEnabled(tenantSlug: string): Promise<boolean> {
  return isPaymentMethodEnabled(tenantSlug, 'cash');
}

/**
 * Check if insurance payments are enabled
 */
export async function isInsuranceEnabled(tenantSlug: string): Promise<boolean> {
  return isPaymentMethodEnabled(tenantSlug, 'insurance');
}

/**
 * Get available payment methods for a tenant
 */
export async function getAvailablePaymentMethods(tenantSlug: string): Promise<string[]> {
  const settings = await getBillingSettings(tenantSlug);
  const methods: string[] = [];

  if (settings.paymentMethods.creditCard) methods.push('credit_card');
  if (settings.paymentMethods.bankTransfer) methods.push('bank_transfer');
  if (settings.paymentMethods.cash) methods.push('cash');
  if (settings.paymentMethods.insurance) methods.push('insurance');

  return methods;
}

/**
 * Validate if a payment method is allowed for a tenant
 */
export async function validatePaymentMethod(tenantSlug: string, method: string): Promise<boolean> {
  const availableMethods = await getAvailablePaymentMethods(tenantSlug);

  // Map common method names to our internal names
  const methodMap: { [key: string]: string } = {
    'credit_card': 'credit_card',
    'credit-card': 'credit_card',
    'card': 'credit_card',
    'bank_transfer': 'bank_transfer',
    'bank-transfer': 'bank_transfer',
    'ach': 'bank_transfer',
    'wire': 'bank_transfer',
    'cash': 'cash',
    'insurance': 'insurance',
    'self_pay': 'cash',
    'self-pay': 'cash'
  };

  const normalizedMethod = methodMap[method.toLowerCase()] || method.toLowerCase();
  return availableMethods.includes(normalizedMethod);
}

/**
 * Get billing preferences for a tenant
 */
export async function getBillingPreferences(tenantSlug: string) {
  const settings = await getBillingSettings(tenantSlug);
  return settings.billingPreferences;
}

/**
 * Get insurance integration settings for a tenant
 */
export async function getInsuranceIntegrationSettings(tenantSlug: string) {
  const settings = await getBillingSettings(tenantSlug);
  return settings.insuranceIntegration;
}

/**
 * Get financial policies for a tenant
 */
export async function getFinancialPolicies(tenantSlug: string) {
  const settings = await getBillingSettings(tenantSlug);
  return settings.financialPolicies;
}
