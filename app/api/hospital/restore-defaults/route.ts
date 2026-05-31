import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantSettings, auditLogs, tenants } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const restoreSchema = z.object({
  section: z.enum([
    "branding",
    "security",
    "preferences",
    "workflow",
    "compliance",
    "billing",
    "notifications",
    "communication",
    "modules",
    "ui",
    "all",
  ]),
});

// Default values for each section
const DEFAULTS: Record<string, any> = {
  branding: {
    primaryColor: "#F97316",
    logoUrl: "",
    faviconUrl: "",
    accentColor: "#EA580C",
    lightLogoUrl: "",
  },
  security: {
    passwordExpirationEnabled: false,
    passwordExpirationDays: 90,
    mfaRequired: false,
    ipWhitelistEnabled: false,
    sessionTimeout: 3600,
    twoFactorEnabled: false,
    passwordReuseLimit: 5,
  },
  preferences: {
    timezone: "UTC",
    language: "en",
    currency: "USD",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    weekStartDay: "Sunday",
    theme: "light",
    compactMode: false,
    autoSync: true,
    notificationSound: true,
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
  compliance: {
    hipaaMode: false,
    gdprMode: false,
    encryptionAtRest: true,
    auditLoggingEnabled: true,
    dataRetentionDays: 2555,
  },
  billing: {
    taxRate: 0,
    currency: "USD",
    invoicePrefix: "INV-",
    paymentMethods: ["cash", "card"],
    autoChargeInsurance: false,
  },
  communication: {
    emailProvider: "resend",
    smsProvider: "twilio",
    defaultChannel: "in_app",
    fallbackChannel: "email",
    notificationPreferences: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: false,
      inAppEnabled: true,
    },
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
  ui: {
    theme: "light",
    compactMode: false,
    sidebarCollapsed: false,
    primaryTheme: "orange",
  },
};

// POST - Restore defaults for a section
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = restoreSchema.parse(await request.json());
    const sectionsToRestore =
      body.section === "all" ? Object.keys(DEFAULTS) : [body.section];

    const restoredSections: string[] = [];

    for (const section of sectionsToRestore) {
      const existing = await db
        .select()
        .from(tenantSettings)
        .where(
          and(
            eq(tenantSettings.tenantId, tenantId),
            eq(tenantSettings.key, section)
          )
        );

      const defaultValue = DEFAULTS[section];

      if (existing.length > 0) {
        await db
          .update(tenantSettings)
          .set({
            value: defaultValue,
            updatedAt: new Date(),
          })
          .where(eq(tenantSettings.id, existing[0].id));
      } else {
        await db.insert(tenantSettings).values({
          tenantId,
          key: section,
          value: defaultValue,
        });
      }

      restoredSections.push(section);
    }

    // Audit log
    await db.insert(auditLogs).values({
      action: "hospital.settings_restored_to_defaults",
      entity: "hospital",
      entityId: tenantId,
      metadata: {
        sections: restoredSections,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      message: `${restoredSections.length} section(s) restored to defaults`,
      restoredSections,
      defaults: restoredSections.reduce(
        (acc, section) => ({
          ...acc,
          [section]: DEFAULTS[section],
        }),
        {}
      ),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[restore-defaults POST]", error);
    return NextResponse.json(
      { error: "Failed to restore defaults" },
      { status: 500 }
    );
  }
}

// GET - Get default values
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section");

    if (!section) {
      return NextResponse.json(DEFAULTS);
    }

    if (!(section in DEFAULTS)) {
      return NextResponse.json(
        { error: "Invalid section" },
        { status: 400 }
      );
    }

    return NextResponse.json({ [section]: DEFAULTS[section] });
  } catch (error) {
    console.error("[restore-defaults GET]", error);
    return NextResponse.json(
      { error: "Failed to get defaults" },
      { status: 500 }
    );
  }
}

