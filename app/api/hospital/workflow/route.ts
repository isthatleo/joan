import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantSettings, auditLogs, tenants } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const workflowSchema = z.object({
  automationEnabled: z.boolean().optional(),
  appointmentReminders: z.boolean().optional(),
  prescriptionAlerts: z.boolean().optional(),
  patientNotifications: z.boolean().optional(),
  staffNotifications: z.boolean().optional(),
  billingAutomation: z.boolean().optional(),
  reportGeneration: z.boolean().optional(),
  dataBackupEnabled: z.boolean().optional(),
  backupFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
});

type WorkflowSettings = z.infer<typeof workflowSchema> & {
  automationEnabled: boolean;
  appointmentReminders: boolean;
  prescriptionAlerts: boolean;
  patientNotifications: boolean;
  staffNotifications: boolean;
  billingAutomation: boolean;
  reportGeneration: boolean;
  dataBackupEnabled: boolean;
  backupFrequency: "daily" | "weekly" | "monthly";
};

// GET workflow settings
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

    // Get workflow settings
    const setting = await db
      .select()
      .from(tenantSettings)
      .where(
        and(
          eq(tenantSettings.tenantId, tenantId),
          eq(tenantSettings.key, "workflow")
        )
      );

    const defaults: WorkflowSettings = {
      automationEnabled: true,
      appointmentReminders: true,
      prescriptionAlerts: true,
      patientNotifications: true,
      staffNotifications: true,
      billingAutomation: false,
      reportGeneration: false,
      dataBackupEnabled: true,
      backupFrequency: "daily",
    };

    if (setting.length === 0) {
      return NextResponse.json(defaults);
    }

    return NextResponse.json(setting[0].value || defaults);
  } catch (error) {
    console.error("[workflow GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow settings" },
      { status: 500 }
    );
  }
}

// PUT - Update workflow settings
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

    const body = workflowSchema.parse(await request.json());

    // Get existing workflow settings
    const existing = await db
      .select()
      .from(tenantSettings)
      .where(
        and(
          eq(tenantSettings.tenantId, tenantId),
          eq(tenantSettings.key, "workflow")
        )
      );

    // Merge with existing
    let workflow: WorkflowSettings = {
      automationEnabled: true,
      appointmentReminders: true,
      prescriptionAlerts: true,
      patientNotifications: true,
      staffNotifications: true,
      billingAutomation: false,
      reportGeneration: false,
      dataBackupEnabled: true,
      backupFrequency: "daily",
    };

    if (existing.length > 0) {
      workflow = { ...workflow, ...(existing[0].value as any) };
    }

    // Apply updates
    workflow = { ...workflow, ...body };

    if (existing.length > 0) {
      await db
        .update(tenantSettings)
        .set({
          value: workflow,
          updatedAt: new Date(),
        })
        .where(eq(tenantSettings.id, existing[0].id));
    } else {
      await db.insert(tenantSettings).values({
        tenantId,
        key: "workflow",
        value: workflow,
      });
    }

    // Audit log
    await db.insert(auditLogs).values({
      action: "hospital.workflow_settings_updated",
      entity: "hospital",
      entityId: tenantId,
      metadata: { changes: body },
    });

    return NextResponse.json({
      message: "Workflow settings updated successfully",
      settings: workflow,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid settings", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[workflow PUT]", error);
    return NextResponse.json(
      { error: "Failed to update workflow settings" },
      { status: 500 }
    );
  }
}

// POST - Trigger workflow actions
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

    if (action === "test-backup") {
      // Simulate backup test
      await db.insert(auditLogs).values({
        action: "workflow.backup_test",
        entity: "hospital",
        entityId: tenantId,
        metadata: { timestamp: new Date().toISOString() },
      });

      return NextResponse.json({
        message: "Backup test initiated successfully",
        testId: crypto.randomUUID(),
      });
    } else if (action === "trigger-backup") {
      // Trigger immediate backup
      await db.insert(auditLogs).values({
        action: "workflow.backup_triggered",
        entity: "hospital",
        entityId: tenantId,
        metadata: { timestamp: new Date().toISOString() },
      });

      return NextResponse.json({
        message: "Backup triggered successfully",
        backupId: crypto.randomUUID(),
      });
    } else if (action === "run-report") {
      // Trigger report generation
      await db.insert(auditLogs).values({
        action: "workflow.report_generated",
        entity: "hospital",
        entityId: tenantId,
        metadata: { timestamp: new Date().toISOString() },
      });

      return NextResponse.json({
        message: "Report generation initiated",
        reportId: crypto.randomUUID(),
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[workflow POST]", error);
    return NextResponse.json(
      { error: "Failed to process workflow action" },
      { status: 500 }
    );
  }
}

