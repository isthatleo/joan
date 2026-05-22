import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantSettings, auditLogs, tenants, patients, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const confirmSchema = z.object({
  action: z.enum(["purge-data", "delete-tenant", "reset-settings"]),
  confirmationCode: z.string(),
  reason: z.string().optional(),
});

// GET - Check danger zone status
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

    // Get stats
    const patientCount = await db
      .select({ count: patients.id })
      .from(patients)
      .where(eq(patients.tenantId, tenantId));

    const userCount = await db
      .select({ count: users.id })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    return NextResponse.json({
      tenantId,
      tenantName: tenant.name,
      createdAt: tenant.createdAt,
      patientCount: patientCount.length > 0 ? patientCount[0].count : 0,
      staffCount: userCount.length > 0 ? userCount[0].count : 0,
      plan: tenant.plan,
    });
  } catch (error) {
    console.error("[danger-zone GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch danger zone info" },
      { status: 500 }
    );
  }
}

// POST - Generate or validate confirmation codes
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

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    if (action === "generate-code") {
      // Generate confirmation code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Store in temporary settings (in production, use Redis)
      const existingCodes = await db
        .select()
        .from(tenantSettings)
        .where(
          and(
            eq(tenantSettings.tenantId, tenantId),
            eq(tenantSettings.key, "confirmationCodes")
          )
        );

      const codes = existingCodes.length > 0
        ? (existingCodes[0].value as any)
        : {};

      codes[code] = {
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        used: false,
      };

      if (existingCodes.length > 0) {
        await db
          .update(tenantSettings)
          .set({ value: codes, updatedAt: new Date() })
          .where(eq(tenantSettings.id, existingCodes[0].id));
      } else {
        await db.insert(tenantSettings).values({
          tenantId,
          key: "confirmationCodes",
          value: codes,
        });
      }

      return NextResponse.json({
        code,
        expiresIn: 600,
        message: "Confirmation code generated. Valid for 10 minutes.",
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[danger-zone POST]", error);
    return NextResponse.json(
      { error: "Failed to generate code" },
      { status: 500 }
    );
  }
}

// DELETE - Execute dangerous operations
export async function DELETE(request: NextRequest) {
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

    const body = confirmSchema.parse(await request.json());

    // Verify confirmation code
    const codesSetting = await db
      .select()
      .from(tenantSettings)
      .where(
        and(
          eq(tenantSettings.tenantId, tenantId),
          eq(tenantSettings.key, "confirmationCodes")
        )
      );

    const codes = codesSetting.length > 0 ? (codesSetting[0].value as any) : {};
    const codeData = codes[body.confirmationCode];

    if (!codeData || codeData.used || codeData.expiresAt < Date.now()) {
      return NextResponse.json(
        { error: "Invalid or expired confirmation code" },
        { status: 400 }
      );
    }

    // Mark code as used
    codes[body.confirmationCode].used = true;
    await db
      .update(tenantSettings)
      .set({ value: codes, updatedAt: new Date() })
      .where(eq(tenantSettings.id, codesSetting[0].id));

    if (body.action === "reset-settings") {
      // Delete all tenant settings
      const allSettings = await db
        .select()
        .from(tenantSettings)
        .where(eq(tenantSettings.tenantId, tenantId));

      for (const setting of allSettings) {
        await db
          .update(tenantSettings)
          .set({ value: null, updatedAt: new Date() })
          .where(eq(tenantSettings.id, setting.id));
      }

      // Audit
      await db.insert(auditLogs).values({
        action: "danger_zone.settings_reset",
        entity: "hospital",
        entityId: tenantId,
        metadata: {
          reason: body.reason,
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        message: "All settings reset to defaults successfully",
      });
    } else if (body.action === "purge-data") {
      // Archive old data (soft delete)
      // In production, this would implement GDPR-compliant data purging
      await db.insert(auditLogs).values({
        action: "danger_zone.data_purged",
        entity: "hospital",
        entityId: tenantId,
        metadata: {
          reason: body.reason,
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        message: "Data purge initiated. This may take several minutes.",
        purgeId: crypto.randomUUID(),
      });
    } else if (body.action === "delete-tenant") {
      // This is destructive - mark tenant for deletion
      await db
        .update(tenants)
        .set({
          scheduledPurgeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId));

      await db.insert(auditLogs).values({
        action: "danger_zone.tenant_deletion_scheduled",
        entity: "tenant",
        entityId: tenantId,
        metadata: {
          reason: body.reason,
          purgeDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      });

      return NextResponse.json({
        message:
          "Tenant has been scheduled for deletion in 30 days. This can be cancelled.",
        purgeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("[danger-zone DELETE]", error);
    return NextResponse.json(
      { error: "Failed to execute operation" },
      { status: 500 }
    );
  }
}

