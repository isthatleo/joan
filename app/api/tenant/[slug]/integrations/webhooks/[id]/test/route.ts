import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getTenantBySlug,
  listTenantWebhooks,
  logTenantIntegrationEvent,
  saveTenantWebhooks,
  testTenantWebhook,
} from "@/lib/tenant-integrations";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, id } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const webhooks = await listTenantWebhooks(tenant.id);
  const existing = webhooks.find((item) => item.id === id);
  if (!existing) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

  try {
    const result = await testTenantWebhook(existing);
    const updated = {
      ...existing,
      status: result.ok ? "active" : "error",
      lastStatusCode: result.statusCode,
      lastTestedAt: new Date().toISOString(),
      lastDeliveredAt: result.ok ? new Date().toISOString() : existing.lastDeliveredAt,
      lastError: result.ok ? null : result.message,
      updatedAt: new Date().toISOString(),
    };
    await saveTenantWebhooks(
      tenant.id,
      webhooks.map((item) => (item.id === id ? updated : item)),
      session.user.id
    );
    await logTenantIntegrationEvent({
      tenantId: tenant.id,
      userId: session.user.id,
      action: result.ok ? "tenant.integration_webhook_test_succeeded" : "tenant.integration_webhook_test_failed",
      entity: "integration_webhook",
      entityId: id,
      metadata: { name: existing.name, url: existing.url, result },
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error: any) {
    const updated = {
      ...existing,
      status: "error" as const,
      lastTestedAt: new Date().toISOString(),
      lastError: error?.message || "Webhook test failed",
      updatedAt: new Date().toISOString(),
    };
    await saveTenantWebhooks(
      tenant.id,
      webhooks.map((item) => (item.id === id ? updated : item)),
      session.user.id
    );
    await logTenantIntegrationEvent({
      tenantId: tenant.id,
      userId: session.user.id,
      action: "tenant.integration_webhook_test_failed",
      entity: "integration_webhook",
      entityId: id,
      metadata: { name: existing.name, url: existing.url, error: error?.message || "Webhook test failed" },
    });
    return NextResponse.json({ ok: false, message: error?.message || "Webhook test failed" }, { status: 500 });
  }
}
