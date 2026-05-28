import crypto from "crypto";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, integrations, tenantSettings, tenants, users } from "@/lib/db/schema";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/crypto";

const WEBHOOKS_KEY = "tenantIntegrationWebhooks";
const API_KEYS_KEY = "tenantIntegrationApiKeys";

export type TenantWebhookRecord = {
  id: string;
  name: string;
  url: string;
  events: string[];
  secretEncrypted: string;
  status: "active" | "inactive" | "error";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastTestedAt?: string | null;
  lastDeliveredAt?: string | null;
  lastError?: string | null;
  lastStatusCode?: number | null;
};

export type TenantApiKeyRecord = {
  id: string;
  name: string;
  prefix: string;
  secretEncrypted: string;
  maskedSecret: string;
  status: "active" | "revoked";
  scopes: string[];
  environment: "production" | "staging" | "development";
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastUsedAt?: string | null;
  lastRotatedAt?: string | null;
  revokedAt?: string | null;
};

function normalizeWebhook(record: any): TenantWebhookRecord {
  const secretEncrypted = typeof record?.secretEncrypted === "string" ? record.secretEncrypted : encryptSecret(crypto.randomUUID());
  return {
    id: String(record?.id || crypto.randomUUID()),
    name: String(record?.name || "Webhook"),
    url: String(record?.url || ""),
    events: Array.isArray(record?.events) ? record.events.map(String) : [],
    secretEncrypted,
    status: record?.status === "inactive" || record?.status === "error" ? record.status : "active",
    isActive: record?.isActive !== false,
    createdAt: String(record?.createdAt || new Date().toISOString()),
    updatedAt: String(record?.updatedAt || new Date().toISOString()),
    createdBy: record?.createdBy ? String(record.createdBy) : undefined,
    lastTestedAt: record?.lastTestedAt ? String(record.lastTestedAt) : null,
    lastDeliveredAt: record?.lastDeliveredAt ? String(record.lastDeliveredAt) : null,
    lastError: record?.lastError ? String(record.lastError) : null,
    lastStatusCode: typeof record?.lastStatusCode === "number" ? record.lastStatusCode : null,
  };
}

function normalizeApiKey(record: any): TenantApiKeyRecord {
  const secretEncrypted = typeof record?.secretEncrypted === "string" ? record.secretEncrypted : encryptSecret(`hsk_${crypto.randomBytes(20).toString("hex")}`);
  const plain = decryptSecret(secretEncrypted);
  return {
    id: String(record?.id || crypto.randomUUID()),
    name: String(record?.name || "API Key"),
    prefix: String(record?.prefix || plain.slice(0, 12) || "hsk"),
    secretEncrypted,
    maskedSecret: maskSecret(plain),
    status: record?.status === "revoked" ? "revoked" : "active",
    scopes: Array.isArray(record?.scopes) ? record.scopes.map(String) : ["read", "write"],
    environment: record?.environment === "production" || record?.environment === "staging" ? record.environment : "development",
    createdAt: String(record?.createdAt || new Date().toISOString()),
    updatedAt: String(record?.updatedAt || new Date().toISOString()),
    createdBy: record?.createdBy ? String(record.createdBy) : undefined,
    lastUsedAt: record?.lastUsedAt ? String(record.lastUsedAt) : null,
    lastRotatedAt: record?.lastRotatedAt ? String(record.lastRotatedAt) : null,
    revokedAt: record?.revokedAt ? String(record.revokedAt) : null,
  };
}

async function getSetting(tenantId: string, key: string) {
  const [row] = await db
    .select()
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)))
    .limit(1);
  return row ?? null;
}

async function upsertSetting(tenantId: string, key: string, value: unknown, updatedBy?: string) {
  const existing = await getSetting(tenantId, key);
  if (existing) {
    await db
      .update(tenantSettings)
      .set({ value, updatedAt: new Date(), updatedBy: updatedBy || existing.updatedBy || null })
      .where(eq(tenantSettings.id, existing.id));
    return;
  }

  await db.insert(tenantSettings).values({ tenantId, key, value, updatedBy: updatedBy || null });
}

export async function getTenantBySlug(slug: string) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return tenant ?? null;
}

export async function listTenantWebhooks(tenantId: string) {
  const row = await getSetting(tenantId, WEBHOOKS_KEY);
  const items = Array.isArray(row?.value) ? row.value : [];
  return items.map(normalizeWebhook);
}

export async function saveTenantWebhooks(tenantId: string, webhooks: TenantWebhookRecord[], updatedBy?: string) {
  await upsertSetting(tenantId, WEBHOOKS_KEY, webhooks, updatedBy);
}

export async function listTenantApiKeys(tenantId: string) {
  const row = await getSetting(tenantId, API_KEYS_KEY);
  const items = Array.isArray(row?.value) ? row.value : [];
  return items.map(normalizeApiKey);
}

export async function saveTenantApiKeys(tenantId: string, apiKeys: TenantApiKeyRecord[], updatedBy?: string) {
  await upsertSetting(tenantId, API_KEYS_KEY, apiKeys, updatedBy);
}

export async function logTenantIntegrationEvent(input: {
  tenantId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, any>;
}) {
  await db.insert(auditLogs).values({
    tenantId: input.tenantId,
    userId: input.userId || null,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId || null,
    metadata: input.metadata || {},
  });
}

export function buildWebhookPayload(webhook: TenantWebhookRecord) {
  return {
    event: webhook.events[0] || "tenant.integration.test",
    tenantWebhookId: webhook.id,
    timestamp: new Date().toISOString(),
    data: {
      source: "tenant-settings",
      message: `Test delivery for ${webhook.name}`,
    },
  };
}

export function createWebhookSignature(secret: string, payload: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function testTenantWebhook(webhook: TenantWebhookRecord) {
  const target = new URL(webhook.url);
  if (!["http:", "https:"].includes(target.protocol)) {
    throw new Error("Webhook URL must use http or https");
  }

  const payloadObject = buildWebhookPayload(webhook);
  const payload = JSON.stringify(payloadObject);
  const secret = decryptSecret(webhook.secretEncrypted);
  const signature = createWebhookSignature(secret, payload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(target.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-webhook-id": webhook.id,
        "x-tenant-event": payloadObject.event,
        "x-tenant-signature": signature,
      },
      body: payload,
      signal: controller.signal,
    });
    const text = await response.text().catch(() => "");
    return {
      ok: response.ok,
      statusCode: response.status,
      message: response.ok ? "Webhook responded successfully" : text || `Webhook responded with ${response.status}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function createApiKeySecret(environment: TenantApiKeyRecord["environment"]) {
  const envSegment = environment === "production" ? "prod" : environment === "staging" ? "stg" : "dev";
  return `hsk_${envSegment}_${crypto.randomBytes(20).toString("hex")}`;
}

export async function listTenantIntegrationLogs(tenantId: string, limit = 50) {
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      userFullName: users.fullName,
      userEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(
      and(
        eq(auditLogs.tenantId, tenantId),
        or(
          ilike(auditLogs.action, "tenant.integration%"),
          ilike(auditLogs.action, "tenant.communication%"),
          ilike(auditLogs.action, "tenant.communications%"),
          eq(auditLogs.entity, "integration"),
          eq(auditLogs.entity, "integration_webhook"),
          eq(auditLogs.entity, "integration_api_key"),
          eq(auditLogs.entity, "communication")
        )
      )
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    action: row.action || "tenant.integration.event",
    entity: row.entity || "integration",
    entityId: row.entityId,
    actor: row.userFullName || row.userEmail || "System",
    createdAt: row.createdAt,
    metadata: row.metadata || {},
  }));
}

export async function getTenantIntegrationOverview(tenantId: string) {
  const [webhooks, apiKeys, logs, integrationsCountRow] = await Promise.all([
    listTenantWebhooks(tenantId),
    listTenantApiKeys(tenantId),
    listTenantIntegrationLogs(tenantId, 100),
    db
      .select({ value: sql<number>`count(*)` })
      .from(integrations)
      .where(and(eq(integrations.tenantId, tenantId), sql`${integrations.deletedAt} is null`)),
  ]);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const currentMonthEvents = logs.filter((log) => {
    const createdAt = log.createdAt ? new Date(log.createdAt) : null;
    return createdAt && createdAt >= monthStart;
  }).length;

  return {
    connectedServices: Number(integrationsCountRow[0]?.value || 0),
    activeWebhooks: webhooks.filter((item) => item.isActive && item.status !== "error").length,
    activeApiKeys: apiKeys.filter((item) => item.status === "active").length,
    eventsThisMonth: currentMonthEvents,
  };
}
