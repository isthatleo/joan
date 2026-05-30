import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, integrations, tenants } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/crypto";
import { INTEGRATION_PROVIDERS, getProvider, providerPublicShape } from "@/lib/integrations/providers";
import { syncTenantCommunicationProviders } from "@/lib/integrations/server";
import { z } from "zod";
import { requireTenantAdmin } from "@/lib/tenant-staff";

const integrationUpsertSchema = z.object({
  provider: z.string().trim().min(1),
  fields: z.record(z.string(), z.string().or(z.number()).or(z.boolean())).default({}),
  isActive: z.boolean().default(true),
});

async function getTenant(slug: string) {
  const [t] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return t;
}

function sanitize(row: any) {
  const cfg = (row.config || {}) as Record<string, any>;
  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(cfg)) {
    if (typeof v === "string" && k.match(/key|token|secret|password/i)) {
      masked[k] = maskSecret(decryptSecret(v));
    }
    else masked[k] = v as any;
  }
  // include encrypted secret previews
  const apiKey = decryptSecret(row.apiKeyEncrypted);
  const apiSecret = decryptSecret(row.apiSecretEncrypted);
  return {
    id: row.id,
    provider: row.provider,
    isActive: row.isActive,
    status: row.status,
    accountId: row.accountId,
    accountName: row.accountName,
    lastTestedAt: row.lastTestedAt,
    testError: row.testError,
    apiKeyMasked: apiKey ? maskSecret(apiKey) : "",
    apiSecretMasked: apiSecret ? maskSecret(apiSecret) : "",
    config: masked,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;
  const tenant = await getTenant(slug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  const admin = await requireTenantAdmin(request.headers, tenant.id);
  if (!admin.ok) return NextResponse.json({ error: admin.error || "Forbidden" }, { status: admin.status || 403 });

  const rows = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.tenantId, tenant.id), isNull(integrations.deletedAt)));

  return NextResponse.json({
    providers: INTEGRATION_PROVIDERS.map(providerPublicShape),
    integrations: rows.map(sanitize),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { slug } = await params;
    const tenant = await getTenant(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const admin = await requireTenantAdmin(request.headers, tenant.id);
    if (!admin.ok) return NextResponse.json({ error: admin.error || "Forbidden" }, { status: admin.status || 403 });

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }
    const parsedBody = integrationUpsertSchema.safeParse(json);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedBody.error.flatten() },
        { status: 422 }
      );
    }

    const { provider: providerId, fields = {}, isActive = true } = parsedBody.data;
    const provider = getProvider(providerId);
    if (!provider) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });

    for (const f of provider.fields) {
      if (f.required && !fields[f.key]) {
        return NextResponse.json({ error: `Missing required field: ${f.label}` }, { status: 400 });
      }
    }

    // Separate sensitive fields into encrypted storage; keep public ones in config
    let apiKeyEncrypted: string | null = null;
    let apiSecretEncrypted: string | null = null;
    // Upsert
    const [existing] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.tenantId, tenant.id),
          eq(integrations.provider, providerId),
          isNull(integrations.deletedAt)
        )
      )
      .limit(1);

    const config: Record<string, any> = { ...((existing?.config as Record<string, any>) || {}) };
    for (const f of provider.fields) {
      const value = fields[f.key];
      if (value === undefined || value === null || value === "") {
        if (!existing && f.type !== "password") {
          delete config[f.key];
        }
        continue;
      }

      if (f.type === "password") {
        const enc = encryptSecret(String(value));
        if (!apiKeyEncrypted) apiKeyEncrypted = enc;
        else if (!apiSecretEncrypted) apiSecretEncrypted = enc;
        config[f.key] = enc;
      } else {
        config[f.key] = String(value).trim();
      }
    }

    if (existing) {
      const [updated] = await db
        .update(integrations)
        .set({
          config,
          apiKeyEncrypted: apiKeyEncrypted ?? existing.apiKeyEncrypted,
          apiSecretEncrypted: apiSecretEncrypted ?? existing.apiSecretEncrypted,
          isActive,
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existing.id))
        .returning();
      await syncTenantCommunicationProviders(tenant.id);
      await db.insert(auditLogs).values({
        tenantId: tenant.id,
        userId: admin.user?.id || null,
        action: "tenant.integration_updated",
        entity: "integration",
        entityId: updated.id,
        metadata: { provider: providerId, isActive },
      });
      return NextResponse.json({ integration: sanitize(updated) });
    }

    const [created] = await db
      .insert(integrations)
      .values({
        tenantId: tenant.id,
        provider: providerId,
        isActive,
        apiKeyEncrypted,
        apiSecretEncrypted,
        config,
        status: "pending",
      })
      .returning();
    await syncTenantCommunicationProviders(tenant.id);
    await db.insert(auditLogs).values({
      tenantId: tenant.id,
      userId: admin.user?.id || null,
      action: "tenant.integration_created",
      entity: "integration",
      entityId: created.id,
      metadata: { provider: providerId, isActive },
    });
    return NextResponse.json({ integration: sanitize(created) }, { status: 201 });
  } catch (error: any) {
    console.error("[tenant integrations POST]", error);
    return NextResponse.json({ error: error?.message || "Failed to save integration" }, { status: 500 });
  }
}
