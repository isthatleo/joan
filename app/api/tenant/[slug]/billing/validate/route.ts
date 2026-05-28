import { NextRequest, NextResponse } from "next/server";
import {
  validatePaymentMethod,
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
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const method = searchParams.get("method");

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    let result: Record<string, any> = { allowed: false, reason: "Unknown action" };

    switch (action) {
      case "payment":
        if (!method) {
          result = { allowed: false, reason: "Payment method required" };
        } else {
          const isValid = await validatePaymentMethod(slug, method);
          result = {
            allowed: isValid,
            reason: isValid ? "Payment method is enabled" : `Payment method '${method}' is not enabled for this tenant`
          };
        }
        break;

      case "credit_card":
        const creditCardEnabled = await isCreditCardEnabled(slug);
        result = {
          allowed: creditCardEnabled,
          reason: creditCardEnabled ? "Credit card payments are enabled" : "Credit card payments are disabled"
        };
        break;

      case "bank_transfer":
        const bankTransferEnabled = await isBankTransferEnabled(slug);
        result = {
          allowed: bankTransferEnabled,
          reason: bankTransferEnabled ? "Bank transfer payments are enabled" : "Bank transfer payments are disabled"
        };
        break;

      case "cash":
        const cashEnabled = await isCashEnabled(slug);
        result = {
          allowed: cashEnabled,
          reason: cashEnabled ? "Cash payments are enabled" : "Cash payments are disabled"
        };
        break;

      case "insurance":
        const insuranceEnabled = await isInsuranceEnabled(slug);
        result = {
          allowed: insuranceEnabled,
          reason: insuranceEnabled ? "Insurance payments are enabled" : "Insurance payments are disabled"
        };
        break;

      case "billing_features":
        const preferences = await getBillingPreferences(slug);
        result = {
          allowed: true,
          features: preferences,
          reason: "Billing features retrieved successfully"
        };
        break;

      case "insurance_integration":
        const insuranceSettings = await getInsuranceIntegrationSettings(slug);
        result = {
          allowed: true,
          settings: insuranceSettings,
          reason: "Insurance integration settings retrieved successfully"
        };
        break;

      case "financial_policies":
        const policies = await getFinancialPolicies(slug);
        result = {
          allowed: true,
          policies,
          reason: "Financial policies retrieved successfully"
        };
        break;

      default:
        result = { allowed: false, reason: `Unknown action: ${action}` };
    }

    return NextResponse.json({
      tenant: slug,
      action,
      method,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error validating billing action:", error);
    return NextResponse.json({
      error: "Failed to validate billing action",
      allowed: false,
      reason: "Validation failed due to server error"
    }, { status: 500 });
  }
}
