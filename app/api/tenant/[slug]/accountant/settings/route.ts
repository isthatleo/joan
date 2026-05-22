import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    // Get user settings from database
    const userSettings = await db.$queryRaw`
      SELECT settings
      FROM user_settings
      WHERE user_id = ${session.user.id}
      AND tenant_id = ${tenantId}
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

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const settings = await request.json();

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    // Update or insert user settings
    await db.$queryRaw`
      INSERT INTO user_settings (user_id, tenant_id, settings, updated_at)
      VALUES (${session.user.id}, ${tenantId}, ${JSON.stringify(settings)}, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, tenant_id)
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

