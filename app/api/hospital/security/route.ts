import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantSettings, auditLogs, tenants } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const securitySettingsSchema = z.object({
  passwordExpirationEnabled: z.boolean().optional(),
  passwordExpirationDays: z.number().optional(),
  mfaRequired: z.boolean().optional(),
  ipWhitelistEnabled: z.boolean().optional(),
  sessionTimeout: z.number().optional(),
  twoFactorEnabled: z.boolean().optional(),
  passwordReuseLimit: z.number().optional(),
});

// GET security settings
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

    // Get security settings
    const setting = await db
      .select()
      .from(tenantSettings)
      .where(
        and(
          eq(tenantSettings.tenantId, tenantId),
          eq(tenantSettings.key, "security")
        )
      );

    const defaults = {
      passwordExpirationEnabled: false,
      passwordExpirationDays: 90,
      mfaRequired: false,
      ipWhitelistEnabled: false,
      sessionTimeout: 3600,
      twoFactorEnabled: false,
      passwordReuseLimit: 5,
    };

    if (setting.length === 0) {
      return NextResponse.json(defaults);
    }

    return NextResponse.json(setting[0].value || defaults);
  } catch (error) {
    console.error("[security GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch security settings" },
      { status: 500 }
    );
  }
}

// PUT - Update security settings
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

    const body = securitySettingsSchema.parse(await request.json());

    // Get existing setting
    const existing = await db
      .select()
      .from(tenantSettings)
      .where(
        and(
          eq(tenantSettings.tenantId, tenantId),
          eq(tenantSettings.key, "security")
        )
      );

    if (existing.length > 0) {
      await db
        .update(tenantSettings)
        .set({
          value: body,
          updatedAt: new Date(),
        })
        .where(eq(tenantSettings.id, existing[0].id));
    } else {
      await db.insert(tenantSettings).values({
        tenantId,
        key: "security",
        value: body,
      });
    }

    // Audit log
    await db.insert(auditLogs).values({
      action: "hospital.security_settings_updated",
      entity: "hospital",
      entityId: tenantId,
      metadata: { changes: body },
    });

    return NextResponse.json({
      message: "Security settings updated successfully",
      settings: body,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid settings", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[security PUT]", error);
    return NextResponse.json(
      { error: "Failed to update security settings" },
      { status: 500 }
    );
  }
}

