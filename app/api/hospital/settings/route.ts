import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, tenantSettings, integrations, auditLogs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { inferCountryFromCity } from "@/lib/address-city-inference";

// Get current user's tenant from context (middleware should set this)
async function getTenantFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  // In production, decode the JWT to get user info
  // For now, we'll rely on the tenant-scoped API pattern
  return null;
}

// Default settings structure
const DEFAULTS = {
  branding: {
    primaryColor: "#F97316",
    logoUrl: "",
    faviconUrl: "",
    accentColor: "#EA580C",
    lightLogoUrl: "",
  },
  hospital: {
    name: "Hospital Name",
    displayName: "Hospital Name",
    shortName: "HN",
    slug: "hospital-slug",
    registrationNumber: "",
    licenseNumber: "",
    description: "",
  },
  contact: {
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    country: "",
    postalCode: "",
  },
  communication: {
    emailProvider: "resend", // "resend", "sendgrid", "mailgun"
    smsProvider: "twilio", // "twilio", "aws_sns"
    defaultChannel: "in_app",
    fallbackChannel: "email",
    allowedChannels: ["in_app", "email", "sms", "push", "whatsapp", "voice"],
    notificationPreferences: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: false,
      inAppEnabled: true,
    },
  },
  modules: {
    appointments: true,
    pharmacy: true,
    lab: true,
    billing: true,
    inpatient: true,
    emergency: false,
    telemedicine: false,
    insurance: true,
    queue: true,
    vitals: true,
    carePlans: true,
    feedback: true,
    messaging: true,
    analytics: true,
    reports: true,
    guardians: true,
    patientPortal: true,
    inventory: true,
    qualityControl: true,
  },
  preferences: {
    timezone: "UTC",
    language: "en",
    currency: "USD",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h",
    weekStartDay: "Monday",
  },
  ui: {
    theme: "light", // "light", "dark", "auto"
    compactMode: false,
    sidebarCollapsed: false,
    primaryTheme: "orange",
  },
  compliance: {
    hipaaMode: false,
    gdprMode: false,
    encryptionAtRest: true,
    auditLoggingEnabled: true,
    dataRetentionDays: 2555, // 7 years
  },
  billing: {
    taxRate: 0,
    currency: "USD",
    invoicePrefix: "INV-",
    paymentMethods: ["cash", "card"],
    autoChargeInsurance: false,
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    inAppEnabled: true,
    soundEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "06:00",
  },
  workflow: {
    automationEnabled: true,
    appointmentReminders: true,
    prescriptionAlerts: true,
    patientNotifications: true,
    staffNotifications: true,
    billingAutomation: false,
    reportGeneration: false,
    dataBackupEnabled: true,
    backupFrequency: "daily",
  },
  audit: {
    retentionDays: 365,
    logAuthentication: true,
    logClinicalActions: true,
    logFinancialActions: true,
    logConfigurationChanges: true,
    exportFormat: "csv",
  },
  system: {
    maintenanceMode: false,
    maintenanceMessage: "",
    autoUpdates: false,
    telemetryEnabled: true,
    healthAlertsEnabled: true,
  },
  apiManagement: {
    ipAllowlistEnabled: false,
    webhookRetryEnabled: true,
    webhookRetryCount: 3,
  },
  dangerZone: {
    archiveGraceDays: 30,
  },
};

const SETTINGS_KEYS = [
  "hospital",
  "branding",
  "contact",
  "communication",
  "modules",
  "preferences",
  "ui",
  "compliance",
  "billing",
  "security",
  "workflow",
  "notifications",
  "audit",
  "system",
  "apiManagement",
  "dangerZone",
] as const;

// GET all tenant settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get all tenant settings
    const rows = await db
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId));

    const settings: any = structuredClone(DEFAULTS);

    // Merge db settings with defaults
    for (const row of rows) {
      if (row.key in settings) {
        settings[row.key] = { ...settings[row.key], ...(row.value as any) };
      } else {
        settings[row.key] = row.value;
      }
    }

    // Get integrations
    const integrationRows = await db
      .select()
      .from(integrations)
      .where(eq(integrations.tenantId, tenantId));

    const integrationsMap: Record<string, any> = {};
    for (const int of integrationRows) {
      integrationsMap[int.provider] = {
        id: int.id,
        isActive: int.isActive,
        status: int.status,
        accountName: int.accountName,
        accountId: int.accountId,
        config: int.config,
        lastTestedAt: int.lastTestedAt,
        testError: int.testError,
      };
    }

    return NextResponse.json({
      ...settings,
      integrations: integrationsMap,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        plan: tenant.plan,
      },
    });
  } catch (error) {
    console.error("[hospital settings GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT - Update tenant settings
const putSchema = z.record(z.string(), z.any());

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = putSchema.parse(await request.json());
    const changedKeys: string[] = [];

    // Handle tenant name and slug updates
    if (body.hospital?.name && body.hospital.name !== tenant.name) {
      await db
        .update(tenants)
        .set({
          name: body.hospital.name,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId));

      changedKeys.push("tenant.name");
    }

    if (body.hospital?.slug && body.hospital.slug !== tenant.slug) {
      await db
        .update(tenants)
        .set({
          slug: body.hospital.slug,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId));

      changedKeys.push("tenant.slug");
    }

    // Handle logo upload
    if (typeof body.branding?.logoUrl === "string" && body.branding.logoUrl !== tenant.logoUrl) {
      await db
        .update(tenants)
        .set({
          logoUrl: body.branding.logoUrl,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId));

      changedKeys.push("branding.logoUrl");
    }

    if (body.contact) {
      if (!body.contact.country && body.contact.city) {
        body.contact.country = inferCountryFromCity(body.contact.city) || body.contact.country;
      }
      await db
        .update(tenants)
        .set({
          contactEmail: body.contact.email ?? tenant.contactEmail,
          contactPhone: body.contact.phone ?? tenant.contactPhone,
          address: body.contact.address ?? tenant.address,
          city: body.contact.city ?? tenant.city,
          country: body.contact.country ?? tenant.country,
          timezone: body.preferences?.timezone ?? tenant.timezone,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId));
      changedKeys.push("tenant.contact");
    }

    // Persist tenant-scoped settings sections
    for (const key of SETTINGS_KEYS) {
      if (!(key in body)) continue;
      const value = body[key];

      const existing = await db
        .select()
        .from(tenantSettings)
        .where(
          and(
            eq(tenantSettings.tenantId, tenantId),
            eq(tenantSettings.key, key)
          )
        );

      if (existing.length > 0) {
        await db
          .update(tenantSettings)
          .set({
            value,
            updatedAt: new Date(),
          })
          .where(eq(tenantSettings.id, existing[0].id));
      } else {
        await db.insert(tenantSettings).values({
          tenantId,
          key,
          value,
        });
      }

      changedKeys.push(key);
    }

    // Audit log
    if (changedKeys.length > 0) {
      await db.insert(auditLogs).values({
        action: "hospital.settings_updated",
        entity: "hospital",
        entityId: tenantId,
        metadata: { keys: changedKeys, changes: body },
      });
    }

    return NextResponse.json({
      message: "Settings updated successfully",
      changedKeys,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid settings", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[hospital settings PUT]", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

