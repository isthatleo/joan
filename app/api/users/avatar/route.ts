import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

interface ErrorResponse {
  error: string;
  details?: string;
  stack?: string;
}

function createErrorResponse(status: number, error: string, details?: string): [ErrorResponse, { status: number }] {
  const response: ErrorResponse = { error, details };
  if (process.env.NODE_ENV === 'development' && details) {
    response.details = details;
  }
  return [response, { status }];
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    console.log("[Avatar API] Request started for userId:", userId);

    if (!userId) {
      console.error("[Avatar API] No userId provided");
      const [errorResponse, options] = createErrorResponse(400, "User ID required", "userId query parameter is missing");
      return NextResponse.json(errorResponse, options);
    }

    // Get form data
    let formData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error("[Avatar API] Error parsing form data:", parseError);
      const parseErrorMsg = parseError instanceof Error ? parseError.message : "Unknown error";
      const [errorResponse, options] = createErrorResponse(400, "Invalid form data", parseErrorMsg);
      return NextResponse.json(errorResponse, options);
    }

    const file = formData.get("avatar") as File | null;

    console.log("[Avatar API] File received:", file ? `${file.name} (${file.size} bytes)` : "no file");

    if (!file) {
      console.error("[Avatar API] No file provided in form data");
      const [errorResponse, options] = createErrorResponse(400, "No file provided", "avatar field is missing from form data");
      return NextResponse.json(errorResponse, options);
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      console.error("[Avatar API] Invalid file type:", file.type);
      const [errorResponse, options] = createErrorResponse(400, "File must be an image", `Received type: ${file.type}`);
      return NextResponse.json(errorResponse, options);
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error("[Avatar API] File too large:", file.size);
      const [errorResponse, options] = createErrorResponse(400, "File size must be less than 5MB", `File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return NextResponse.json(errorResponse, options);
    }

    // Check if user exists first
    console.log("[Avatar API] Checking if user exists...");
    let existingUser;
    try {
      existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      console.log("[Avatar API] User exists check:", existingUser.length > 0);
    } catch (dbError) {
      console.error("[Avatar API] Error checking user existence:", dbError);
      const dbErrorMsg = dbError instanceof Error ? dbError.message : "Unknown error";
      const [errorResponse, options] = createErrorResponse(500, "Database error while checking user", dbErrorMsg);
      return NextResponse.json(errorResponse, options);
    }

    if (existingUser.length === 0) {
      console.error("[Avatar API] User not found:", userId);
      const [errorResponse, options] = createErrorResponse(404, "User not found", `No user found with ID: ${userId}`);
      return NextResponse.json(errorResponse, options);
    }

    // Generate unique filename
    console.log("[Avatar API] Generating filename...");
    let fileExtension = file.name.split('.').pop() || 'jpg';
    // Sanitize extension to prevent issues
    fileExtension = fileExtension.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!fileExtension) fileExtension = 'jpg';

    const userIdSafe = userId.replace(/[^a-z0-9-]/g, '');
    const fileName = `${userIdSafe}-${randomUUID()}.${fileExtension}`;
    const avatarDir = join(process.cwd(), 'public', 'avatars');
    const filePath = join(avatarDir, fileName);

    console.log("[Avatar API] Saving file to:", filePath);
    console.log("[Avatar API] File extension:", fileExtension);

    // Ensure avatars directory exists
    console.log("[Avatar API] Creating/verifying avatars directory...");
    try {
      await mkdir(avatarDir, { recursive: true });
      console.log("[Avatar API] Avatar directory created/verified");
    } catch (mkdirError) {
      console.error("[Avatar API] Error creating avatars directory:", mkdirError);
      const mkdirErrorMsg = mkdirError instanceof Error ? mkdirError.message : "Unknown error";
      const [errorResponse, options] = createErrorResponse(500, "Failed to create avatar directory", mkdirErrorMsg);
      return NextResponse.json(errorResponse, options);
    }

    // Convert file to buffer and save
    console.log("[Avatar API] Converting file to buffer...");
    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      console.log("[Avatar API] Writing file to disk...");
      await writeFile(filePath, buffer);
      console.log("[Avatar API] File saved successfully, size:", buffer.length, "bytes");
    } catch (writeError) {
      console.error("[Avatar API] Error writing file:", writeError);
      const writeErrorMsg = writeError instanceof Error ? writeError.message : "Unknown error";
      const [errorResponse, options] = createErrorResponse(500, "Failed to save file", writeErrorMsg);
      return NextResponse.json(errorResponse, options);
    }

    // Generate avatar URL
    const avatarUrl = `/avatars/${fileName}`;
    console.log("[Avatar API] Generated avatar URL:", avatarUrl);

    // Update user avatar in database
    console.log("[Avatar API] Updating user avatar in database...");
    try {
      const updateResult = await db
        .update(users)
        .set({
          avatar: avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      console.log("[Avatar API] Database update result:", updateResult);

      // Verify the update worked
      console.log("[Avatar API] Verifying update...");
      const updatedUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      console.log("[Avatar API] User after update, avatar:", updatedUser[0]?.avatar);

      if (!updatedUser[0] || updatedUser[0].avatar !== avatarUrl) {
        console.error("[Avatar API] Database update failed to persist");
        const [errorResponse, options] = createErrorResponse(500, "Failed to update avatar in database", "Updated avatar was not saved");
        return NextResponse.json(errorResponse, options);
      }
    } catch (dbError) {
      console.error("[Avatar API] Database update error:", dbError);
      const dbErrorMsg = dbError instanceof Error ? dbError.message : "Unknown error";
      const [errorResponse, options] = createErrorResponse(500, "Database update failed", dbErrorMsg);
      return NextResponse.json(errorResponse, options);
    }

    console.log("[Avatar API] Avatar upload completed successfully");
    return NextResponse.json({
      success: true,
      avatar: avatarUrl,
    });
  } catch (error) {
    console.error("[Avatar API] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "No stack trace";
    console.error("[Avatar API] Error stack:", errorStack);

    const response: ErrorResponse = {
      error: "Failed to upload avatar",
      details: errorMessage
    };
    if (process.env.NODE_ENV === 'development') {
      response.stack = errorStack;
    }

    return NextResponse.json(response, { status: 500 });
  }
}
