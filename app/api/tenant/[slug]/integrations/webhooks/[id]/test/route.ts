import { NextRequest, NextResponse } from "next/server";
import {
  listTenantWebhooks,
  logTenantIntegrationEvent,
  saveTenantWebhooks,
  testTenantWebhook,
} from "@/lib/tenant-integrations";
import { requireTenantIntegrationAdmin } from "@/lib/tenant-integration-access";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  let access: Awaited<ReturnType<typeof requireTenantIntegrationAdmin>> | null = null;
  let webhooks: Awaited<ReturnType<typeof listTenantWebhooks>> = [];
  let existing: Awaited<ReturnType<typeof listTenantWebhooks>>[number] | undefined;
  let id = "";

  try {
    const resolved = await params;
    id = resolved.id;
    access = await requireTenantIntegrationAdmin(request.headers, resolved.slug);
    if (!access.ok) return access.response;

    webhooks = await listTenantWebhooks(access.tenant.id);
    existing = webhooks.find((item) => item.id === id);
    if (!existing) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

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
      access.tenant.id,
      webhooks.map((item) => (item.id === id ? updated : item)),
      access.userId
    );
    await logTenantIntegrationEvent({
      tenantId: access.tenant.id,
      userId: access.userId,
      action: result.ok ? "tenant.integration_webhook_test_succeeded" : "tenant.integration_webhook_test_failed",
      entity: "integration_webhook",
      entityId: id,
      metadata: { name: existing.name, url: existing.url, result },
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error: any) {
    console.error("[tenant integration webhook:test]", error);
    if (access?.ok && existing) {
      const updated = {
        ...existing,
        status: "error" as const,
        lastTestedAt: new Date().toISOString(),
        lastError: error?.message || "Webhook test failed",
        updatedAt: new Date().toISOString(),
      };
      await saveTenantWebhooks(
        access.tenant.id,
        webhooks.map((item) => (item.id === id ? updated : item)),
        access.userId
      ).catch(() => null);
      await logTenantIntegrationEvent({
        tenantId: access.tenant.id,
        userId: access.userId,
        action: "tenant.integration_webhook_test_failed",
        entity: "integration_webhook",
        entityId: id,
        metadata: { name: existing.name, url: existing.url, error: error?.message || "Webhook test failed" },
      }).catch(() => null);
    }
    return NextResponse.json({ ok: false, message: error?.message || "Webhook test failed" }, { status: 500 });
  }
}
