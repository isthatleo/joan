import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { getTenantBySlug, listTenantApiKeys, logTenantIntegrationEvent, saveTenantApiKeys } from "@/lib/tenant-integrations";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, id } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const apiKeys = await listTenantApiKeys(tenant.id);
  const existing = apiKeys.find((item) => item.id === id);
  if (!existing) return NextResponse.json({ error: "API key not found" }, { status: 404 });
  if (existing.status !== "active") {
    return NextResponse.json({ error: "Revoked API keys cannot be revealed" }, { status: 400 });
  }

  const revealed = decryptSecret(existing.secretEncrypted);
  const updated = {
    ...existing,
    lastUsedAt: new Date().toISOString(),
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
    action: "tenant.integration_api_key_revealed",
    entity: "integration_api_key",
    entityId: id,
    metadata: { name: existing.name },
  });

  return NextResponse.json({ secret: revealed });
}
