import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { parseJsonBody, validateFinancePayload } from "@/lib/accountant/finance-api";
import { accountantSettingsSchema } from "@/lib/accountant/route-schemas";
import { eq } from "drizzle-orm";

const defaultAccountantSettings = (session: { user: { id: string; name?: string | null; email?: string | null; image?: string | null } }) => ({
  profile: {
    name: session.user.name || "",
    email: session.user.email || "",
    phone: "",
    avatar: session.user.image || "",
  },
  notifications: {
    emailNotifications: true,
    paymentReminders: true,
    reportAlerts: true,
    systemUpdates: false,
  },
  preferences: {
    currency: "USD",
    dateFormat: "MM/DD/YYYY",
    theme: "system",
    language: "en",
  },
  security: {
    twoFactorEnabled: false,
    sessionTimeout: 60,
    passwordLastChanged: new Date().toISOString(),
  },
  billing: {
    defaultPaymentTerms: 30,
    lateFeePercentage: 1.5,
    autoSendInvoices: true,
    autoSendReminders: true,
  },
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const [storedSettings] = await db
      .select({ settings: userSettings.settings })
      .from(userSettings)
      .where(eq(userSettings.userId, session.user.id as string))
      .limit(1);

    const defaults = defaultAccountantSettings(session as any);
    const settings = storedSettings?.settings && typeof storedSettings.settings === "object"
      ? {
          ...defaults,
          ...(storedSettings.settings as Record<string, unknown>),
          profile: {
            ...defaults.profile,
            ...((storedSettings.settings as any).profile || {}),
          },
          notifications: {
            ...defaults.notifications,
            ...((storedSettings.settings as any).notifications || {}),
          },
          preferences: {
            ...defaults.preferences,
            ...((storedSettings.settings as any).preferences || {}),
          },
          security: {
            ...defaults.security,
            ...((storedSettings.settings as any).security || {}),
          },
          billing: {
            ...defaults.billing,
            ...((storedSettings.settings as any).billing || {}),
          },
        }
      : defaults;

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching accountant settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const jsonResult = await parseJsonBody(request);
    if (!jsonResult.ok) return jsonResult.response;
    const parsed = validateFinancePayload(accountantSettingsSchema, jsonResult.data);
    if (!parsed.ok) return parsed.response;

    await db
      .insert(userSettings)
      .values({
        userId: session.user.id as string,
        settings: parsed.data,
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          settings: parsed.data,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating accountant settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

