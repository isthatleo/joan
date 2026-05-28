import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, notifications, users } from "@/lib/db/schema";
import { getTenantAccess } from "@/lib/api/tenant-access";
import { listActiveProviders } from "@/lib/integrations/server";
import { sendTenantCollaborationAlert } from "@/lib/integrations/collaboration";
import { NotificationService } from "@/lib/services/notification.service";
import {
  getTenantNotificationOverview,
  getTenantNotificationSettings,
  isWithinQuietHours,
  normalizeTenantNotificationSettings,
} from "@/lib/tenant-notifications";

type ChannelResult = {
  channel: "email" | "sms" | "push" | "in_app" | "slack";
  ok: boolean;
  status: "sent" | "skipped" | "failed" | "suppressed";
  detail: string;
};

async function resolveActor(headers: Headers) {
  const session = await auth.api.getSession({ headers }).catch(() => null as any);
  if (!session?.user?.email) return null;

  return db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
  });
}

function getEnabledCategories(settings: ReturnType<typeof normalizeTenantNotificationSettings>) {
  return [
    settings.systemAlerts ? "system_alerts" : null,
    settings.emergencyEvents ? "emergency_events" : null,
    settings.appointmentReminders ? "appointment_reminders" : null,
    settings.labResults ? "lab_results" : null,
    settings.billingUpdates ? "billing_updates" : null,
    settings.productUpdates ? "product_updates" : null,
  ].filter(Boolean);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) {
    return NextResponse.json({ error: access.reason || "Forbidden" }, { status: access.status });
  }

  const [settings, overview, activeProviders, recentAudit] = await Promise.all([
    getTenantNotificationSettings(access.tenant.id),
    getTenantNotificationOverview(access.tenant.id),
    listActiveProviders(access.tenant.id),
    db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, access.tenant.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10),
  ]);

  return NextResponse.json({
    tenant: { id: access.tenant.id, slug: access.tenant.slug, name: access.tenant.name },
    settings,
    overview,
    activeProviders,
    enabledCategories: getEnabledCategories(settings),
    recentAudit,
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) {
    return NextResponse.json({ error: access.reason || "Forbidden" }, { status: access.status });
  }
  if (!access.canEditSettings) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "");
  const overrideSettings = normalizeTenantNotificationSettings(body?.settings || {});
  const persistedSettings = await getTenantNotificationSettings(access.tenant.id);
  const settings = body?.useDraftSettings ? overrideSettings : normalizeTenantNotificationSettings({
    ...persistedSettings,
    ...(body?.settings || {}),
  });
  const actor = await resolveActor(request.headers);

  if (action === "export") {
    const overview = await getTenantNotificationOverview(access.tenant.id);
    const activeProviders = await listActiveProviders(access.tenant.id);
    await db.insert(auditLogs).values({
      tenantId: access.tenant.id,
      userId: actor?.id || access.user?.id || null,
      action: "tenant.notifications_exported",
      entity: "notification_settings",
      entityId: access.tenant.id,
      metadata: { settings, overview },
    });
    return NextResponse.json({
      tenant: { id: access.tenant.id, slug: access.tenant.slug, name: access.tenant.name },
      exportedAt: new Date().toISOString(),
      settings,
      overview,
      activeProviders,
      enabledCategories: getEnabledCategories(settings),
    });
  }

  if (action === "test") {
    const tenant = access.tenant;
    const currentUser = actor || access.user;
    if (!currentUser) {
      return NextResponse.json({ error: "Current user not found" }, { status: 404 });
    }

    const notificationService = new NotificationService();
    const quietHoursActive = isWithinQuietHours(settings);
    const channelResults: ChannelResult[] = [];
    const testTitle = "Tenant notification test";
    const testMessage = `Notification channels were tested for ${tenant.name}.`;
    const testMetadata = {
      severity: "info",
      source: "tenant-settings",
      category: "system_alerts",
      testedAt: new Date().toISOString(),
    };

    const allowNonCritical = !quietHoursActive;

    if (settings.inAppEnabled || settings.pushEnabled) {
      try {
        await db.insert(notifications).values({
          tenantId: tenant.id,
          userId: currentUser.id,
          type: settings.pushEnabled ? "push" : "in_app",
          title: testTitle,
          message: testMessage,
          metadata: testMetadata,
          read: false,
        });
        channelResults.push({
          channel: settings.pushEnabled ? "push" : "in_app",
          ok: true,
          status: "sent",
          detail: settings.pushEnabled ? "In-app and push notification queued." : "In-app notification queued.",
        });
      } catch (error: any) {
        channelResults.push({
          channel: settings.pushEnabled ? "push" : "in_app",
          ok: false,
          status: "failed",
          detail: error?.message || "Failed to queue in-app notification",
        });
      }
    } else {
      channelResults.push({ channel: "in_app", ok: true, status: "skipped", detail: "In-app delivery disabled." });
    }

    if (settings.emailEnabled) {
      if (!allowNonCritical) {
        channelResults.push({ channel: "email", ok: true, status: "suppressed", detail: "Email suppressed by quiet hours policy." });
      } else if (!currentUser.email) {
        channelResults.push({ channel: "email", ok: false, status: "failed", detail: "Current user has no email address." });
      } else {
        try {
          await notificationService.sendEmail(currentUser.email, testTitle, testMessage, { tenantSlug: tenant.slug });
          channelResults.push({ channel: "email", ok: true, status: "sent", detail: `Email sent to ${currentUser.email}.` });
        } catch (error: any) {
          channelResults.push({ channel: "email", ok: false, status: "failed", detail: error?.message || "Email send failed" });
        }
      }
    } else {
      channelResults.push({ channel: "email", ok: true, status: "skipped", detail: "Email delivery disabled." });
    }

    if (settings.smsEnabled) {
      if (!allowNonCritical) {
        channelResults.push({ channel: "sms", ok: true, status: "suppressed", detail: "SMS suppressed by quiet hours policy." });
      } else if (!currentUser.phone) {
        channelResults.push({ channel: "sms", ok: false, status: "failed", detail: "Current user has no phone number." });
      } else {
        try {
          await notificationService.sendSMS(currentUser.phone, `${testTitle}: ${testMessage}`, { tenantSlugOrId: tenant.id });
          channelResults.push({ channel: "sms", ok: true, status: "sent", detail: `SMS sent to ${currentUser.phone}.` });
        } catch (error: any) {
          channelResults.push({ channel: "sms", ok: false, status: "failed", detail: error?.message || "SMS send failed" });
        }
      }
    } else {
      channelResults.push({ channel: "sms", ok: true, status: "skipped", detail: "SMS delivery disabled." });
    }

    if (settings.slackEnabled) {
      if (!allowNonCritical) {
        channelResults.push({ channel: "slack", ok: true, status: "suppressed", detail: "Slack suppressed by quiet hours policy." });
      } else {
        const results = await sendTenantCollaborationAlert(tenant.id, testMessage, { title: testTitle });
        const slackResult = results.find((item) => item.provider === "slack");
        if (slackResult) {
          channelResults.push({
            channel: "slack",
            ok: slackResult.ok,
            status: slackResult.ok ? "sent" : "failed",
            detail: slackResult.ok ? "Slack webhook accepted the message." : (slackResult.error || "Slack delivery failed"),
          });
        } else {
          channelResults.push({ channel: "slack", ok: false, status: "failed", detail: "No active Slack integration is configured." });
        }
      }
    } else {
      channelResults.push({ channel: "slack", ok: true, status: "skipped", detail: "Slack delivery disabled." });
    }

    await db.insert(auditLogs).values({
      tenantId: tenant.id,
      userId: currentUser.id,
      action: "tenant.notifications_tested",
      entity: "notification_settings",
      entityId: tenant.id,
      metadata: {
        settings,
        results: channelResults,
        quietHoursActive,
      },
    });

    return NextResponse.json({
      ok: channelResults.every((item) => item.ok || item.status === "skipped" || item.status === "suppressed"),
      quietHoursActive,
      channels: channelResults,
      summary: {
        enabledChannels: [
          settings.emailEnabled ? "email" : null,
          settings.smsEnabled ? "sms" : null,
          settings.pushEnabled ? "push" : null,
          settings.inAppEnabled ? "in_app" : null,
          settings.slackEnabled ? "slack" : null,
        ].filter(Boolean),
        enabledCategories: getEnabledCategories(settings),
      },
      preview: {
        title: testTitle,
        message: testMessage,
        metadata: testMetadata,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
