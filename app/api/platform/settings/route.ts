import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SETTINGS_KEY = "platform";

const DEFAULT_SETTINGS = {
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
    ipWhitelist: [] as string[],
    auditLogRetention: 365,
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
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
    webhookEnabled: false,
    webhookUrl: "",
  },
  features: {
    analyticsEnabled: true,
    aiCopilotEnabled: true,
    multiTenantEnabled: true,
    fileStorageEnabled: true,
    backupEnabled: true,
  },
};

const partialSchema = z.object({
  general: z.any().optional(),
  security: z.any().optional(),
  notifications: z.any().optional(),
  api: z.any().optional(),
  features: z.any().optional(),
});

async function load(): Promise<any> {
  try {
    const row = await db.query.platformSettings.findFirst({ where: eq(platformSettings.key, SETTINGS_KEY) });
    if (row?.value) return { ...DEFAULT_SETTINGS, ...(row.value as any) };
  } catch (e) {
    console.error("[platform/settings] load failed:", e);
  }
  return DEFAULT_SETTINGS;
}

async function save(value: any) {
  const existing = await db.query.platformSettings.findFirst({ where: eq(platformSettings.key, SETTINGS_KEY) });
  if (existing) {
    await db.update(platformSettings).set({ value, updatedAt: new Date() }).where(eq(platformSettings.id, existing.id));
  } else {
    await db.insert(platformSettings).values({ key: SETTINGS_KEY, value });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const settings = await load();
    if (category && category in settings) return NextResponse.json(settings[category]);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = partialSchema.parse(body);
    const current = await load();
    const merged = { ...current, ...validated };
    await save(merged);
    return NextResponse.json({ message: "Settings updated successfully", settings: merged });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid settings", details: error.errors }, { status: 400 });
    }
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
