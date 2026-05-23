// Server-side helper to load active integration credentials for use across the system.
import { db } from "@/lib/db";
import { integrations, tenantSettings, tenants } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { decryptSecret } from "@/lib/crypto";
import { getProvider } from "@/lib/integrations/providers";

export type IntegrationCredentials = Record<string, string>;

/**
 * Load active credentials for a provider, scoped to a tenant.
 * Returns null when no active integration exists. Use in services, edge functions
 * and route handlers to ensure each tenant uses its own keys.
 */
export async function getIntegrationCredentials(
  tenantSlugOrId: string,
  providerId: string
): Promise<IntegrationCredentials | null> {
  let tenantId = tenantSlugOrId;
  // crude slug check (uuid vs slug)
  if (!/^[0-9a-f-]{36}$/i.test(tenantSlugOrId)) {
    const [t] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlugOrId)).limit(1);
    if (!t) return null;
    tenantId = t.id;
  }

  const [row] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.tenantId, tenantId),
        eq(integrations.provider, providerId),
        eq(integrations.isActive, true),
        isNull(integrations.deletedAt)
      )
    )
    .limit(1);
  if (!row) return null;

  const provider = getProvider(providerId);
  const cfg = (row.config || {}) as Record<string, any>;
  const creds: IntegrationCredentials = {};
  for (const f of provider?.fields || []) {
    const v = cfg[f.key];
    if (v == null) continue;
    creds[f.key] = f.type === "password" ? decryptSecret(String(v)) : String(v);
  }
  return creds;
}

export async function listActiveProviders(tenantSlugOrId: string): Promise<string[]> {
  let tenantId = tenantSlugOrId;
  if (!/^[0-9a-f-]{36}$/i.test(tenantSlugOrId)) {
    const [t] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlugOrId)).limit(1);
    if (!t) return [];
    tenantId = t.id;
  }
  const rows = await db
    .select({ provider: integrations.provider })
    .from(integrations)
    .where(
      and(
        eq(integrations.tenantId, tenantId),
        eq(integrations.isActive, true),
        isNull(integrations.deletedAt)
      )
    );
  return rows.map((r) => r.provider);
}

export async function getTenantCommunicationSettings(tenantSlugOrId: string): Promise<Record<string, any>> {
  let tenantId = tenantSlugOrId;
  if (!/^[0-9a-f-]{36}$/i.test(tenantSlugOrId)) {
    const [t] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlugOrId)).limit(1);
    if (!t) return {};
    tenantId = t.id;
  }

  const rows = await db
    .select()
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "communication")));

  if (rows[0]?.value && typeof rows[0].value === "object") {
    return rows[0].value as Record<string, any>;
  }

  const legacyRows = await db
    .select()
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "communications")));

  return legacyRows[0]?.value && typeof legacyRows[0].value === "object"
    ? (legacyRows[0].value as Record<string, any>)
    : {};
}

export async function syncTenantCommunicationProviders(tenantSlugOrId: string) {
  let tenantId = tenantSlugOrId;
  if (!/^[0-9a-f-]{36}$/i.test(tenantSlugOrId)) {
    const [t] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlugOrId)).limit(1);
    if (!t) return null;
    tenantId = t.id;
  }

  const rows = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.tenantId, tenantId), isNull(integrations.deletedAt)));

  const communicationSettings = await getTenantCommunicationSettings(tenantId);
  const activeRows = rows.filter((row) => row.isActive && row.status === "active");

  const emailProviders = activeRows
    .filter((row) => getProvider(row.provider)?.category === "email")
    .map((row) => row.provider);
  const communicationProviders = activeRows
    .filter((row) => getProvider(row.provider)?.category === "communication")
    .map((row) => row.provider);
  const calendarProviders = activeRows
    .filter((row) => getProvider(row.provider)?.category === "calendar")
    .map((row) => row.provider);

  const nextValue = {
    ...communicationSettings,
    emailProvider:
      communicationSettings.emailProvider && emailProviders.includes(communicationSettings.emailProvider)
        ? communicationSettings.emailProvider
        : communicationSettings.emailProvider || emailProviders[0] || "resend",
    smsProvider:
      communicationSettings.smsProvider && communicationProviders.includes(communicationSettings.smsProvider)
        ? communicationSettings.smsProvider
        : communicationSettings.smsProvider || communicationProviders[0] || "twilio",
    integrationsSync: {
      configuredProviders: rows.map((row) => row.provider),
      activeProviders: activeRows.map((row) => row.provider),
      emailProviders,
      communicationProviders,
      calendarProviders,
      syncedAt: new Date().toISOString(),
    },
  };

  const [existing] = await db
    .select()
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "communication")))
    .limit(1);

  if (existing) {
    await db
      .update(tenantSettings)
      .set({ value: nextValue, updatedAt: new Date() })
      .where(eq(tenantSettings.id, existing.id));
  } else {
    await db.insert(tenantSettings).values({
      tenantId,
      key: "communication",
      value: nextValue,
    });
  }

  return nextValue;
}
