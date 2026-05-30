import { NextRequest, NextResponse } from "next/server";
import { getTenantIntegrationOverview, listTenantApiKeys, listTenantIntegrationLogs, listTenantWebhooks } from "@/lib/tenant-integrations";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireTenantIntegrationAdmin } from "@/lib/tenant-integration-access";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const access = await requireTenantIntegrationAdmin(request.headers, slug);
    if (!access.ok) return access.response;

    const limit = Math.min(200, Math.max(10, Number(new URL(request.url).searchParams.get("limit") || 50)));

    const [logs, overview, webhooks, apiKeys, activeIntegrations] = await Promise.all([
      listTenantIntegrationLogs(access.tenant.id, limit),
      getTenantIntegrationOverview(access.tenant.id),
      listTenantWebhooks(access.tenant.id),
      listTenantApiKeys(access.tenant.id),
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
        .where(and(eq(integrations.tenantId, access.tenant.id), isNull(integrations.deletedAt))),
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
  } catch (error: any) {
    console.error("[tenant integration logs]", error);
    return NextResponse.json({ error: error?.message || "Failed to load integration console" }, { status: 500 });
  }
}
