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
  getFinancialPolicies,
  normalizeBillingSettings,
  upsertBillingSettings,
} from "@/lib/billing-settings";
import { getIntegrationCredentials } from "@/lib/integrations/server";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const [
      settings,
      availableMethods,
      creditCardEnabled,
      bankTransferEnabled,
      cashEnabled,
      insuranceEnabled,
      preferences,
      insuranceSettings,
      policies,
      stripeCreds,
      paypalCreds,
      squareCreds,
      authorizeCreds,
    ] = await Promise.all([
      getBillingSettings(slug),
      getAvailablePaymentMethods(slug),
      isCreditCardEnabled(slug),
      isBankTransferEnabled(slug),
      isCashEnabled(slug),
      isInsuranceEnabled(slug),
      getBillingPreferences(slug),
      getInsuranceIntegrationSettings(slug),
      getFinancialPolicies(slug),
      getIntegrationCredentials(slug, "stripe"),
      getIntegrationCredentials(slug, "paypal"),
      getIntegrationCredentials(slug, "square"),
      getIntegrationCredentials(slug, "authorize-net"),
    ]);

    const paymentProcessors = {
      stripe: creditCardEnabled && stripeCreds?.publishableKey ? {
        enabled: true,
        configured: true,
        publishableKey: stripeCreds.publishableKey,
        environment: process.env.NODE_ENV === "production" ? "live" : "test",
      } : { enabled: creditCardEnabled, configured: false },
      paypal: creditCardEnabled && paypalCreds?.clientId ? {
        enabled: true,
        configured: true,
        clientId: paypalCreds.clientId,
        environment: paypalCreds.environment || (process.env.NODE_ENV === "production" ? "live" : "sandbox"),
      } : { enabled: creditCardEnabled, configured: false },
      square: creditCardEnabled && squareCreds?.applicationId ? {
        enabled: true,
        configured: true,
        applicationId: squareCreds.applicationId,
        locationId: squareCreds.locationId || "",
        environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      } : { enabled: creditCardEnabled, configured: false },
      authorizeNet: creditCardEnabled ? {
        enabled: true,
        configured: Boolean(authorizeCreds?.apiLoginId),
        environment: authorizeCreds?.environment || (process.env.NODE_ENV === "production" ? "production" : "sandbox"),
      } : { enabled: false, configured: false },
      bankTransfer: bankTransferEnabled ? {
        enabled: true,
        configured: true,
        supportedMethods: ["ach", "wire"],
        processingFee: 0,
      } : { enabled: false, configured: false },
      cash: cashEnabled ? {
        enabled: true,
        configured: true,
        denominations: [1, 5, 10, 20, 50, 100],
        changePolicy: "automatic",
      } : { enabled: false, configured: false },
      insurance: insuranceEnabled ? {
        enabled: true,
        configured: true,
        providers: ["medicare", "medicaid", "blue_cross", "aetna", "united_healthcare"],
        realTimeEligibility: insuranceSettings.realTimeEligibility,
        autoClaimsSubmission: insuranceSettings.autoClaimsSubmission,
        eobProcessing: insuranceSettings.eobProcessing,
      } : { enabled: false, configured: false },
    };

    return NextResponse.json({
      tenant: slug,
      settings,
      availablePaymentMethods: availableMethods,
      paymentProcessors,
      preferences,
      insuranceIntegration: insuranceSettings,
      financialPolicies: policies,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching billing configuration:", error);
    return NextResponse.json({ error: "Failed to fetch billing configuration" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok || !access.tenant) return tenantAccessResponse(access);
    if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const settings = normalizeBillingSettings(body);
    await upsertBillingSettings(slug, settings);
    await db.insert(auditLogs).values({
      tenantId: access.tenant.id,
      userId: access.user?.id || null,
      action: "tenant.billing_updated",
      entity: "billing",
      entityId: access.tenant.id,
      metadata: settings,
    });

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("Error saving billing configuration:", error);
    return NextResponse.json({ error: "Failed to save billing configuration" }, { status: 500 });
  }
}
