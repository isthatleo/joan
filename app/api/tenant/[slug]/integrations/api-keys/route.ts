import { NextRequest, NextResponse } from "next/server";
import {
  createApiKeySecret,
  listTenantApiKeys,
  logTenantIntegrationEvent,
  saveTenantApiKeys,
  TenantApiKeyRecord,
} from "@/lib/tenant-integrations";
import { encryptSecret } from "@/lib/crypto";
import crypto from "crypto";
import { requireTenantIntegrationAdmin } from "@/lib/tenant-integration-access";

function sanitizeApiKey(record: TenantApiKeyRecord) {
  return {
    ...record,
    secretEncrypted: undefined,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const access = await requireTenantIntegrationAdmin(request.headers, slug);
    if (!access.ok) return access.response;

    const apiKeys = await listTenantApiKeys(access.tenant.id);
    return NextResponse.json({ apiKeys: apiKeys.map(sanitizeApiKey) });
  } catch (error: any) {
    console.error("[tenant integration api-keys:get]", error);
    return NextResponse.json({ error: error?.message || "Failed to load API keys" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const access = await requireTenantIntegrationAdmin(request.headers, slug);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const name = String(body?.name || "").trim();
    const scopes = Array.isArray(body?.scopes) ? body.scopes.map(String).filter(Boolean) : ["read", "write"];
    const environment = body?.environment === "production" || body?.environment === "staging" ? body.environment : "development";

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const secret = createApiKeySecret(environment);
    const created: TenantApiKeyRecord = {
      id: crypto.randomUUID(),
      name,
      prefix: secret.slice(0, 12),
      secretEncrypted: encryptSecret(secret),
      maskedSecret: `${secret.slice(0, 12)}********`,
      status: "active",
      scopes,
      environment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: access.userId,
      lastUsedAt: null,
      lastRotatedAt: null,
      revokedAt: null,
    };

    const current = await listTenantApiKeys(access.tenant.id);
    await saveTenantApiKeys(access.tenant.id, [...current, created], access.userId);
    await logTenantIntegrationEvent({
      tenantId: access.tenant.id,
      userId: access.userId,
      action: "tenant.integration_api_key_created",
      entity: "integration_api_key",
      entityId: created.id,
      metadata: { name: created.name, scopes: created.scopes, environment: created.environment },
    });

    return NextResponse.json({ apiKey: sanitizeApiKey(created), rawSecret: secret }, { status: 201 });
  } catch (error: any) {
    console.error("[tenant integration api-keys:post]", error);
    return NextResponse.json({ error: error?.message || "Failed to create API key" }, { status: 500 });
  }
}
