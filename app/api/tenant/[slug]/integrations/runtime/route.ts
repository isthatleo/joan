import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdmin } from "@/lib/tenant-staff";
import { db } from "@/lib/db";
import { auditLogs, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createTenantPaymentIntent,
  dispatchTenantIntegrationEvent,
  sendTenantRuntimeEmail,
  sendTenantRuntimeSms,
  trackTenantAnalyticsEvent,
  uploadTenantObject,
} from "@/lib/integrations/runtime";

async function getTenant(slug: string) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return tenant || null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenant(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const admin = await requireTenantAdmin(request.headers, tenant.id);
  if (!admin.ok) return NextResponse.json({ error: admin.error || "Forbidden" }, { status: admin.status || 403 });

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "");
  if (!action) return NextResponse.json({ error: "Action is required" }, { status: 400 });

  let result: unknown;
  if (action === "send-email") {
    result = await sendTenantRuntimeEmail(slug, body.payload || {});
  } else if (action === "send-sms") {
    result = await sendTenantRuntimeSms(slug, String(body.payload?.phone || ""), String(body.payload?.message || ""));
  } else if (action === "create-payment") {
    result = await createTenantPaymentIntent(slug, body.payload || {});
  } else if (action === "upload-object") {
    result = await uploadTenantObject(slug, {
      key: String(body.payload?.key || `integration-test-${Date.now()}.txt`),
      content: String(body.payload?.content || "Joan tenant integration upload test"),
      contentType: body.payload?.contentType || "text/plain",
      metadata: body.payload?.metadata || {},
    });
  } else if (action === "track-event") {
    result = await trackTenantAnalyticsEvent(slug, body.payload || {});
  } else if (action === "dispatch-event") {
    result = await dispatchTenantIntegrationEvent(slug, body.payload || {});
  } else {
    return NextResponse.json({ error: "Unsupported runtime action" }, { status: 400 });
  }

  await db.insert(auditLogs).values({
    tenantId: tenant.id,
    userId: admin.user?.id || null,
    action: `tenant.integration_runtime.${action}`,
    entity: "integration",
    entityId: tenant.id,
    metadata: { action, result },
  });

  return NextResponse.json({ ok: true, result });
}
