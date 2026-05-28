import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { decryptSecret, maskSecret } from "@/lib/crypto";
import {
  getTenantBySlug,
  listTenantWebhooks,
  logTenantIntegrationEvent,
  saveTenantWebhooks,
} from "@/lib/tenant-integrations";

function sanitizeWebhook(record: any) {
  return {
    ...record,
    secretMasked: maskSecret(decryptSecret(record.secretEncrypted)),
    secretEncrypted: undefined,
  };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, id } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const webhooks = await listTenantWebhooks(tenant.id);
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
    tenant.id,
    webhooks.map((item) => (item.id === id ? updated : item)),
    session.user.id
  );
  await logTenantIntegrationEvent({
    tenantId: tenant.id,
    userId: session.user.id,
    action: "tenant.integration_webhook_updated",
    entity: "integration_webhook",
    entityId: updated.id,
    metadata: { name: updated.name, url: updated.url, events: updated.events, isActive: updated.isActive },
  });

  return NextResponse.json({ webhook: sanitizeWebhook(updated) });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, id } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const webhooks = await listTenantWebhooks(tenant.id);
  const existing = webhooks.find((item) => item.id === id);
  if (!existing) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

  await saveTenantWebhooks(
    tenant.id,
    webhooks.filter((item) => item.id !== id),
    session.user.id
  );
  await logTenantIntegrationEvent({
    tenantId: tenant.id,
    userId: session.user.id,
    action: "tenant.integration_webhook_deleted",
    entity: "integration_webhook",
    entityId: id,
    metadata: { name: existing.name, url: existing.url },
  });

  return NextResponse.json({ success: true });
}
