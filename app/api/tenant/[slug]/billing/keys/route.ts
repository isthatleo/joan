import { NextRequest, NextResponse } from "next/server";
import { getBillingSettings } from "@/lib/billing-settings";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const slug = resolvedParams.slug;

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const settings = await getBillingSettings(slug);

    // Generate API keys and configuration based on enabled features
    const apiKeys = {
      // Payment Gateway APIs
      stripe: settings.paymentMethods.creditCard ? {
        enabled: true,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "pk_test_...",
        secretKey: process.env.STRIPE_SECRET_KEY || "sk_test_...",
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "whsec_...",
        environment: process.env.NODE_ENV === "production" ? "live" : "test",
        apiVersion: "2023-10-16"
      } : { enabled: false },

      paypal: settings.paymentMethods.creditCard ? {
        enabled: true,
        clientId: process.env.PAYPAL_CLIENT_ID || "client_id",
        clientSecret: process.env.PAYPAL_CLIENT_SECRET || "client_secret",
        environment: process.env.NODE_ENV === "production" ? "live" : "sandbox",
        apiVersion: "v2"
      } : { enabled: false },

      square: settings.paymentMethods.creditCard ? {
        enabled: true,
        applicationId: process.env.SQUARE_APPLICATION_ID || "application_id",
        accessToken: process.env.SQUARE_ACCESS_TOKEN || "access_token",
        locationId: process.env.SQUARE_LOCATION_ID || "location_id",
        environment: process.env.NODE_ENV === "production" ? "production" : "sandbox"
      } : { enabled: false },

      authorizeNet: settings.paymentMethods.creditCard ? {
        enabled: true,
        apiLoginId: process.env.AUTHORIZE_NET_API_LOGIN_ID || "api_login_id",
        transactionKey: process.env.AUTHORIZE_NET_TRANSACTION_KEY || "transaction_key",
        environment: process.env.NODE_ENV === "production" ? "production" : "sandbox"
      } : { enabled: false },

      // Bank Transfer APIs
      plaid: settings.paymentMethods.bankTransfer ? {
        enabled: true,
        clientId: process.env.PLAID_CLIENT_ID || "client_id",
        secret: process.env.PLAID_SECRET || "secret",
        environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
        apiVersion: "2020-09-14"
      } : { enabled: false },

      stripeACH: settings.paymentMethods.bankTransfer ? {
        enabled: true,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "pk_test_...",
        secretKey: process.env.STRIPE_SECRET_KEY || "sk_test_...",
        environment: process.env.NODE_ENV === "production" ? "live" : "test"
      } : { enabled: false },

      // Insurance Integration APIs
      availity: settings.paymentMethods.insurance ? {
        enabled: true,
        clientId: process.env.AVAILITY_CLIENT_ID || "client_id",
        clientSecret: process.env.AVAILITY_CLIENT_SECRET || "client_secret",
        environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
        apiVersion: "v2"
      } : { enabled: false },

      waystar: settings.paymentMethods.insurance ? {
        enabled: true,
        apiKey: process.env.WAYSTAR_API_KEY || "api_key",
        secretKey: process.env.WAYSTAR_SECRET_KEY || "secret_key",
        environment: process.env.NODE_ENV === "production" ? "production" : "uat",
        apiVersion: "v1"
      } : { enabled: false },

      // General Billing APIs
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
          eobProcessing: settings.insuranceIntegration.eobProcessing
        },
        policies: settings.financialPolicies
      },

      // Webhook endpoints for real-time updates
      webhooks: {
        paymentSuccess: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/billing/payment-success`,
        paymentFailed: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/billing/payment-failed`,
        insuranceClaimUpdate: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/billing/insurance-claim-update`,
        invoiceOverdue: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/billing/invoice-overdue`
      }
    };

    return NextResponse.json({
      tenant: slug,
      apiKeys,
      settings,
      generatedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  } catch (error) {
    console.error("Error fetching billing API keys:", error);
    return NextResponse.json({ error: "Failed to fetch billing API keys" }, { status: 500 });
  }
}
