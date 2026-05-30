import { NextRequest, NextResponse } from "next/server";
import { decryptSecret, maskSecret } from "@/lib/crypto";
import {
  listTenantWebhooks,
  logTenantIntegrationEvent,
  saveTenantWebhooks,
} from "@/lib/tenant-integrations";
import { requireTenantIntegrationAdmin } from "@/lib/tenant-integration-access";

function sanitizeWebhook(record: any) {
  return {
    ...record,
    secretMasked: maskSecret(decryptSecret(record.secretEncrypted)),
    secretEncrypted: undefined,
  };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const { slug, id } = await params;
    const access = await requireTenantIntegrationAdmin(request.headers, slug);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const webhooks = await listTenantWebhooks(access.tenant.id);
    const existing = webhooks.find((item) => item.id === id);
    if (!existing) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

    const updated = {
      ...existing,
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : existing.name,
      url: typeof body.url === "string" && body.url.trim() ? body.url.trim() : existing.url,
      events: Array.isArray(body.events) ? body.events.map(String).filter(Boolean) : existing.events,
      isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
      status: typeof body.isActive === "boolean" ? (body.isActive ? "active" : "inactive") : existing.status,
      updatedAt: new Date().toISOString(),
    };

    try {
      const parsed = new URL(updated.url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json({ error: "Webhook URL must use http or https" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Webhook URL is invalid" }, { status: 400 });
    }

    await saveTenantWebhooks(
      access.tenant.id,
      webhooks.map((item) => (item.id === id ? updated : item)),
      access.userId
    );
    await logTenantIntegrationEvent({
      tenantId: access.tenant.id,
      userId: access.userId,
      action: "tenant.integration_webhook_updated",
      entity: "integration_webhook",
      entityId: updated.id,
      metadata: { name: updated.name, url: updated.url, events: updated.events, isActive: updated.isActive },
    });

    return NextResponse.json({ webhook: sanitizeWebhook(updated) });
  } catch (error: any) {
    console.error("[tenant integration webhook:patch]", error);
    return NextResponse.json({ error: error?.message || "Failed to update webhook" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const { slug, id } = await params;
    const access = await requireTenantIntegrationAdmin(request.headers, slug);
    if (!access.ok) return access.response;

    const webhooks = await listTenantWebhooks(access.tenant.id);
    const existing = webhooks.find((item) => item.id === id);
    if (!existing) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

    await saveTenantWebhooks(
      access.tenant.id,
      webhooks.filter((item) => item.id !== id),
      access.userId
    );
    await logTenantIntegrationEvent({
      tenantId: access.tenant.id,
      userId: access.userId,
      action: "tenant.integration_webhook_deleted",
      entity: "integration_webhook",
      entityId: id,
      metadata: { name: existing.name, url: existing.url },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[tenant integration webhook:delete]", error);
    return NextResponse.json({ error: error?.message || "Failed to delete webhook" }, { status: 500 });
  }
}
