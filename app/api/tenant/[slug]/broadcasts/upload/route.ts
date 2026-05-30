import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getTenantIdBySlug } from "@/lib/accountant/server";
import { requireTenantAdmin } from "@/lib/tenant-staff";

export const dynamic = "force-dynamic";

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const DOC_TYPES = new Set(["application/pdf"]);

function safeName(value: string) {
  const base = value.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return base || "broadcast-asset";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantIdBySlug(slug);
    if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const admin = await requireTenantAdmin(request.headers, tenantId);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "A flyer, poster, or memo PDF is required." }, { status: 400 });

    const isImage = IMAGE_TYPES.has(file.type);
    const isDocument = DOC_TYPES.has(file.type);
    if (!isImage && !isDocument) {
      return NextResponse.json({ error: "Only JPG, PNG, WebP, and PDF files are supported." }, { status: 400 });
    }

    const maxSize = isImage ? 10 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: `File is too large. Maximum size is ${maxSize / (1024 * 1024)}MB.` }, { status: 400 });
    }

    const uploadsDir = join(process.cwd(), "public", "uploads", "broadcasts");
    await mkdir(uploadsDir, { recursive: true });

    const originalExtension = file.name.split(".").pop()?.toLowerCase() || (isImage ? "jpg" : "pdf");
    const extension = isImage ? "webp" : originalExtension;
    const filename = `${slug}-${Date.now()}-${safeName(file.name)}.${extension}`;
    const filepath = join(uploadsDir, filename);
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    let outputBuffer: Buffer = inputBuffer;

    if (isImage) {
      outputBuffer = await sharp(inputBuffer)
        .resize({ width: 1800, withoutEnlargement: true })
        .webp({ quality: 86 })
        .toBuffer();
    }

    await writeFile(filepath, outputBuffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/broadcasts/${filename}`,
      filename: file.name,
      fileSize: outputBuffer.length,
      fileType: isImage ? "image/webp" : file.type,
      originalSize: file.size,
      compressed: isImage,
    });
  } catch (error) {
    console.error("Error uploading broadcast asset:", error);
    return NextResponse.json({ error: "Failed to upload broadcast asset" }, { status: 500 });
  }
}
