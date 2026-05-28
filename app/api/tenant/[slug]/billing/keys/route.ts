import { NextRequest, NextResponse } from "next/server";
import { getBillingSettings } from "@/lib/billing-settings";
import { getIntegrationCredentials } from "@/lib/integrations/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const [settings, stripeCreds, paypalCreds, squareCreds, authorizeCreds] = await Promise.all([
      getBillingSettings(slug),
      getIntegrationCredentials(slug, "stripe"),
      getIntegrationCredentials(slug, "paypal"),
      getIntegrationCredentials(slug, "square"),
      getIntegrationCredentials(slug, "authorize-net"),
    ]);

    const apiKeys = {
      stripe: settings.paymentMethods.creditCard ? {
        enabled: true,
        configured: Boolean(stripeCreds?.publishableKey),
        publishableKey: stripeCreds?.publishableKey || "",
        environment: process.env.NODE_ENV === "production" ? "live" : "test",
        apiVersion: "2023-10-16",
      } : { enabled: false, configured: false },

      paypal: settings.paymentMethods.creditCard ? {
        enabled: true,
        configured: Boolean(paypalCreds?.clientId),
        clientId: paypalCreds?.clientId || "",
        environment: paypalCreds?.environment || (process.env.NODE_ENV === "production" ? "live" : "sandbox"),
        apiVersion: "v2",
      } : { enabled: false, configured: false },

      square: settings.paymentMethods.creditCard ? {
        enabled: true,
        configured: Boolean(squareCreds?.applicationId),
        applicationId: squareCreds?.applicationId || "",
        locationId: squareCreds?.locationId || "",
        environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      } : { enabled: false, configured: false },

      authorizeNet: settings.paymentMethods.creditCard ? {
        enabled: true,
        configured: Boolean(authorizeCreds?.apiLoginId),
        environment: authorizeCreds?.environment || (process.env.NODE_ENV === "production" ? "production" : "sandbox"),
      } : { enabled: false, configured: false },

      billing: {
        enabled: true,
        tenantId: slug,
        features: {
          autoInvoiceNumbers: settings.billingPreferences.autoInvoiceNumbers,
          taxCalculations: settings.billingPreferences.taxCalculations,
          discountCodes: settings.billingPreferences.discountCodes,
          paymentPlans: settings.billingPreferences.paymentPlans,
          realTimeEligibility: settings.insuranceIntegration.realTimeEligibility,
          autoClaimsSubmission: settings.insuranceIntegration.autoClaimsSubmission,
          eobProcessing: settings.insuranceIntegration.eobProcessing,
        },
        policies: settings.financialPolicies,
      },
    };

    return NextResponse.json({
      tenant: slug,
      apiKeys,
      settings,
      generatedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    console.error("Error fetching billing API keys:", error);
    return NextResponse.json({ error: "Failed to fetch billing API keys" }, { status: 500 });
  }
}