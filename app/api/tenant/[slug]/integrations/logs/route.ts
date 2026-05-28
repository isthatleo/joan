import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantBySlug, getTenantIntegrationOverview, listTenantApiKeys, listTenantIntegrationLogs, listTenantWebhooks } from "@/lib/tenant-integrations";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const limit = Math.min(200, Math.max(10, Number(new URL(request.url).searchParams.get("limit") || 50)));

  const [logs, overview, webhooks, apiKeys, activeIntegrations] = await Promise.all([
    listTenantIntegrationLogs(tenant.id, limit),
    getTenantIntegrationOverview(tenant.id),
    listTenantWebhooks(tenant.id),
    listTenantApiKeys(tenant.id),
    db
      .select({
        id: integrations.id,
        provider: integrations.provider,
        status: integrations.status,
        isActive: integrations.isActive,
        lastTestedAt: integrations.lastTestedAt,
        testError: integrations.testError,
        updatedAt: integrations.updatedAt,
      })
      .from(integrations)
      .where(and(eq(integrations.tenantId, tenant.id), isNull(integrations.deletedAt))),
  ]);

  return NextResponse.json({
    overview,
    logs,
    webhooks: webhooks.map((item) => ({
      id: item.id,
      name: item.name,
      url: item.url,
      events: item.events,
      isActive: item.isActive,
      status: item.status,
      lastTestedAt: item.lastTestedAt,
      lastDeliveredAt: item.lastDeliveredAt,
      lastError: item.lastError,
      lastStatusCode: item.lastStatusCode,
      updatedAt: item.updatedAt,
    })),
    apiKeys: apiKeys.map((item) => ({
      id: item.id,
      name: item.name,
      prefix: item.prefix,
      maskedSecret: item.maskedSecret,
      status: item.status,
      scopes: item.scopes,
      environment: item.environment,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      lastUsedAt: item.lastUsedAt,
      lastRotatedAt: item.lastRotatedAt,
      revokedAt: item.revokedAt,
    })),
    activeIntegrations,
  });
}
