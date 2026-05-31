import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, platformSettings } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/platform-billing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SETTINGS_KEY = "platform";

const DEFAULT_SETTINGS = {
  general: {
    platformName: "Joan Healthcare OS",
    platformDescription: "Enterprise Healthcare Management System",
    supportEmail: "support@joan.health",
    operationsEmail: "ops@joan.health",
    publicWebsite: "https://joan.health",
    timezone: "UTC",
    language: "en",
    environment: "production",
    releaseChannel: "stable",
  },
  branding: {
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#f97316",
    accentColor: "#0f766e",
    loginMessage: "Secure healthcare operations for every tenant.",
  },
  tenantDefaults: {
    defaultPlan: "professional",
    trialDays: 14,
    gracePeriodDays: 60,
    requireTenant2fa: false,
    autoProvisionModules: true,
    allowTenantBranding: true,
  },
  security: {
    requireSuperAdmin2fa: true,
    requireTenantAdmin2fa: false,
    sessionTimeoutMinutes: 30,
    passwordMinLength: 10,
    auditLogRetentionDays: 730,
    blockInactiveTenantAccess: true,
    allowApiKeys: true,
    ipWhitelist: [] as string[],
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    maintenanceAlerts: true,
    securityAlerts: true,
    billingAlerts: true,
    productBroadcasts: true,
  },
  modules: {
    appointments: true,
    billing: true,
    pharmacy: true,
    laboratory: true,
    insurance: true,
    analytics: true,
    aiCopilot: true,
    messaging: true,
    feedback: true,
    compliance: true,
  },
  integrations: {
    rateLimitEnabled: true,
    rateLimitRequests: 1000,
    rateLimitWindowSeconds: 60,
    webhookEnabled: false,
    webhookUrl: "",
    publicApiEnabled: true,
  },
  maintenance: {
    enabled: false,
    message: "Scheduled maintenance is in progress. Please try again shortly.",
    allowSuperAdmins: true,
    scheduledStart: "",
    scheduledEnd: "",
  },
  sync: {
    version: 1,
    lastSyncedAt: null as string | null,
  },
};

const settingsSchema = z.object({
  general: z.record(z.string(), z.any()).optional(),
  branding: z.record(z.string(), z.any()).optional(),
  tenantDefaults: z.record(z.string(), z.any()).optional(),
  security: z.record(z.string(), z.any()).optional(),
  notifications: z.record(z.string(), z.any()).optional(),
  modules: z.record(z.string(), z.any()).optional(),
  integrations: z.record(z.string(), z.any()).optional(),
  maintenance: z.record(z.string(), z.any()).optional(),
  sync: z.record(z.string(), z.any()).optional(),
});

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMerge<T extends Record<string, any>>(base: T, patch: Record<string, any>): T {
  const output: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(patch || {})) {
    if (isPlainObject(value) && isPlainObject(output[key])) {
      output[key] = deepMerge(output[key], value);
    } else {
      output[key] = value;
    }
  }
  return output as T;
}

async function loadSettings() {
  const row = await db.query.platformSettings.findFirst({ where: eq(platformSettings.key, SETTINGS_KEY) });
  return deepMerge(DEFAULT_SETTINGS, isPlainObject(row?.value) ? (row?.value as Record<string, any>) : {});
}

async function saveSettings(value: Record<string, any>, userId?: string | null) {
  const existing = await db.query.platformSettings.findFirst({ where: eq(platformSettings.key, SETTINGS_KEY) });
  if (existing) {
    await db
      .update(platformSettings)
      .set({ value, updatedAt: new Date(), updatedBy: userId || null })
      .where(eq(platformSettings.id, existing.id));
  } else {
    await db.insert(platformSettings).values({
      key: SETTINGS_KEY,
      value,
      updatedBy: userId || null,
    });
  }
}

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const category = new URL(request.url).searchParams.get("category");
    const settings = await loadSettings();
    if (category && category in settings) {
      return NextResponse.json(settings[category as keyof typeof settings], {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }
    return NextResponse.json(
      {
        settings,
        currentUser: {
          id: guard.user.id,
          name: guard.user.fullName,
          email: guard.user.email,
          role: guard.user.role,
          avatar: guard.user.avatar,
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[platform/settings] GET failed:", error);
    return NextResponse.json({ error: "Failed to fetch platform settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const guard = await requireSuperAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json().catch(() => ({}));
    const validated = settingsSchema.parse(body?.settings || body);
    const current = await loadSettings();
    const merged = deepMerge(current, validated);
    merged.sync = {
      ...(merged.sync || {}),
      version: Number(merged.sync?.version || 1) + 1,
      lastSyncedAt: new Date().toISOString(),
    };

    await saveSettings(merged, guard.user.id);
    await db.insert(auditLogs).values({
      userId: guard.user.id,
      action: "platform.settings.updated",
      entity: "platform_settings",
      metadata: {
        sections: Object.keys(validated),
        syncVersion: merged.sync.version,
      },
    });

    return NextResponse.json({ success: true, settings: merged });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid platform settings", details: error.issues }, { status: 400 });
    }
    console.error("[platform/settings] PUT failed:", error);
    return NextResponse.json({ error: "Failed to update platform settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json().catch(() => ({}));
    if (body?.action !== "reset-defaults") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    const resetSettings = deepMerge(DEFAULT_SETTINGS, {
      sync: { version: Date.now(), lastSyncedAt: new Date().toISOString() },
    });
    await saveSettings(resetSettings, guard.user.id);
    await db.insert(auditLogs).values({
      userId: guard.user.id,
      action: "platform.settings.reset",
      entity: "platform_settings",
      metadata: { syncVersion: resetSettings.sync.version },
    });

    return NextResponse.json({ success: true, settings: resetSettings });
  } catch (error) {
    console.error("[platform/settings] POST failed:", error);
    return NextResponse.json({ error: "Failed to reset platform settings" }, { status: 500 });
  }
}
