import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, integrations, tenantSettings, tenants } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import crypto from "crypto";
import { decryptSecret, maskSecret } from "@/lib/crypto";
import { getIntegrationCredentials, getTenantCommunicationSettings, syncTenantCommunicationProviders } from "@/lib/integrations/server";
import { getProvider } from "@/lib/integrations/providers";

async function getTenant(slug: string) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return tenant ?? null;
}

function sanitizeIntegration(row: any) {
  const provider = getProvider(row.provider);
  const cfg = (row.config || {}) as Record<string, any>;
  const maskedConfig: Record<string, any> = {};

  for (const field of provider?.fields || []) {
    const value = cfg[field.key];
    if (value == null || value === "") continue;
    maskedConfig[field.key] = field.type === "password" ? maskSecret(decryptSecret(String(value))) : value;
  }

  return {
    id: row.id,
    provider: row.provider,
    status: row.status,
    isActive: row.isActive,
    accountName: row.accountName,
    accountId: row.accountId,
    lastTestedAt: row.lastTestedAt,
    testError: row.testError,
    config: maskedConfig,
    apiKeyMasked: row.apiKeyEncrypted ? maskSecret(decryptSecret(row.apiKeyEncrypted)) : "",
    apiSecretMasked: row.apiSecretEncrypted ? maskSecret(decryptSecret(row.apiSecretEncrypted)) : "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function upsertTenantSetting(tenantId: string, key: string, value: unknown) {
  const [existing] = await db
    .select()
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)))
    .limit(1);

  if (existing) {
    await db.update(tenantSettings).set({ value, updatedAt: new Date() }).where(eq(tenantSettings.id, existing.id));
    return;
  }

  await db.insert(tenantSettings).values({ tenantId, key, value });
}

async function getCustomIntegrations(tenantId: string) {
  const [row] = await db
    .select()
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "communicationCustomIntegrations")))
    .limit(1);

  return Array.isArray(row?.value) ? row.value : [];
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tenant = await getTenant(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const rows = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.tenantId, tenant.id), isNull(integrations.deletedAt)));

  const communication = await getTenantCommunicationSettings(tenant.id);
  const customIntegrations = await getCustomIntegrations(tenant.id);

  return NextResponse.json({
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
    communication,
    integrations: rows.map(sanitizeIntegration),
    customIntegrations,
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const tenant = await getTenant(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const body = await request.json();
  const action = typeof body?.action === "string" ? body.action : "";

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  if (action === "add-custom") {
    const name = String(body?.payload?.name || "").trim();
    const endpoint = String(body?.payload?.endpoint || "").trim();
    if (!name || !endpoint) {
      return NextResponse.json({ error: "Name and endpoint are required" }, { status: 400 });
    }

    const current = await getCustomIntegrations(tenant.id);
    const nextItem = {
      id: crypto.randomUUID(),
      name,
      endpoint,
      events: Array.isArray(body?.payload?.events) ? body.payload.events : [],
      createdAt: new Date().toISOString(),
      createdBy: session.user.id,
    };
    const next = [...current, nextItem];
    await upsertTenantSetting(tenant.id, "communicationCustomIntegrations", next);

    await db.insert(auditLogs).values({
      tenantId: tenant.id,
      action: "tenant.communication_custom_integration_added",
      entity: "communication",
      entityId: nextItem.id,
      metadata: nextItem,
    });

    return NextResponse.json({ ok: true, integration: nextItem });
  }

  if (action === "export-configuration") {
    const rows = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.tenantId, tenant.id), isNull(integrations.deletedAt)));

    const communication = await getTenantCommunicationSettings(tenant.id);
    const customIntegrations = await getCustomIntegrations(tenant.id);

    return NextResponse.json({
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
      exportedAt: new Date().toISOString(),
      communication,
      integrations: rows.map(sanitizeIntegration),
      customIntegrations,
    });
  }

  if (action === "test-all") {
    const rows = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.tenantId, tenant.id), eq(integrations.isActive, true), isNull(integrations.deletedAt)));

    const results: Array<{ id: string; provider: string; ok: boolean; message: string }> = [];

    for (const row of rows) {
      const provider = getProvider(row.provider);
      if (!provider?.verify) {
        await db.update(integrations).set({
          status: "active",
          lastTestedAt: new Date(),
          testError: null,
          updatedAt: new Date(),
        }).where(eq(integrations.id, row.id));
        results.push({ id: row.id, provider: row.provider, ok: true, message: "Saved (no live test available)" });
        continue;
      }

      const credentials = (await getIntegrationCredentials(tenant.id, row.provider)) || {};
      const verification = await provider.verify(credentials);
      await db.update(integrations).set({
        status: verification.ok ? "active" : "error",
        lastTestedAt: new Date(),
        testError: verification.ok ? null : verification.error || "Verification failed",
        accountName: verification.account || row.accountName,
        updatedAt: new Date(),
      }).where(eq(integrations.id, row.id));
      results.push({
        id: row.id,
        provider: row.provider,
        ok: verification.ok,
        message: verification.ok ? "Connection verified" : (verification.error || "Verification failed"),
      });
    }

    await syncTenantCommunicationProviders(tenant.id);
    await db.insert(auditLogs).values({
      tenantId: tenant.id,
      action: "tenant.communications_tested",
      entity: "communication",
      entityId: tenant.id,
      metadata: { results },
    });

    return NextResponse.json({
      ok: results.every((item) => item.ok),
      results,
    });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}