import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantSettings, tenants, auditLogs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { requireTenantAdmin } from "@/lib/tenant-staff";

async function getTenantBySlug(slug: string) {
  return db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
}

function settingsObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const rows = await db.select().from(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenant.id), eq(tenantSettings.key, "branding")));

    const branding = (rows.length > 0 ? rows[0].value : {}) as Record<string, unknown>;
    return NextResponse.json({
      logoUrl: tenant.logoUrl || branding.logoUrl || "",
      faviconUrl: branding.faviconUrl || "",
      primaryColor: branding.primaryColor || "#F97316",
      accentColor: branding.accentColor || "#EA580C",
      lightLogoUrl: branding.lightLogoUrl || "",
      hospitalName: tenant.name,
    });
  } catch (e) {
    console.error("[tenant branding GET]", e);
    return NextResponse.json({ error: "Failed to fetch branding settings" }, { status: 500 });
  }
}

const assetUrlSchema = z.string().refine((value) => {
  if (!value) return true;
  if (value.startsWith("/")) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}, "Expected an absolute URL or tenant asset path");

const updateSchema = z.object({
  primaryColor: z.string().optional(),
  logoUrl: assetUrlSchema.optional(),
  hospitalName: z.string().optional(),
  faviconUrl: assetUrlSchema.optional(),
  accentColor: z.string().optional(),
  lightLogoUrl: assetUrlSchema.optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const admin = await requireTenantAdmin(request.headers, tenant.id);
    if (!admin.ok) return NextResponse.json({ error: admin.error || "Forbidden" }, { status: admin.status || 403 });

    const body = updateSchema.parse(await request.json());

    const existing = await db.select().from(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenant.id), eq(tenantSettings.key, "branding")));

    if (existing.length > 0) {
      await db.update(tenantSettings)
        .set({
          value: { ...settingsObject(existing[0].value), ...body },
          updatedAt: new Date()
        })
        .where(eq(tenantSettings.id, existing[0].id));
    } else {
      await db.insert(tenantSettings).values({
        tenantId: tenant.id,
        key: "branding",
        value: body,
      });
    }

    if (typeof body.logoUrl === "string") {
      await db.update(tenants).set({ logoUrl: body.logoUrl, updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
    }
    if (typeof body.hospitalName === "string" && body.hospitalName.trim()) {
      await db.update(tenants).set({ name: body.hospitalName.trim(), updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
    }

    // Audit log
    await db.insert(auditLogs).values({
      tenantId: tenant.id,
      userId: admin.user?.id || null,
      action: "branding.updated",
      entity: "tenant",
      entityId: tenant.id,
      metadata: { changes: Object.keys(body) },
    });

    return NextResponse.json({ message: "Branding settings updated" });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: e.issues }, { status: 400 });
    }
    console.error("[tenant branding PUT]", e);
    return NextResponse.json({ error: "Failed to update branding settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const admin = await requireTenantAdmin(request.headers, tenant.id);
    if (!admin.ok) return NextResponse.json({ error: admin.error || "Forbidden" }, { status: admin.status || 403 });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // "logo" or "favicon"
    if (!["logo", "favicon"].includes(type)) {
      return NextResponse.json({ error: "Invalid branding asset type" }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/svg+xml", "image/png", "image/jpeg", "image/jpg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type: ${file.type || "unknown"}` }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "tenants", slug);
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (e) {
      // Directory might already exist
    }

    // Generate filename
    const extension = file.name.split(".").pop() || (type === "favicon" ? "ico" : "png");
    const filename = `${type}-${Date.now()}.${extension}`;
    const filepath = join(uploadsDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Generate URL
    const url = `/uploads/tenants/${slug}/${filename}`;

    // Update branding settings
    const existing = await db.select().from(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenant.id), eq(tenantSettings.key, "branding")));

    const key = type === "logo" ? "logoUrl" : "faviconUrl";

    if (type === "logo") {
      await db.update(tenants).set({ logoUrl: url, updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
    }

    if (existing.length > 0) {
      await db.update(tenantSettings)
        .set({
          value: { ...settingsObject(existing[0].value), [key]: url },
          updatedAt: new Date()
        })
        .where(eq(tenantSettings.id, existing[0].id));
    } else {
      await db.insert(tenantSettings).values({
        tenantId: tenant.id,
        key: "branding",
        value: { [key]: url },
      });
    }

    // Audit log
    await db.insert(auditLogs).values({
      tenantId: tenant.id,
      userId: admin.user?.id || null,
      action: `branding.${type}_uploaded`,
      entity: "tenant",
      entityId: tenant.id,
      metadata: { filename, size: file.size, type: file.type },
    });

    return NextResponse.json({ url, message: `${type} uploaded successfully` });
  } catch (e) {
    console.error("[tenant branding upload POST]", e);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
