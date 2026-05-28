import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import crypto from "crypto";
import { db } from "@/lib/db";
import { auditLogs, integrations, tenantSettings, tenants } from "@/lib/db/schema";

async function getTenantScopedData(tenantId: string) {
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) return null;

  const [communicationSetting] = await db
    .select()
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "communication")));

  const [customIntegrationsSetting] = await db
    .select()
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "communicationCustomIntegrations")));

  const rows = await db.select().from(integrations).where(eq(integrations.tenantId, tenantId));

  return {
    tenant,
    communication: (communicationSetting?.value as Record<string, any>) || {},
    customIntegrations: (customIntegrationsSetting?.value as Array<Record<string, any>>) || [],
    integrations: rows,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      tenantId?: string;
      action?: string;
      communication?: Record<string, any>;
      payload?: Record<string, any>;
    };

    if (!body.tenantId || !body.action) {
      return NextResponse.json({ error: "tenantId and action are required" }, { status: 400 });
    }

    const tenantData = await getTenantScopedData(body.tenantId);
    if (!tenantData) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const activeIntegrations = tenantData.integrations.filter((item) => item.isActive);
    const communication = body.communication || tenantData.communication || {};

    if (body.action === "test-email") {
      const provider = communication.emailProvider;
      const match = activeIntegrations.find((item) => item.provider === provider);
      const ok = Boolean(match);
      return NextResponse.json({
        ok,
        message: ok ? `Email provider ${provider} is active and reachable` : `Email provider ${provider || "unknown"} is not configured`,
      }, { status: ok ? 200 : 400 });
    }

    if (body.action === "test-sms") {
      const provider = communication.smsProvider;
      const match = activeIntegrations.find((item) => item.provider === provider);
      const ok = Boolean(match);
      return NextResponse.json({
        ok,
        message: ok ? `SMS provider ${provider} is active and reachable` : `SMS provider ${provider || "unknown"} is not configured`,
      }, { status: ok ? 200 : 400 });
    }

    if (body.action === "test-all") {
      const results = activeIntegrations.map((item) => ({
        provider: item.provider,
        ok: item.status === "active",
        status: item.status,
      }));
      return NextResponse.json({
        ok: results.every((item) => item.ok),
        results,
      });
    }

    if (body.action === "export-configuration") {
      return NextResponse.json({
        tenant: { id: tenantData.tenant.id, name: tenantData.tenant.name, slug: tenantData.tenant.slug },
        communication,
        integrations: activeIntegrations.map((item) => ({
          provider: item.provider,
          status: item.status,
          accountName: item.accountName,
          lastTestedAt: item.lastTestedAt,
        })),
        customIntegrations: tenantData.customIntegrations,
      });
    }

    if (body.action === "add-custom") {
      const nextItem = {
        id: crypto.randomUUID(),
        name: body.payload?.name || "Custom Integration",
        endpoint: body.payload?.endpoint || "",
        events: body.payload?.events || [],
        createdAt: new Date().toISOString(),
      };

      const next = [...tenantData.customIntegrations, nextItem];
      const [existing] = await db
        .select()
        .from(tenantSettings)
        .where(and(eq(tenantSettings.tenantId, body.tenantId), eq(tenantSettings.key, "communicationCustomIntegrations")));

      if (existing) {
        await db.update(tenantSettings).set({ value: next, updatedAt: new Date() }).where(eq(tenantSettings.id, existing.id));
      } else {
        await db.insert(tenantSettings).values({ tenantId: body.tenantId, key: "communicationCustomIntegrations", value: next });
      }

      await db.insert(auditLogs).values({
        tenantId: body.tenantId,
        action: "communication.custom_integration_added",
        entity: "communication",
        entityId: nextItem.id,
        metadata: nextItem,
      });

      return NextResponse.json({ ok: true, integration: nextItem });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("[hospital communication actions POST]", error);
    return NextResponse.json({ error: "Failed to process communication action" }, { status: 500 });
  }
}
