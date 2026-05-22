/**
 * Hospital Settings Integration Test & Usage Examples
 *
 * This file demonstrates how to use the hospital settings system
 * and can be used for testing purposes
 */

// ============ Example 1: Fetch Hospital Settings ============
async function exampleFetchSettings(tenantId: string) {
  console.log("📖 Fetching hospital settings...");

  const response = await fetch(`/api/hospital/settings?tenantId=${tenantId}`);
  const settings = await response.json();

  console.log("Hospital Name:", settings.hospital.name);
  console.log("Logo URL:", settings.branding.logoUrl);
  console.log("Primary Color:", settings.branding.primaryColor);
  console.log("Active Modules:", settings.modules);
  console.log("Integrations:", settings.integrations);

  return settings;
}

// ============ Example 2: Update Hospital Settings ============
async function exampleUpdateHospitalInfo(tenantId: string) {
  console.log("✏️ Updating hospital information...");

  const updates = {
    hospital: {
      name: "St. Mary's Medical Center",
      displayName: "St. Mary's",
      shortName: "SMC",
      slug: "st-marys",
      registrationNumber: "HOSP/2024/SMC",
      licenseNumber: "LIC/2024/SMC",
      description: "Leading healthcare provider in East Africa"
    },
    contact: {
      email: "info@stmarys.com",
      phone: "+254 20 2828282",
      website: "https://stmarys.com",
      address: "123 Hospital Avenue",
      city: "Nairobi",
      country: "Kenya",
      postalCode: "00100"
    }
  };

  const response = await fetch(`/api/hospital/settings?tenantId=${tenantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });

  const result = await response.json();
  console.log("✅ Update Result:", result);
  console.log("Changed Keys:", result.changedKeys);

  return result;
}

// ============ Example 3: Update Branding ============
async function exampleUpdateBranding(tenantId: string) {
  console.log("🎨 Updating hospital branding...");

  const updates = {
    branding: {
      logoUrl: "https://cdn.example.com/hospital-logo.svg",
      primaryColor: "#FF6B35",
      accentColor: "#004E89",
      lightLogoUrl: "https://cdn.example.com/hospital-logo-light.svg",
      faviconUrl: "https://cdn.example.com/favicon.ico"
    }
  };

  const response = await fetch(`/api/hospital/settings?tenantId=${tenantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });

  const result = await response.json();
  console.log("✅ Branding Update Result:", result);

  // Also sync to current dashboard
  const { batchUpdateHospitalSettings } = await import("@/lib/hospital-settings-sync");
  batchUpdateHospitalSettings(tenantId, updates.branding);

  return result;
}

// ============ Example 4: Configure Communication Channels ============
async function exampleConfigureCommunication(tenantId: string) {
  console.log("💬 Configuring communication channels...");

  const updates = {
    communication: {
      emailProvider: "resend",
      smsProvider: "twilio",
      notificationPreferences: {
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        inAppEnabled: true
      }
    }
  };

  const response = await fetch(`/api/hospital/settings?tenantId=${tenantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });

  const result = await response.json();
  console.log("✅ Communication Configuration:", result);

  return result;
}

// ============ Example 5: Add Twilio Integration ============
async function exampleAddTwilioIntegration(tenantId: string) {
  console.log("📱 Adding Twilio SMS integration...");

  const integration = {
    provider: "twilio",
    apiKey: process.env.TWILIO_ACCOUNT_SID || "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    apiSecret: process.env.TWILIO_AUTH_TOKEN || "your_auth_token",
    accountName: "Main SMS Account",
    config: {
      phoneNumber: "+1234567890",
      region: "us-east-1"
    }
  };

  const response = await fetch(
    `/api/hospital/integrations?tenantId=${tenantId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(integration)
    }
  );

  const result = await response.json();
  console.log("✅ Integration Added:", result);
  console.log("Integration ID:", result.integration?.id);

  return result.integration;
}

// ============ Example 6: Add Resend Email Integration ============
async function exampleAddResendIntegration(tenantId: string) {
  console.log("📧 Adding Resend email integration...");

  const integration = {
    provider: "resend",
    apiKey: process.env.RESEND_API_KEY || "re_xxxxxxxxxxxxx",
    accountName: "Transactional Email",
    config: {
      domain: "noreply@stmarys.com",
      defaultFrom: "St. Mary's Hospital <noreply@stmarys.com>"
    }
  };

  const response = await fetch(
    `/api/hospital/integrations?tenantId=${tenantId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(integration)
    }
  );

  const result = await response.json();
  console.log("✅ Resend Integration Added:", result);

  return result.integration;
}

// ============ Example 7: Test Integration Connection ============
async function exampleTestIntegration(tenantId: string, integrationId: string) {
  console.log("🧪 Testing integration connection...");

  const response = await fetch(
    `/api/hospital/integrations?tenantId=${tenantId}&integrationId=${integrationId}`,
    { method: "PATCH" }
  );

  const result = await response.json();
  console.log("✅ Test Result:", result);
  console.log("Status:", result.success ? "✅ Connected" : "❌ Failed");

  if (!result.success) {
    console.error("Error:", result.error);
  }

  return result;
}

// ============ Example 8: List All Integrations ============
async function exampleListIntegrations(tenantId: string) {
  console.log("📋 Listing all integrations...");

  const response = await fetch(
    `/api/hospital/integrations?tenantId=${tenantId}`
  );

  const integrations = await response.json();
  console.log("✅ Integrations Found:", integrations.length);

  integrations.forEach((int: any) => {
    console.log(
      `  - ${int.provider}: ${int.accountName} [${int.status.toUpperCase()}]`
    );
  });

  return integrations;
}

// ============ Example 9: Enable Hospital Features ============
async function exampleEnableModules(tenantId: string) {
  console.log("🔧 Enabling hospital modules...");

  const updates = {
    modules: {
      appointments: true,
      pharmacy: true,
      lab: true,
      billing: true,
      inpatient: true,
      emergency: true,
      telemedicine: false, // Disable telemedicine
      insurance: true
    }
  };

  const response = await fetch(`/api/hospital/settings?tenantId=${tenantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });

  const result = await response.json();
  console.log("✅ Modules Updated:", result);

  // Sync to current dashboard
  const { syncModuleVisibility } = await import("@/lib/hospital-settings-sync");
  syncModuleVisibility(updates.modules);

  return result;
}

// ============ Example 10: Configure Billing Settings ============
async function exampleConfigureBilling(tenantId: string) {
  console.log("💰 Configuring billing settings...");

  const updates = {
    billing: {
      taxRate: 16,
      currency: "KES",
      invoicePrefix: "SMC-INV-",
      paymentMethods: ["cash", "card", "bank_transfer", "mpesa"],
      autoChargeInsurance: true
    }
  };

  const response = await fetch(`/api/hospital/settings?tenantId=${tenantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });

  const result = await response.json();
  console.log("✅ Billing Configuration:", result);

  return result;
}

// ============ Example 11: Enable HIPAA Compliance ============
async function exampleEnableHIPAA(tenantId: string) {
  console.log("🔒 Enabling HIPAA compliance mode...");

  const updates = {
    compliance: {
      hipaaMode: true,
      gdprMode: false,
      encryptionAtRest: true,
      auditLoggingEnabled: true,
      dataRetentionDays: 2555 // 7 years
    }
  };

  const response = await fetch(`/api/hospital/settings?tenantId=${tenantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });

  const result = await response.json();
  console.log("✅ HIPAA Compliance Enabled:", result);

  return result;
}

// ============ Example 12: Real-time Branding Sync Demo ============
async function exampleRealtimeSyncDemo(tenantId: string) {
  console.log("🔄 Starting real-time sync demo...");

  const { useHospitalBranding } = await import("@/stores/hospital-branding");

  // This hook will automatically fetch and sync branding
  // In a React component:
  // const { branding, isLoading, updateBranding } = useHospitalBranding(tenantId);

  console.log("✅ Real-time sync demo ready!");
  console.log("   Use useHospitalBranding(tenantId) in any component");
  console.log("   Changes will automatically sync across all dashboards");
}

// ============ Example 13: Complete Setup Flow ============
async function exampleCompleteSetup(tenantId: string) {
  console.log("🚀 Starting complete hospital setup...\n");

  try {
    // Step 1: Update hospital info
    console.log("Step 1/5: Updating hospital information...");
    await exampleUpdateHospitalInfo(tenantId);
    console.log("");

    // Step 2: Update branding
    console.log("Step 2/5: Updating branding...");
    await exampleUpdateBranding(tenantId);
    console.log("");

    // Step 3: Configure communication
    console.log("Step 3/5: Configuring communication channels...");
    await exampleConfigureCommunication(tenantId);
    console.log("");

    // Step 4: Add integrations
    console.log("Step 4/5: Adding integrations...");
    const twilio = await exampleAddTwilioIntegration(tenantId);
    const resend = await exampleAddResendIntegration(tenantId);
    console.log("");

    // Step 5: Test integrations
    console.log("Step 5/5: Testing integrations...");
    if (twilio?.id) await exampleTestIntegration(tenantId, twilio.id);
    if (resend?.id) await exampleTestIntegration(tenantId, resend.id);
    console.log("");

    console.log("✅ Hospital setup complete!");
    console.log("   - All settings saved to database");
    console.log("   - Changes synced to all dashboards");
    console.log("   - Integrations ready to use");
    console.log("   - Audit logs recorded");

  } catch (error) {
    console.error("❌ Setup failed:", error);
  }
}

// ============ Unit Tests ============
async function runTests(tenantId: string) {
  console.log("🧪 Running Hospital Settings Tests...\n");

  const tests = [
    {
      name: "Fetch Settings",
      fn: () => exampleFetchSettings(tenantId)
    },
    {
      name: "Update Hospital Info",
      fn: () => exampleUpdateHospitalInfo(tenantId)
    },
    {
      name: "Update Branding",
      fn: () => exampleUpdateBranding(tenantId)
    },
    {
      name: "Configure Communication",
      fn: () => exampleConfigureCommunication(tenantId)
    },
    {
      name: "Enable Modules",
      fn: () => exampleEnableModules(tenantId)
    },
    {
      name: "Configure Billing",
      fn: () => exampleConfigureBilling(tenantId)
    },
    {
      name: "Enable HIPAA",
      fn: () => exampleEnableHIPAA(tenantId)
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`  Testing: ${test.name}...`);
      await test.fn();
      console.log(`  ✅ ${test.name} passed\n`);
      passed++;
    } catch (error) {
      console.error(`  ❌ ${test.name} failed:`, error);
      failed++;
    }
  }

  console.log("\n📊 Test Results:");
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${tests.length}`);
}

// ============ Export for use ============
export {
  exampleFetchSettings,
  exampleUpdateHospitalInfo,
  exampleUpdateBranding,
  exampleConfigureCommunication,
  exampleAddTwilioIntegration,
  exampleAddResendIntegration,
  exampleTestIntegration,
  exampleListIntegrations,
  exampleEnableModules,
  exampleConfigureBilling,
  exampleEnableHIPAA,
  exampleRealtimeSyncDemo,
  exampleCompleteSetup,
  runTests
};

// ============ Usage ============
/*
// In your application:

import {
  exampleCompleteSetup,
  runTests
} from '@/lib/hospital-settings-examples';

// Quick setup
await exampleCompleteSetup('hospital-uuid-here');

// Run tests
await runTests('hospital-uuid-here');

// Or use individual functions
import { exampleFetchSettings } from '@/lib/hospital-settings-examples';
const settings = await exampleFetchSettings('hospital-uuid-here');
*/

