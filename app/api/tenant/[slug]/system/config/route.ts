import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogs, systemConfigurations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import { getTenantSystemSettings, normalizeTenantSystemSettings, upsertTenantSystemSettings } from "@/lib/tenant-system-settings";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);

  try {
    const [settings, configs] = await Promise.all([
      getTenantSystemSettings(access.tenant.id),
      db.select().from(systemConfigurations).where(eq(systemConfigurations.tenantId, access.tenant.id)),
    ]);
    return NextResponse.json({ settings, configs });
  } catch (error) {
    console.error("Error fetching system config:", error);
    return NextResponse.json({ error: "Failed to fetch system config" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);
  if (!access.canEditSettings) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json().catch(() => ({}));
    const settings = normalizeTenantSystemSettings(body);
    await upsertTenantSystemSettings(access.tenant.id, settings, access.user?.id || null);

    const configEntries = [
      { key: "cpu_threshold", value: settings.cpuThreshold, description: "CPU threshold percentage" },
      { key: "memory_threshold", value: settings.memoryThreshold, description: "Memory threshold percentage" },
      { key: "disk_threshold", value: settings.diskThreshold, description: "Disk threshold percentage" },
      { key: "alert_email", value: settings.alertEmail, description: "Alert email destination" },
      { key: "alert_webhook", value: settings.alertWebhook, description: "Alert webhook destination" },
    ];

    const existing = await db.select().from(systemConfigurations).where(eq(systemConfigurations.tenantId, access.tenant.id));
    for (const entry of configEntries) {
      const found = existing.find((item) => item.key === entry.key);
      if (found) {
        await db.update(systemConfigurations).set({ value: entry.value, description: entry.description, updatedAt: new Date() }).where(eq(systemConfigurations.id, found.id));
      } else {
        await db.insert(systemConfigurations).values({
          tenantId: access.tenant.id,
          key: entry.key,
          value: entry.value,
          description: entry.description,
        });
      }
    }

    if (settings.maintenanceMode) {
      const existingMaintenance = await db.select().from(systemConfigurations).where(and(eq(systemConfigurations.tenantId, access.tenant.id), eq(systemConfigurations.key, "maintenance_mode"))).limit(1);
      if (existingMaintenance[0]) {
        await db.update(systemConfigurations).set({ value: { enabled: true, message: settings.maintenanceMessage }, updatedAt: new Date() }).where(eq(systemConfigurations.id, existingMaintenance[0].id));
      } else {
        await db.insert(systemConfigurations).values({
          tenantId: access.tenant.id,
          key: "maintenance_mode",
          value: { enabled: true, message: settings.maintenanceMessage },
          description: "Tenant maintenance mode policy",
        });
      }
    }

    await db.insert(auditLogs).values({
      tenantId: access.tenant.id,
      userId: access.user?.id || null,
      action: "tenant.system_config_updated",
      entity: "system",
      entityId: access.tenant.id,
      metadata: settings,
    });

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("Error saving system config:", error);
    return NextResponse.json({ error: "Failed to save system config" }, { status: 500 });
  }
}
