import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import {
  getTenantNotificationOverview,
  getTenantNotificationSettings,
  normalizeTenantNotificationSettings,
  upsertTenantNotificationSettings,
} from "@/lib/tenant-notifications";
import { listActiveProviders } from "@/lib/integrations/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);

  const [settings, overview, activeProviders] = await Promise.all([
    getTenantNotificationSettings(access.tenant.id),
    getTenantNotificationOverview(access.tenant.id),
    listActiveProviders(access.tenant.id),
  ]);

  return NextResponse.json({
    tenant: { id: access.tenant.id, slug: access.tenant.slug, name: access.tenant.name },
    settings,
    overview,
    channelAvailability: {
      email: activeProviders.some((provider) => ["resend", "sendgrid", "mailgun"].includes(provider)),
      sms: activeProviders.includes("twilio"),
      slack: activeProviders.includes("slack"),
      push: true,
      inApp: true,
    },
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getTenantAccess(request, slug);
  if (!access.ok || !access.tenant) return tenantAccessResponse(access);
  if (!access.canEditSettings) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const nextSettings = normalizeTenantNotificationSettings(body?.settings || body || {});
  await upsertTenantNotificationSettings(access.tenant.id, nextSettings);
  await db.insert(auditLogs).values({
    tenantId: access.tenant.id,
    userId: access.user?.id || null,
    action: "tenant.notifications_settings_updated",
    entity: "notification_settings",
    entityId: access.tenant.id,
    metadata: { settings: nextSettings },
  });

  return NextResponse.json({
    ok: true,
    settings: nextSettings,
  });
}
