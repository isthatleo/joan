import { db } from "@/lib/db";
import { auditLogs, tenantSettings, tenants } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

async function resolveTenantId(tenantSlugOrId: string) {
  if (/^[0-9a-f-]{36}$/i.test(tenantSlugOrId)) return tenantSlugOrId;
  const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, tenantSlugOrId)).limit(1);
  return tenant?.id || null;
}

async function getCustomIntegrations(tenantId: string) {
  const [row] = await db
    .select()
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "communicationCustomIntegrations")))
    .limit(1);

  return Array.isArray(row?.value) ? row.value as any[] : [];
}

export async function dispatchTenantCustomIntegrationEvent(
  tenantSlugOrId: string,
  event: string,
  payload: Record<string, unknown>
) {
  const tenantId = await resolveTenantId(tenantSlugOrId);
  if (!tenantId) return [];

  const integrations = (await getCustomIntegrations(tenantId)).filter((item) => {
    if (item?.status && item.status !== "active") return false;
    if (!Array.isArray(item?.events) || item.events.length === 0) return true;
    return item.events.includes(event);
  });

  const results: Array<{ id: string; name: string; ok: boolean; status?: number; error?: string }> = [];
  for (const integration of integrations) {
    try {
      const response = await fetch(integration.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Joan-Event": event,
          "X-Joan-Tenant": tenantId,
        },
        body: JSON.stringify({
          event,
          tenantId,
          payload,
          sentAt: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(10000),
      });
      results.push({ id: integration.id, name: integration.name, ok: response.ok, status: response.status });
    } catch (error: any) {
      results.push({ id: integration.id, name: integration.name, ok: false, error: error?.message || "Dispatch failed" });
    }
  }

  if (results.length) {
    await db.insert(auditLogs).values({
      tenantId,
      action: "tenant.custom_integration_event_dispatched",
      entity: "communication",
      entityId: tenantId,
      metadata: { event, results },
    });
  }

  return results;
}
