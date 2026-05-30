import { NextRequest, NextResponse } from "next/server";
import { decryptSecret } from "@/lib/crypto";
import { listTenantApiKeys, logTenantIntegrationEvent, saveTenantApiKeys } from "@/lib/tenant-integrations";
import { requireTenantIntegrationAdmin } from "@/lib/tenant-integration-access";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const { slug, id } = await params;
    const access = await requireTenantIntegrationAdmin(request.headers, slug);
    if (!access.ok) return access.response;

    const apiKeys = await listTenantApiKeys(access.tenant.id);
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
      access.tenant.id,
      apiKeys.map((item) => (item.id === id ? updated : item)),
      access.userId
    );
    await logTenantIntegrationEvent({
      tenantId: access.tenant.id,
      userId: access.userId,
      action: "tenant.integration_api_key_revealed",
      entity: "integration_api_key",
      entityId: id,
      metadata: { name: existing.name },
    });

    return NextResponse.json({ secret: revealed });
  } catch (error: any) {
    console.error("[tenant integration api-key:reveal]", error);
    return NextResponse.json({ error: error?.message || "Failed to reveal API key" }, { status: 500 });
  }
}
