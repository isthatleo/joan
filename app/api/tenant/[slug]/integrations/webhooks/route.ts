import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getTenantBySlug,
  listTenantWebhooks,
  logTenantIntegrationEvent,
  saveTenantWebhooks,
  TenantWebhookRecord,
} from "@/lib/tenant-integrations";
import { decryptSecret, maskSecret, encryptSecret } from "@/lib/crypto";
import crypto from "crypto";

function sanitizeWebhook(record: TenantWebhookRecord) {
  return {
    ...record,
    secretMasked: maskSecret(decryptSecret(record.secretEncrypted)),
    secretEncrypted: undefined,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const webhooks = await listTenantWebhooks(tenant.id);
  return NextResponse.json({ webhooks: webhooks.map(sanitizeWebhook) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

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

  const current = await listTenantWebhooks(tenant.id);
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
    createdBy: session.user.id,
    lastDeliveredAt: null,
    lastError: null,
    lastStatusCode: null,
    lastTestedAt: null,
  };

  await saveTenantWebhooks(tenant.id, [...current, created], session.user.id);
  await logTenantIntegrationEvent({
    tenantId: tenant.id,
    userId: session.user.id,
    action: "tenant.integration_webhook_created",
    entity: "integration_webhook",
    entityId: created.id,
    metadata: { name: created.name, url: created.url, events: created.events, isActive: created.isActive },
  });

  return NextResponse.json({ webhook: sanitizeWebhook(created) }, { status: 201 });
}
