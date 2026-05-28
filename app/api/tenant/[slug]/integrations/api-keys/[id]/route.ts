import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getTenantBySlug,
  listTenantApiKeys,
  logTenantIntegrationEvent,
  saveTenantApiKeys,
} from "@/lib/tenant-integrations";

function sanitizeApiKey(record: any) {
  return {
    ...record,
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
  const apiKeys = await listTenantApiKeys(tenant.id);
  const existing = apiKeys.find((item) => item.id === id);
  if (!existing) return NextResponse.json({ error: "API key not found" }, { status: 404 });

  const updated = {
    ...existing,
    name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : existing.name,
    scopes: Array.isArray(body.scopes) ? body.scopes.map(String).filter(Boolean) : existing.scopes,
    environment: body.environment === "production" || body.environment === "staging" ? body.environment : existing.environment,
    updatedAt: new Date().toISOString(),
  };

  await saveTenantApiKeys(
    tenant.id,
    apiKeys.map((item) => (item.id === id ? updated : item)),
    session.user.id
  );
  await logTenantIntegrationEvent({
    tenantId: tenant.id,
    userId: session.user.id,
    action: "tenant.integration_api_key_updated",
    entity: "integration_api_key",
    entityId: updated.id,
    metadata: { name: updated.name, scopes: updated.scopes, environment: updated.environment },
  });

  return NextResponse.json({ apiKey: sanitizeApiKey(updated) });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, id } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const apiKeys = await listTenantApiKeys(tenant.id);
  const existing = apiKeys.find((item) => item.id === id);
  if (!existing) return NextResponse.json({ error: "API key not found" }, { status: 404 });

  const revoked = {
    ...existing,
    status: "revoked" as const,
    revokedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveTenantApiKeys(
    tenant.id,
    apiKeys.map((item) => (item.id === id ? revoked : item)),
    session.user.id
  );
  await logTenantIntegrationEvent({
    tenantId: tenant.id,
    userId: session.user.id,
    action: "tenant.integration_api_key_revoked",
    entity: "integration_api_key",
    entityId: id,
    metadata: { name: existing.name },
  });

  return NextResponse.json({ apiKey: sanitizeApiKey(revoked) });
}
