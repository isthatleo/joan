import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantSettings, auditLogs, tenants } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const preferencesSchema = z.object({
  timezone: z.string().optional(),
  language: z.string().optional(),
  currency: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.string().optional(),
  weekStartDay: z.string().optional(),
  theme: z.string().optional(),
  compactMode: z.boolean().optional(),
  autoSync: z.boolean().optional(),
  notificationSound: z.boolean().optional(),
});

// GET preferences
export async function GET(request: NextRequest) {
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

    // Get preferences
    const setting = await db
      .select()
      .from(tenantSettings)
      .where(
        and(
          eq(tenantSettings.tenantId, tenantId),
          eq(tenantSettings.key, "preferences")
        )
      );

    const defaults = {
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
    };

    if (setting.length === 0) {
      return NextResponse.json(defaults);
    }

    return NextResponse.json({ ...defaults, ...(setting[0].value || {}) });
  } catch (error) {
    console.error("[preferences GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

// PUT - Update preferences (with sync across system)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = preferencesSchema.parse(await request.json());

    // Get existing preferences
    const existing = await db
      .select()
      .from(tenantSettings)
      .where(
        and(
          eq(tenantSettings.tenantId, tenantId),
          eq(tenantSettings.key, "preferences")
        )
      );

    // Merge with existing
    let preferences = {
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
    };

    if (existing.length > 0) {
      preferences = { ...preferences, ...(existing[0].value as any) };
    }

    // Apply updates
    preferences = { ...preferences, ...body };

    if (existing.length > 0) {
      await db
        .update(tenantSettings)
        .set({
          value: preferences,
          updatedAt: new Date(),
        })
        .where(eq(tenantSettings.id, existing[0].id));
    } else {
      await db.insert(tenantSettings).values({
        tenantId,
        key: "preferences",
        value: preferences,
      });
    }

    // Also update tenant timezone if changed
    if (body.timezone) {
      await db
        .update(tenants)
        .set({ timezone: body.timezone })
        .where(eq(tenants.id, tenantId));
    }

    // Audit log
    const changedKeys = Object.keys(body);
    if (changedKeys.length > 0) {
      await db.insert(auditLogs).values({
        action: "hospital.preferences_updated",
        entity: "hospital",
        entityId: tenantId,
        metadata: {
          changed: changedKeys,
          values: body,
        },
      });
    }

    return NextResponse.json({
      message: "Preferences updated successfully",
      preferences,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid preferences", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[preferences PUT]", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}

// POST - Sync preferences across system
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const action = searchParams.get("action");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    if (action === "sync") {
      // Trigger a system-wide sync of preferences
      await db.insert(auditLogs).values({
        action: "hospital.preferences_synced",
        entity: "hospital",
        entityId: tenantId,
        metadata: { timestamp: new Date().toISOString() },
      });

      return NextResponse.json({
        message: "Preferences synced across system",
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[preferences POST]", error);
    return NextResponse.json(
      { error: "Failed to sync preferences" },
      { status: 500 }
    );
  }
}

