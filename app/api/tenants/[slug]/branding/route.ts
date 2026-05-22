import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantSettings, tenants, auditLogs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

async function getTenantBySlug(slug: string) {
  return db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const rows = await db.select().from(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenant.id), eq(tenantSettings.key, "branding")));

    const branding = rows.length > 0 ? rows[0].value : {};
    return NextResponse.json(branding);
  } catch (e) {
    console.error("[tenant branding GET]", e);
    return NextResponse.json({ error: "Failed to fetch branding settings" }, { status: 500 });
  }
}

const updateSchema = z.object({
  primaryColor: z.string().optional(),
  logoUrl: z.string().url().optional(),
  hospitalName: z.string().optional(),
  favicon: z.string().url().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = updateSchema.parse(await request.json());

    const existing = await db.select().from(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenant.id), eq(tenantSettings.key, "branding")));

    if (existing.length > 0) {
      await db.update(tenantSettings)
        .set({
          value: { ...existing[0].value, ...body },
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

    // Audit log
    await db.insert(auditLogs).values({
      action: "branding.updated",
      entity: "tenant",
      entityId: tenant.id,
      metadata: { changes: Object.keys(body) },
    });

    return NextResponse.json({ message: "Branding settings updated" });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: e.errors }, { status: 400 });
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

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // "logo" or "favicon"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/svg+xml", "image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only SVG, PNG, and JPG are allowed." }, { status: 400 });
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 2MB." }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "tenants", slug);
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (e) {
      // Directory might already exist
    }

    // Generate filename
    const extension = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
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

    const key = type === "logo" ? "logoUrl" : "favicon";

    if (existing.length > 0) {
      await db.update(tenantSettings)
        .set({
          value: { ...existing[0].value, [key]: url },
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
