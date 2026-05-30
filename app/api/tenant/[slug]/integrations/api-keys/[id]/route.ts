import { NextRequest, NextResponse } from "next/server";
import {
  listTenantApiKeys,
  logTenantIntegrationEvent,
  saveTenantApiKeys,
} from "@/lib/tenant-integrations";
import { requireTenantIntegrationAdmin } from "@/lib/tenant-integration-access";

function sanitizeApiKey(record: any) {
  return {
    ...record,
    secretEncrypted: undefined,
  };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const { slug, id } = await params;
    const access = await requireTenantIntegrationAdmin(request.headers, slug);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const apiKeys = await listTenantApiKeys(access.tenant.id);
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
      access.tenant.id,
      apiKeys.map((item) => (item.id === id ? updated : item)),
      access.userId
    );
    await logTenantIntegrationEvent({
      tenantId: access.tenant.id,
      userId: access.userId,
      action: "tenant.integration_api_key_updated",
      entity: "integration_api_key",
      entityId: updated.id,
      metadata: { name: updated.name, scopes: updated.scopes, environment: updated.environment },
    });

    return NextResponse.json({ apiKey: sanitizeApiKey(updated) });
  } catch (error: any) {
    console.error("[tenant integration api-key:patch]", error);
    return NextResponse.json({ error: error?.message || "Failed to update API key" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const { slug, id } = await params;
    const access = await requireTenantIntegrationAdmin(request.headers, slug);
    if (!access.ok) return access.response;

    const apiKeys = await listTenantApiKeys(access.tenant.id);
    const existing = apiKeys.find((item) => item.id === id);
    if (!existing) return NextResponse.json({ error: "API key not found" }, { status: 404 });

    const revoked = {
      ...existing,
      status: "revoked" as const,
      revokedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveTenantApiKeys(
      access.tenant.id,
      apiKeys.map((item) => (item.id === id ? revoked : item)),
      access.userId
    );
    await logTenantIntegrationEvent({
      tenantId: access.tenant.id,
      userId: access.userId,
      action: "tenant.integration_api_key_revoked",
      entity: "integration_api_key",
      entityId: id,
      metadata: { name: existing.name },
    });

    return NextResponse.json({ apiKey: sanitizeApiKey(revoked) });
  } catch (error: any) {
    console.error("[tenant integration api-key:delete]", error);
    return NextResponse.json({ error: error?.message || "Failed to revoke API key" }, { status: 500 });
  }
}
