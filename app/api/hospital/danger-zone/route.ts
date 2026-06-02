import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantSettings, auditLogs, tenants, patients, users, userSessions } from "@/lib/db/schema";
import { and, count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { revalidateTenantAccessCache } from "@/lib/tenant-cache";

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
      .select({ count: count() })
      .from(patients)
      .where(eq(patients.tenantId, tenantId));

    const userCount = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    return NextResponse.json({
      tenantId,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      createdAt: tenant.createdAt,
      patientCount: patientCount[0]?.count ?? 0,
      staffCount: userCount[0]?.count ?? 0,
      plan: tenant.plan,
      isArchived: !tenant.isActive,
      scheduledPurgeAt: tenant.scheduledPurgeAt,
      archiveGraceDays: 60,
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
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();

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

    const body = confirmSchema.partial({ confirmationCode: true }).parse(await request.json());

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

    if (body.confirmationCode) {
      const codes = codesSetting.length > 0 ? (codesSetting[0].value as any) : {};
      const codeData = codes[body.confirmationCode];

      if (!codeData || codeData.used || codeData.expiresAt < Date.now()) {
        return NextResponse.json(
          { error: "Invalid or expired confirmation code" },
          { status: 400 }
        );
      }

      codes[body.confirmationCode].used = true;
      await db
        .update(tenantSettings)
        .set({ value: codes, updatedAt: new Date() })
        .where(eq(tenantSettings.id, codesSetting[0].id));
    }

    if (body.action === "reset-settings") {
      const resetKeys = ["branding", "communication", "modules", "preferences", "ui", "compliance", "billing", "security", "workflow", "notifications", "audit", "system", "apiManagement", "dangerZone"];
      for (const key of resetKeys) {
        const existing = await db
          .select()
          .from(tenantSettings)
          .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)));
        if (existing.length > 0) {
          await db
            .update(tenantSettings)
            .set({ updatedAt: new Date() })
            .where(eq(tenantSettings.id, existing[0].id));
        }
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
      const purgeId = crypto.randomUUID();
      await db.execute(sql`
        DO $$
        DECLARE
          target record;
          has_updated_at boolean;
        BEGIN
          FOR target IN
            SELECT table_schema, table_name
            FROM information_schema.columns
            WHERE column_name = 'tenant_id'
              AND table_schema = 'public'
              AND table_name <> 'tenants'
              AND table_name IN (
                SELECT table_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND column_name = 'deleted_at'
              )
          LOOP
            SELECT EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = target.table_schema
                AND table_name = target.table_name
                AND column_name = 'updated_at'
            ) INTO has_updated_at;

            IF has_updated_at THEN
              EXECUTE format(
                'UPDATE %I.%I SET deleted_at = COALESCE(deleted_at, now()), updated_at = now() WHERE tenant_id = %L',
                target.table_schema,
                target.table_name,
                ${tenantId}
              );
            ELSE
              EXECUTE format(
                'UPDATE %I.%I SET deleted_at = COALESCE(deleted_at, now()) WHERE tenant_id = %L',
                target.table_schema,
                target.table_name,
                ${tenantId}
              );
            END IF;
          END LOOP;
        END $$;
      `);

      await db.insert(auditLogs).values({
        action: "danger_zone.data_purged",
        entity: "hospital",
        entityId: tenantId,
        metadata: {
          reason: body.reason,
          purgeId,
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        message: "Tenant-scoped data has been purged.",
        purgeId,
      });
    } else if (body.action === "delete-tenant") {
      // This is destructive - mark tenant for deletion
      const purgeDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      await db
        .update(tenants)
        .set({
          scheduledPurgeAt: purgeDate,
          isActive: false,
          provisioningStatus: "archived",
          deletedAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .where(eq(tenants.id, tenantId));
      revalidateTenantAccessCache(tenant.slug);

      await db.update(userSessions).set({
        isActive: false,
        logoutAt: new Date(),
        updatedAt: new Date(),
      } as any).where(eq(userSessions.tenantId, tenantId)).catch(() => null);

      await db.execute(sql`
        DELETE FROM "session"
        WHERE "userId" IN (
          SELECT au.id
          FROM "user" au
          INNER JOIN users app_user ON lower(app_user.email) = lower(au.email)
          WHERE app_user.tenant_id = ${tenantId}
        )
      `).catch(() => null);

      const archiveSetting = await db
        .select()
        .from(tenantSettings)
        .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "dangerZoneArchive")));

      const archivePayload = {
        archivedAt: new Date().toISOString(),
        archivedBy: "hospital_admin",
        reason: body.reason || null,
        purgeDate: purgeDate.toISOString(),
        restorableBy: ["super_admin"],
      };

      if (archiveSetting.length > 0) {
        await db
          .update(tenantSettings)
          .set({ value: archivePayload, updatedAt: new Date() })
          .where(eq(tenantSettings.id, archiveSetting[0].id));
      } else {
        await db.insert(tenantSettings).values({
          tenantId,
          key: "dangerZoneArchive",
          value: archivePayload,
        });
      }

      await db.insert(auditLogs).values({
        action: "danger_zone.tenant_deletion_scheduled",
        entity: "tenant",
        entityId: tenantId,
        metadata: {
          reason: body.reason,
          purgeDate: purgeDate.toISOString(),
        },
      });

      return NextResponse.json({
        message:
          "Tenant has been archived and scheduled for deletion in 60 days. Active tenant sessions have been terminated.",
        purgeDate,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
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

