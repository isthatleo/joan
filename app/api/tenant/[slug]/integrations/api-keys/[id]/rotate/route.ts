import { NextRequest, NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto";
import {
  createApiKeySecret,
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const { slug, id } = await params;
    const access = await requireTenantIntegrationAdmin(request.headers, slug);
    if (!access.ok) return access.response;

    const apiKeys = await listTenantApiKeys(access.tenant.id);
    const existing = apiKeys.find((item) => item.id === id);
    if (!existing) return NextResponse.json({ error: "API key not found" }, { status: 404 });

    const rawSecret = createApiKeySecret(existing.environment);
    const rotated = {
      ...existing,
      prefix: rawSecret.slice(0, 12),
      secretEncrypted: encryptSecret(rawSecret),
      maskedSecret: `${rawSecret.slice(0, 12)}********`,
      lastRotatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active" as const,
      revokedAt: null,
      lastUsedAt: null,
    };

    await saveTenantApiKeys(
      access.tenant.id,
      apiKeys.map((item) => (item.id === id ? rotated : item)),
      access.userId
    );
    await logTenantIntegrationEvent({
      tenantId: access.tenant.id,
      userId: access.userId,
      action: "tenant.integration_api_key_rotated",
      entity: "integration_api_key",
      entityId: id,
      metadata: { name: existing.name },
    });

    return NextResponse.json({ apiKey: sanitizeApiKey(rotated), rawSecret });
  } catch (error: any) {
    console.error("[tenant integration api-key:rotate]", error);
    return NextResponse.json({ error: error?.message || "Failed to rotate API key" }, { status: 500 });
  }
}
