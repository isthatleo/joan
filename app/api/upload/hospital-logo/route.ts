import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantSettings, tenants } from "@/lib/db/schema";

interface ErrorResponse {
  error: string;
  details?: string;
  stack?: string;
}

function createErrorResponse(status: number, error: string, details?: string) {
  const response: ErrorResponse = { error, details };
  if (process.env.NODE_ENV !== "development") {
    delete response.details;
  }
  return NextResponse.json(response, { status });
}

const allowedTypes = new Set([
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

export async function POST(request: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      const details = parseError instanceof Error ? parseError.message : "Unknown form-data error";
      return createErrorResponse(400, "Invalid form data", details);
    }

    const file = formData.get("file");
    const tenantId = String(formData.get("tenantId") || "");
    const type = String(formData.get("type") || "");

    if (!(file instanceof File)) {
      return createErrorResponse(400, "No file provided", "file field is missing from form data");
    }

    if (!tenantId) {
      return createErrorResponse(400, "Missing tenant id", "tenantId is required");
    }

    if (type !== "logo" && type !== "favicon") {
      return createErrorResponse(400, "Invalid upload type", "type must be either logo or favicon");
    }

    if (!allowedTypes.has(file.type)) {
      return createErrorResponse(400, "Invalid file type", `Received type: ${file.type || "unknown"}`);
    }

    if (file.size > 5 * 1024 * 1024) {
      return createErrorResponse(400, "File size must be less than 5MB", `Received ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return createErrorResponse(404, "Tenant not found");
    }

    const extension = (file.name.split(".").pop() || (type === "favicon" ? "ico" : "png"))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || (type === "favicon" ? "ico" : "png");
    const safeTenantId = tenantId.replace(/[^a-z0-9-]/gi, "");
    const filename = `${safeTenantId}-${type}-${randomUUID()}.${extension}`;
    const uploadsDir = join(process.cwd(), "public", "uploads", "hospital-logos");
    const filePath = join(uploadsDir, filename);

    await mkdir(uploadsDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/hospital-logos/${filename}`;
    const existingBranding = await db.select().from(tenantSettings).where(
      and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "branding"))
    );

    const nextBranding = {
      ...(existingBranding[0]?.value as Record<string, unknown> | undefined),
      ...(type === "logo" ? { logoUrl: fileUrl } : { faviconUrl: fileUrl }),
    };

    if (type === "logo") {
      await db.update(tenants).set({
        logoUrl: fileUrl,
        updatedAt: new Date(),
      }).where(eq(tenants.id, tenantId));
    }

    if (existingBranding.length > 0) {
      await db.update(tenantSettings).set({
        value: nextBranding,
        updatedAt: new Date(),
      }).where(eq(tenantSettings.id, existingBranding[0].id));
    } else {
      await db.insert(tenantSettings).values({
        tenantId,
        key: "branding",
        value: nextBranding,
      });
    }

    return NextResponse.json({
      success: true,
      url: fileUrl,
      type,
    });
  } catch (error) {
    console.error("[Hospital Logo Upload API] Unexpected error:", error);
    const response: ErrorResponse = {
      error: "Failed to upload logo",
      details: error instanceof Error ? error.message : "Unknown error",
    };
    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      response.stack = error.stack;
    }
    return NextResponse.json(response, { status: 500 });
  }
}
