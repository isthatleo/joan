import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createApiKeySecret,
  getTenantBySlug,
  listTenantApiKeys,
  logTenantIntegrationEvent,
  saveTenantApiKeys,
  TenantApiKeyRecord,
} from "@/lib/tenant-integrations";
import { encryptSecret } from "@/lib/crypto";
import crypto from "crypto";

function sanitizeApiKey(record: TenantApiKeyRecord) {
  return {
    ...record,
    secretEncrypted: undefined,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const apiKeys = await listTenantApiKeys(tenant.id);
  return NextResponse.json({ apiKeys: apiKeys.map(sanitizeApiKey) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

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
    createdBy: session.user.id,
    lastUsedAt: null,
    lastRotatedAt: null,
    revokedAt: null,
  };

  const current = await listTenantApiKeys(tenant.id);
  await saveTenantApiKeys(tenant.id, [...current, created], session.user.id);
  await logTenantIntegrationEvent({
    tenantId: tenant.id,
    userId: session.user.id,
    action: "tenant.integration_api_key_created",
    entity: "integration_api_key",
    entityId: created.id,
    metadata: { name: created.name, scopes: created.scopes, environment: created.environment },
  });

  return NextResponse.json({ apiKey: sanitizeApiKey(created), rawSecret: secret }, { status: 201 });
}
