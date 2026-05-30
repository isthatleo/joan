import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, notifications, tenantSettings } from "@/lib/db/schema";

export const DEFAULT_TENANT_NOTIFICATION_SETTINGS = {
  emailEnabled: true,
  smsEnabled: false,
  pushEnabled: true,
  inAppEnabled: true,
  slackEnabled: false,
  soundEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "06:00",
  allowCriticalDuringQuietHours: true,
  systemAlerts: true,
  emergencyEvents: true,
  appointmentReminders: true,
  labResults: true,
  billingUpdates: true,
  productUpdates: false,
} as const;

export type TenantNotificationSettings = typeof DEFAULT_TENANT_NOTIFICATION_SETTINGS;

function normalizeTime(value: unknown, fallback: string) {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

export function normalizeTenantNotificationSettings(
  value?: Partial<TenantNotificationSettings> | Record<string, any> | null,
): TenantNotificationSettings {
  return {
    ...DEFAULT_TENANT_NOTIFICATION_SETTINGS,
    ...(value || {}),
    quietHoursStart: normalizeTime(value?.quietHoursStart, DEFAULT_TENANT_NOTIFICATION_SETTINGS.quietHoursStart),
    quietHoursEnd: normalizeTime(value?.quietHoursEnd, DEFAULT_TENANT_NOTIFICATION_SETTINGS.quietHoursEnd),
  };
}

export async function getTenantNotificationSettings(tenantId: string) {
  const [row] = await db
    .select()
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "notifications")))
    .limit(1);

  return normalizeTenantNotificationSettings((row?.value as Record<string, any> | undefined) || null);
}

export async function upsertTenantNotificationSettings(tenantId: string, value: TenantNotificationSettings) {
  const [existing] = await db
    .select()
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "notifications")))
    .limit(1);

  if (existing) {
    await db
      .update(tenantSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(tenantSettings.id, existing.id));
    return;
  }

  await db.insert(tenantSettings).values({
    tenantId,
    key: "notifications",
    value,
  });
}

export function isWithinQuietHours(settings: TenantNotificationSettings, now = new Date()) {
  if (!settings.quietHoursEnabled) return false;

  const [startHour, startMinute] = settings.quietHoursStart.split(":").map((part) => Number.parseInt(part, 10));
  const [endHour, endMinute] = settings.quietHoursEnd.split(":").map((part) => Number.parseInt(part, 10));
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) return false;
  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export async function getTenantNotificationOverview(tenantId: string) {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const auditSince = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  const recentNotifications = await db.query.notifications.findMany({
    where: and(eq(notifications.tenantId, tenantId), gte(notifications.createdAt, since)),
    orderBy: desc(notifications.createdAt),
    limit: 20,
  });

  const recentAuditEvents = await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.tenantId, tenantId), gte(auditLogs.createdAt, auditSince)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(20);

  const dayAgo = Date.now() - 1000 * 60 * 60 * 24;
  const monthAgo = Date.now() - 1000 * 60 * 60 * 24 * 30;
  const recentEvents = recentNotifications.map((item) => ({
    id: item.id,
    type: item.type || "notification",
    title: item.title || "Notification",
    message: item.message || "",
    createdAt: item.createdAt?.toISOString?.() || item.createdAt,
    read: item.read,
    metadata: item.metadata || {},
  }));

  return {
    sentLast24h: recentNotifications.filter((item) => item.createdAt && item.createdAt.getTime() >= dayAgo).length,
    unreadCount: recentNotifications.filter((item) => item.read === false).length,
    criticalLast7d: recentNotifications.filter((item) => String((item.metadata as any)?.severity || "").toLowerCase() === "critical").length,
    activityLast30d: recentAuditEvents.filter((item) => item.createdAt && item.createdAt.getTime() >= monthAgo).length,
    recentEvents,
  };
}
