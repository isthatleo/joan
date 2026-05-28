import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import {
  createApiKeySecret,
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, id } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const apiKeys = await listTenantApiKeys(tenant.id);
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
    tenant.id,
    apiKeys.map((item) => (item.id === id ? rotated : item)),
    session.user.id
  );
  await logTenantIntegrationEvent({
    tenantId: tenant.id,
    userId: session.user.id,
    action: "tenant.integration_api_key_rotated",
    entity: "integration_api_key",
    entityId: id,
    metadata: { name: existing.name },
  });

  return NextResponse.json({ apiKey: sanitizeApiKey(rotated), rawSecret });
}
