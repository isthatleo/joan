import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const platformSettingsSchema = z.object({
  general: z.object({
    platformName: z.string().min(1),
    platformDescription: z.string(),
    contactEmail: z.string().email(),
    contactPhone: z.string(),
    timezone: z.string(),
    language: z.string(),
  }).optional(),
  security: z.object({
    sessionTimeout: z.number(),
    passwordMinLength: z.number(),
    requireTwoFactor: z.boolean(),
    allowApiKeys: z.boolean(),
    ipWhitelist: z.array(z.string()),
    auditLogRetention: z.number(),
  }).optional(),
  notifications: z.object({
    emailEnabled: z.boolean(),
    smsEnabled: z.boolean(),
    pushEnabled: z.boolean(),
    maintenanceAlerts: z.boolean(),
    securityAlerts: z.boolean(),
    performanceAlerts: z.boolean(),
  }).optional(),
  api: z.object({
    rateLimitEnabled: z.boolean(),
    rateLimitRequests: z.number(),
    rateLimitWindow: z.number(),
    apiVersion: z.string(),
    webhookEnabled: z.boolean(),
    webhookUrl: z.string(),
  }).optional(),
  features: z.object({
    analyticsEnabled: z.boolean(),
    aiCopilotEnabled: z.boolean(),
    multiTenantEnabled: z.boolean(),
    fileStorageEnabled: z.boolean(),
    backupEnabled: z.boolean(),
  }).optional(),
});

// Mock storage for platform settings
let platformSettings: any = {
  general: {
    platformName: "Joan Healthcare OS",
    platformDescription: "Enterprise Healthcare Management System",
    contactEmail: "admin@joanhealthcare.com",
    contactPhone: "+1 (555) 123-4567",
    timezone: "America/New_York",
    language: "en",
  },
  security: {
    sessionTimeout: 30,
    passwordMinLength: 8,
    requireTwoFactor: true,
    allowApiKeys: true,
    ipWhitelist: ["192.168.1.0/24", "10.0.0.0/8"],
    auditLogRetention: 365,
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: false,
    maintenanceAlerts: true,
    securityAlerts: true,
    performanceAlerts: true,
  },
  api: {
    rateLimitEnabled: true,
    rateLimitRequests: 1000,
    rateLimitWindow: 60,
    apiVersion: "v2.1.0",
    webhookEnabled: true,
    webhookUrl: "https://api.joanhealthcare.com/webhooks",
  },
  features: {
    analyticsEnabled: true,
    aiCopilotEnabled: true,
    multiTenantEnabled: true,
    fileStorageEnabled: true,
    backupEnabled: true,
  },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    if (category && category in platformSettings) {
      return NextResponse.json(platformSettings[category]);
    }

    return NextResponse.json(platformSettings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = platformSettingsSchema.parse(body);

    // Merge with existing settings
    platformSettings = {
      ...platformSettings,
      ...validated,
    };

    return NextResponse.json({
      message: "Settings updated successfully",
      settings: platformSettings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid settings", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

