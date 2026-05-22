import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;
    const conversationId = formData.get("conversationId") as string;

    if (!file || !userId || !conversationId) {
      return NextResponse.json(
        { error: "Missing required fields: file, userId, conversationId" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate file type
    const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const allowedDocTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/msword", // .doc
      "application/pdf",
      "text/plain"
    ];
    const allowedTypes = [...allowedImageTypes, ...allowedDocTypes];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only images (JPG, PNG, WebP), DOCX, DOC, PDF, and TXT files are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (20MB max for docs, 10MB max for images)
    const maxSize = allowedImageTypes.includes(file.type) ? 10 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size too large. Maximum ${maxSize / (1024 * 1024)}MB allowed.` },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "messages");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, continue
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "unknown";
    const timestamp = Date.now();
    const filename = `${conversationId}-${userId}-${timestamp}.${fileExtension}`;
    const filepath = join(uploadsDir, filename);

    let processedBuffer: Buffer;
    let finalFileSize = file.size;

    // Process images for compression
    if (allowedImageTypes.includes(file.type)) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Compress and resize images
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Resize if larger than 1920px width while maintaining aspect ratio
      let processedImage = image;
      if (metadata.width && metadata.width > 1920) {
        processedImage = image.resize(1920, null, {
          withoutEnlargement: true,
          quality: 85
        });
      } else {
        // Just compress quality
        processedImage = image.jpeg({ quality: 85 }).png({ compressionLevel: 8 });
      }

      processedBuffer = await processedImage.toBuffer();
      finalFileSize = processedBuffer.length;
    } else {
      // For non-image files, just convert to buffer
      const bytes = await file.arrayBuffer();
      processedBuffer = Buffer.from(bytes);
    }

    // Save file
    await writeFile(filepath, processedBuffer);

    // Generate public URL
    const fileUrl = `/uploads/messages/${filename}`;

    return NextResponse.json({
      message: "File uploaded successfully",
      url: fileUrl,
      filename: file.name,
      fileSize: finalFileSize,
      fileType: file.type,
      originalSize: file.size,
      compressed: allowedImageTypes.includes(file.type),
    });
  } catch (error) {
    console.error("[message-upload POST]", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
