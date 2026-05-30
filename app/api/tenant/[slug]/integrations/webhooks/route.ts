import { NextRequest, NextResponse } from "next/server";
import {
  listTenantWebhooks,
  logTenantIntegrationEvent,
  saveTenantWebhooks,
  TenantWebhookRecord,
} from "@/lib/tenant-integrations";
import { decryptSecret, maskSecret, encryptSecret } from "@/lib/crypto";
import crypto from "crypto";
import { requireTenantIntegrationAdmin } from "@/lib/tenant-integration-access";

function sanitizeWebhook(record: TenantWebhookRecord) {
  return {
    ...record,
    secretMasked: maskSecret(decryptSecret(record.secretEncrypted)),
    secretEncrypted: undefined,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const access = await requireTenantIntegrationAdmin(request.headers, slug);
    if (!access.ok) return access.response;

    const webhooks = await listTenantWebhooks(access.tenant.id);
    return NextResponse.json({ webhooks: webhooks.map(sanitizeWebhook) });
  } catch (error: any) {
    console.error("[tenant integration webhooks:get]", error);
    return NextResponse.json({ error: error?.message || "Failed to load webhooks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const access = await requireTenantIntegrationAdmin(request.headers, slug);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const name = String(body?.name || "").trim();
    const url = String(body?.url || "").trim();
    const events = Array.isArray(body?.events) ? body.events.map(String).filter(Boolean) : [];
    const isActive = body?.isActive !== false;
    const secret = String(body?.secret || "").trim();

    if (!name || !url) {
      return NextResponse.json({ error: "Name and URL are required" }, { status: 400 });
    }

    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json({ error: "Webhook URL must use http or https" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Webhook URL is invalid" }, { status: 400 });
    }

    const current = await listTenantWebhooks(access.tenant.id);
    const created: TenantWebhookRecord = {
      id: crypto.randomUUID(),
      name,
      url,
      events,
      secretEncrypted: encryptSecret(secret || crypto.randomBytes(24).toString("hex")),
      status: isActive ? "active" : "inactive",
      isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: access.userId,
      lastDeliveredAt: null,
      lastError: null,
      lastStatusCode: null,
      lastTestedAt: null,
    };

    await saveTenantWebhooks(access.tenant.id, [...current, created], access.userId);
    await logTenantIntegrationEvent({
      tenantId: access.tenant.id,
      userId: access.userId,
      action: "tenant.integration_webhook_created",
      entity: "integration_webhook",
      entityId: created.id,
      metadata: { name: created.name, url: created.url, events: created.events, isActive: created.isActive },
    });

    return NextResponse.json({ webhook: sanitizeWebhook(created) }, { status: 201 });
  } catch (error: any) {
    console.error("[tenant integration webhooks:post]", error);
    return NextResponse.json({ error: error?.message || "Failed to create webhook" }, { status: 500 });
  }
}
