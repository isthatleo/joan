import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const tenantId = formData.get("tenantId") as string;
    const type = formData.get("type") as string; // "logo" or "favicon"

    if (!file || !tenantId || !type) {
      return NextResponse.json(
        { error: "Missing required fields: file, tenantId, type" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/svg+xml", "image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only SVG, PNG, and JPG are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size too large. Maximum 5MB allowed." },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "hospital-logos");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, continue
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop();
    const filename = `${tenantId}-${type}-${Date.now()}.${fileExtension}`;
    const filepath = join(uploadsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Generate public URL
    const fileUrl = `/uploads/hospital-logos/${filename}`;

    // Update tenant record
    const updateData: any = { updatedAt: new Date() };
    if (type === "logo") {
      updateData.logoUrl = fileUrl;
    } else if (type === "favicon") {
      updateData.faviconUrl = fileUrl;
    }

    await db.update(tenants).set(updateData).where(eq(tenants.id, tenantId));

    return NextResponse.json({
      message: "File uploaded successfully",
      url: fileUrl,
      type,
    });
  } catch (error) {
    console.error("[upload POST]", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
