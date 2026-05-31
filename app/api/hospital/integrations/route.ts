import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrations, auditLogs, tenants } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

// Schemas
const createIntegrationSchema = z.object({
  provider: z.enum([
    "twilio",
    "resend",
    "sendgrid",
    "mailgun",
    "stripe",
    "aws_s3",
    "auth0",
  ]),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  accountId: z.string().optional(),
  accountName: z.string().optional(),
  config: z.record(z.string(), z.any()).optional(),
});

// GET - List all integrations for a tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const data = await db
      .select()
      .from(integrations)
      .where(eq(integrations.tenantId, tenantId));

    // Remove sensitive data from response
    const safe = data.map((int) => ({
      id: int.id,
      provider: int.provider,
      isActive: int.isActive,
      accountId: int.accountId,
      accountName: int.accountName,
      status: int.status,
      lastTestedAt: int.lastTestedAt,
      testError: int.testError,
      config: int.config,
      createdAt: int.createdAt,
      updatedAt: int.updatedAt,
    }));

    return NextResponse.json(safe);
  } catch (error) {
    console.error("[integrations GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}

// POST - Create or update an integration
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = createIntegrationSchema.parse(await request.json());

    // Check if integration already exists
    const existing = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.tenantId, tenantId),
          eq(integrations.provider, body.provider)
        )
      );

    let result;
    if (existing.length > 0) {
      // Update
      const updateData: any = {
        accountId: body.accountId,
        accountName: body.accountName,
        config: body.config || {},
        updatedAt: new Date(),
      };

      // Only update API keys if provided
      if (body.apiKey) {
        updateData.apiKeyEncrypted = body.apiKey; // In production, encrypt this
      }
      if (body.apiSecret) {
        updateData.apiSecretEncrypted = body.apiSecret; // In production, encrypt this
      }

      await db
        .update(integrations)
        .set(updateData)
        .where(eq(integrations.id, existing[0].id));

      result = existing[0];
    } else {
      // Create
      const newIntegration = {
        tenantId,
        provider: body.provider,
        isActive: false,
        apiKeyEncrypted: body.apiKey || null,
        apiSecretEncrypted: body.apiSecret || null,
        accountId: body.accountId || null,
        accountName: body.accountName || null,
        config: body.config || {},
        status: "pending" as const,
      };

      const inserted = await db
        .insert(integrations)
        .values(newIntegration)
        .returning();

      result = inserted[0];
    }

    // Audit
    await db.insert(auditLogs).values({
      action: `integration.${existing.length > 0 ? "updated" : "created"}`,
      entity: "integration",
      entityId: result.id,
      metadata: { provider: body.provider, tenantId },
    });

    return NextResponse.json({
      message: existing.length > 0 ? "Integration updated" : "Integration created",
      integration: {
        id: result.id,
        provider: result.provider,
        status: result.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid integration data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[integrations POST]", error);
    return NextResponse.json(
      { error: "Failed to create/update integration" },
      { status: 500 }
    );
  }
}

// PATCH - Test integration connection
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const integrationId = searchParams.get("integrationId");

    if (!tenantId || !integrationId) {
      return NextResponse.json(
        { error: "tenantId and integrationId are required" },
        { status: 400 }
      );
    }

    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, integrationId),
        eq(integrations.tenantId, tenantId)
      ),
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Test connection based on provider
    let testSuccess = false;
    let testError = null;

    try {
      // Simple validation - in production, you'd test actual API connections
      if (!integration.apiKeyEncrypted) {
        throw new Error("API key not configured");
      }

      // Provider-specific tests would go here
      testSuccess = true;
    } catch (error: any) {
      testError = error.message;
    }

    // Update integration status
    await db
      .update(integrations)
      .set({
        status: testSuccess ? "active" : "error",
        lastTestedAt: new Date(),
        testError: testError || null,
      })
      .where(eq(integrations.id, integrationId));

    // Audit
    await db.insert(auditLogs).values({
      action: "integration.tested",
      entity: "integration",
      entityId: integrationId,
      metadata: {
        provider: integration.provider,
        testSuccess,
        error: testError,
      },
    });

    return NextResponse.json({
      message: testSuccess ? "Integration test passed" : "Integration test failed",
      success: testSuccess,
      error: testError,
    });
  } catch (error) {
    console.error("[integrations PATCH]", error);
    return NextResponse.json(
      { error: "Failed to test integration" },
      { status: 500 }
    );
  }
}

// DELETE - Remove an integration
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const integrationId = searchParams.get("integrationId");

    if (!tenantId || !integrationId) {
      return NextResponse.json(
        { error: "tenantId and integrationId are required" },
        { status: 400 }
      );
    }

    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, integrationId),
        eq(integrations.tenantId, tenantId)
      ),
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    await db.delete(integrations).where(eq(integrations.id, integrationId));

    // Audit
    await db.insert(auditLogs).values({
      action: "integration.deleted",
      entity: "integration",
      entityId: integrationId,
      metadata: { provider: integration.provider, tenantId },
    });

    return NextResponse.json({ message: "Integration deleted" });
  } catch (error) {
    console.error("[integrations DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete integration" },
      { status: 500 }
    );
  }
}

