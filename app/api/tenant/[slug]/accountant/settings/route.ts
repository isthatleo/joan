import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantIdBySlug } from "@/lib/accountant/server";

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

    // Get user settings from database
    const userSettings = await db.$queryRaw`
      SELECT settings
      FROM user_settings
      WHERE user_id = ${session.user.id}
      LIMIT 1
    `;

    // Default settings if none exist
    const defaultSettings = {
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
    };

    const settings = userSettings[0]?.settings || defaultSettings;

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
    const settings = await request.json();

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Update or insert user settings
    await db.$queryRaw`
      INSERT INTO user_settings (user_id, settings, created_at, updated_at)
      VALUES (${session.user.id}, ${JSON.stringify(settings)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id)
      DO UPDATE SET
        settings = EXCLUDED.settings,
        updated_at = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating accountant settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

