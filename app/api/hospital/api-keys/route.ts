import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantSettings, auditLogs, tenants } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

const apiKeySchema = z.object({
  name: z.string().optional(),
  scopes: z.array(z.string()).optional(),
});

const rotateKeySchema = z.object({
  keyId: z.string(),
});

// API Keys management
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const action = searchParams.get("action");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get API keys
    const setting = await db
      .select()
      .from(tenantSettings)
      .where(
        and(
          eq(tenantSettings.tenantId, tenantId),
          eq(tenantSettings.key, "apiKeys")
        )
      );

    if (setting.length === 0) {
      return NextResponse.json([]);
    }

    const keys = (setting[0].value as any[]) || [];

    // Don't return full secrets
    const safeKeys = keys.map((k) => ({
      id: k.id,
      name: k.name,
      key: k.key ? k.key.substring(0, 10) + "..." : null,
      scopes: k.scopes || [],
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      revokedAt: k.revokedAt,
    }));

    return NextResponse.json(safeKeys);
  } catch (error) {
    console.error("[api-keys GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

// POST - Create new API key or manage webhooks
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const action = searchParams.get("action");

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

    const body = await request.json();

    if (action === "generate") {
      // Generate new API key
      const data = apiKeySchema.parse(body);

      // Get existing keys
      const setting = await db
        .select()
        .from(tenantSettings)
        .where(
          and(
            eq(tenantSettings.tenantId, tenantId),
            eq(tenantSettings.key, "apiKeys")
          )
        );

      const keys = (setting.length > 0 ? (setting[0].value as any[]) : []) || [];

      // Generate new key
      const apiKey = "ggh_" + crypto.randomBytes(32).toString("hex");
      const newKey = {
        id: crypto.randomUUID(),
        name: data.name || "Untitled API Key",
        key: apiKey,
        scopes: data.scopes || ["read", "write"],
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        revokedAt: null,
      };

      keys.push(newKey);

      if (setting.length > 0) {
        await db
          .update(tenantSettings)
          .set({ value: keys, updatedAt: new Date() })
          .where(eq(tenantSettings.id, setting[0].id));
      } else {
        await db.insert(tenantSettings).values({
          tenantId,
          key: "apiKeys",
          value: keys,
        });
      }

      // Audit log
      await db.insert(auditLogs).values({
        action: "api_key.generated",
        entity: "api_key",
        entityId: newKey.id,
        metadata: { tenantId, name: newKey.name },
      });

      return NextResponse.json({
        message: "API key generated successfully",
        apiKey: newKey.key,
        id: newKey.id,
        warning: "Save this key securely. You won't be able to see it again!",
      });
    } else if (action === "webhook-add") {
      // Add webhook
      const webhookSchema = z.object({
        url: z.string().url(),
        events: z.array(z.string()),
      });

      const webhookData = webhookSchema.parse(body);

      // Get existing webhooks
      const setting = await db
        .select()
        .from(tenantSettings)
        .where(
          and(
            eq(tenantSettings.tenantId, tenantId),
            eq(tenantSettings.key, "webhooks")
          )
        );

      const webhooks = (setting.length > 0
        ? (setting[0].value as any[])
        : []) || [];

      const newWebhook = {
        id: crypto.randomUUID(),
        url: webhookData.url,
        events: webhookData.events,
        active: true,
        createdAt: new Date().toISOString(),
        secret: crypto.randomBytes(32).toString("hex"),
      };

      webhooks.push(newWebhook);

      if (setting.length > 0) {
        await db
          .update(tenantSettings)
          .set({ value: webhooks, updatedAt: new Date() })
          .where(eq(tenantSettings.id, setting[0].id));
      } else {
        await db.insert(tenantSettings).values({
          tenantId,
          key: "webhooks",
          value: webhooks,
        });
      }

      await db.insert(auditLogs).values({
        action: "webhook.added",
        entity: "webhook",
        entityId: newWebhook.id,
        metadata: { tenantId, url: webhookData.url },
      });

      return NextResponse.json({
        message: "Webhook added successfully",
        webhook: newWebhook,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("[api-keys POST]", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// PATCH - Rotate or toggle API key
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const action = searchParams.get("action");
    const id = searchParams.get("id");

    if (!tenantId || !id) {
      return NextResponse.json(
        { error: "tenantId and id are required" },
        { status: 400 }
      );
    }

    const setting = await db
      .select()
      .from(tenantSettings)
      .where(
        and(
          eq(tenantSettings.tenantId, tenantId),
          eq(tenantSettings.key, action === "webhook" ? "webhooks" : "apiKeys")
        )
      );

    if (setting.length === 0) {
      return NextResponse.json(
        { error: "No keys/webhooks found" },
        { status: 404 }
      );
    }

    const items = (setting[0].value as any[]) || [];
    const itemIndex = items.findIndex((i) => i.id === id);

    if (itemIndex === -1) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    if (action === "webhook" && searchParams.get("operation") === "toggle") {
      // Toggle webhook active status
      items[itemIndex].active = !items[itemIndex].active;
    } else if (searchParams.get("operation") === "rotate") {
      // Rotate API key
      items[itemIndex].key = "ggh_" + crypto.randomBytes(32).toString("hex");
      items[itemIndex].rotatedAt = new Date().toISOString();
    }

    await db
      .update(tenantSettings)
      .set({ value: items, updatedAt: new Date() })
      .where(eq(tenantSettings.id, setting[0].id));

    // Audit log
    await db.insert(auditLogs).values({
      action: action === "webhook"
        ? "webhook.toggled"
        : "api_key.rotated",
      entity: action === "webhook" ? "webhook" : "api_key",
      entityId: id,
      metadata: { tenantId },
    });

    return NextResponse.json({
      message: `${action === "webhook" ? "Webhook" : "API key"} updated successfully`,
      [action === "webhook" ? "webhook" : "apiKey"]: items[itemIndex],
    });
  } catch (error) {
    console.error("[api-keys PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

// DELETE - Revoke API key or remove webhook
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const id = searchParams.get("id");
    const type = searchParams.get("type"); // "apiKey" or "webhook"

    if (!tenantId || !id || !type) {
      return NextResponse.json(
        { error: "tenantId, id, and type are required" },
        { status: 400 }
      );
    }

    const settingKey = type === "webhook" ? "webhooks" : "apiKeys";

    const setting = await db
      .select()
      .from(tenantSettings)
      .where(
        and(
          eq(tenantSettings.tenantId, tenantId),
          eq(tenantSettings.key, settingKey)
        )
      );

    if (setting.length === 0) {
      return NextResponse.json(
        { error: "No items found" },
        { status: 404 }
      );
    }

    let items = (setting[0].value as any[]) || [];

    if (type === "apiKey") {
      // Mark as revoked instead of deleting
      const itemIndex = items.findIndex((i) => i.id === id);
      if (itemIndex > -1) {
        items[itemIndex].revokedAt = new Date().toISOString();
      }
    } else if (type === "webhook") {
      // Delete webhook
      items = items.filter((i) => i.id !== id);
    }

    await db
      .update(tenantSettings)
      .set({ value: items, updatedAt: new Date() })
      .where(eq(tenantSettings.id, setting[0].id));

    // Audit log
    await db.insert(auditLogs).values({
      action: type === "webhook" ? "webhook.deleted" : "api_key.revoked",
      entity: type === "webhook" ? "webhook" : "api_key",
      entityId: id,
      metadata: { tenantId },
    });

    return NextResponse.json({
      message: `${type === "webhook" ? "Webhook" : "API key"} ${type === "webhook" ? "deleted" : "revoked"} successfully`,
    });
  } catch (error) {
    console.error("[api-keys DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}

