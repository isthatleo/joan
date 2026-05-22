import { NextRequest, NextResponse } from "next/server";
import {
  getBillingSettings,
  getAvailablePaymentMethods,
  isCreditCardEnabled,
  isBankTransferEnabled,
  isCashEnabled,
  isInsuranceEnabled,
  getBillingPreferences,
  getInsuranceIntegrationSettings,
  getFinancialPolicies
} from "@/lib/billing-settings";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const slug = resolvedParams.slug;

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Get all billing settings
    const [settings, availableMethods, creditCardEnabled, bankTransferEnabled, cashEnabled, insuranceEnabled, preferences, insuranceSettings, policies] = await Promise.all([
      getBillingSettings(slug),
      getAvailablePaymentMethods(slug),
      isCreditCardEnabled(slug),
      isBankTransferEnabled(slug),
      isCashEnabled(slug),
      isInsuranceEnabled(slug),
      getBillingPreferences(slug),
      getInsuranceIntegrationSettings(slug),
      getFinancialPolicies(slug)
    ]);

    // Generate API keys/configuration for billing integrations
    const apiKeys = {
      // Stripe configuration (if credit card is enabled)
      stripe: creditCardEnabled ? {
        enabled: true,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "pk_test_...",
        secretKey: process.env.STRIPE_SECRET_KEY || "sk_test_...",
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "whsec_...",
        environment: process.env.NODE_ENV === "production" ? "live" : "test"
      } : { enabled: false },

      // PayPal configuration (if credit card is enabled)
      paypal: creditCardEnabled ? {
        enabled: true,
        clientId: process.env.PAYPAL_CLIENT_ID || "client_id",
        clientSecret: process.env.PAYPAL_CLIENT_SECRET || "client_secret",
        environment: process.env.NODE_ENV === "production" ? "live" : "sandbox"
      } : { enabled: false },

      // Bank transfer configuration
      bankTransfer: bankTransferEnabled ? {
        enabled: true,
        supportedMethods: ["ach", "wire"],
        processingFee: 0.00
      } : { enabled: false },

      // Cash payment configuration
      cash: cashEnabled ? {
        enabled: true,
        denominations: [1, 5, 10, 20, 50, 100],
        changePolicy: "automatic"
      } : { enabled: false },

      // Insurance integration configuration
      insurance: insuranceEnabled ? {
        enabled: true,
        providers: ["medicare", "medicaid", "blue_cross", "aetna", "united_healthcare"],
        realTimeEligibility: insuranceSettings.realTimeEligibility,
        autoClaimsSubmission: insuranceSettings.autoClaimsSubmission,
        eobProcessing: insuranceSettings.eobProcessing
      } : { enabled: false }
    };

    return NextResponse.json({
      tenant: slug,
      settings,
      availablePaymentMethods: availableMethods,
      apiKeys,
      preferences,
      insuranceIntegration: insuranceSettings,
      financialPolicies: policies,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching billing configuration:", error);
    return NextResponse.json({ error: "Failed to fetch billing configuration" }, { status: 500 });
  }
}
