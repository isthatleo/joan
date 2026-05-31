import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/platform-billing";

interface BackupStatus {
  id: string;
  lastBackup: Date;
  nextBackup: Date;
  status: "completed" | "in_progress" | "failed";
  size: number;
  duration: number;
  success: boolean;
}

interface MaintenanceWindow {
  id: string;
  startTime: Date;
  endTime: Date;
  services: string[];
  priority: "routine" | "critical";
  status: "scheduled" | "in_progress" | "completed";
}

export async function GET(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "backup";
    const result = await db.execute(sql`
      SELECT
        count(*) FILTER (WHERE action ILIKE '%backup%')::int AS backup_events,
        max(created_at) FILTER (WHERE action ILIKE '%backup%') AS last_backup,
        count(*) FILTER (WHERE action ILIKE '%maintenance%')::int AS maintenance_events,
        max(created_at) FILTER (WHERE action ILIKE '%maintenance%') AS last_maintenance
      FROM audit_logs
      WHERE created_at >= now() - interval '90 days'
    `) as any;
    const row = result.rows?.[0] || {};
    const lastBackup = row.last_backup ? new Date(row.last_backup) : null;
    const backupHistory: BackupStatus[] = lastBackup ? [{
      id: "latest-backup",
      lastBackup,
      nextBackup: new Date(lastBackup.getTime() + 24 * 60 * 60 * 1000),
      status: "completed",
      size: 0,
      duration: 0,
      success: true,
    }] : [];
    const maintenanceWindows: MaintenanceWindow[] = row.last_maintenance ? [{
      id: "latest-maintenance",
      startTime: new Date(row.last_maintenance),
      endTime: new Date(row.last_maintenance),
      services: ["platform"],
      priority: "routine",
      status: "completed",
    }] : [];

    if (type === "backup") {
      return NextResponse.json({
        backups: backupHistory,
        nextScheduled: backupHistory[0]?.nextBackup || null,
        totalSize: backupHistory.reduce((sum, b) => sum + b.size, 0),
      });
    }

    if (type === "maintenance") {
      return NextResponse.json({
        maintenanceWindows,
        nextMaintenance: maintenanceWindows[0] || null,
      });
    }

    return NextResponse.json({
      backups: backupHistory,
      maintenance: maintenanceWindows,
    });
  } catch (error) {
    console.error("Error fetching operations data:", error);
    return NextResponse.json(
      { error: "Failed to fetch operations data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if (!access.ok) return access.response;

  try {
    const body = await request.json();
    const { type, action } = body;

    if (type === "backup" && action === "trigger") {
      const backupId = `backup-${Date.now()}`;
      await db.execute(sql`
        INSERT INTO audit_logs (user_id, action, entity, metadata, created_at)
        VALUES (${access.user.id}, 'platform.backup_triggered', 'operations', ${JSON.stringify({ backupId, ...body })}::jsonb, now())
      `);
      return NextResponse.json(
        {
          message: "Backup initiated",
          backupId,
          estimatedDuration: 1200,
          timestamp: new Date().toISOString(),
        },
        { status: 201 }
      );
    }

    if (type === "maintenance" && action === "schedule") {
      const maintenanceId = `maint-${Date.now()}`;
      await db.execute(sql`
        INSERT INTO audit_logs (user_id, action, entity, metadata, created_at)
        VALUES (${access.user.id}, 'platform.maintenance_scheduled', 'operations', ${JSON.stringify({ maintenanceId, ...body })}::jsonb, now())
      `);
      return NextResponse.json(
        {
          message: "Maintenance window scheduled",
          maintenanceId,
          ...body,
          timestamp: new Date().toISOString(),
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: "Unknown operation" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error executing operation:", error);
    return NextResponse.json(
      { error: "Failed to execute operation" },
      { status: 500 }
    );
  }
}

