import { NextRequest, NextResponse } from "next/server";
import { eq, ilike } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

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

async function resolveCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null as any);
  if (!session?.user?.email) {
    return { session, appUser: null };
  }

  const appUser = await db.query.users.findFirst({
    where: ilike(users.email, session.user.email),
  });

  return { session, appUser };
}

export async function POST(request: NextRequest) {
  try {
    const { session, appUser } = await resolveCurrentUser(request);
    if (!session?.user?.email || !appUser?.id) {
      return createErrorResponse(401, "Unauthorized", "Failed to get session");
    }

    const requestedUserId = new URL(request.url).searchParams.get("userId");
    const userId = requestedUserId && requestedUserId === appUser.id ? requestedUserId : appUser.id;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      const details = parseError instanceof Error ? parseError.message : "Unknown error";
      return createErrorResponse(400, "Invalid form data", details);
    }

    const file = formData.get("avatar");
    if (!(file instanceof File)) {
      return createErrorResponse(400, "No file provided", "avatar field is missing from form data");
    }

    if (!file.type.startsWith("image/")) {
      return createErrorResponse(400, "File must be an image", `Received type: ${file.type}`);
    }

    if (file.size > 5 * 1024 * 1024) {
      return createErrorResponse(
        400,
        "File size must be less than 5MB",
        `File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      );
    }

    const fileExtension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const fileName = `${userId.replace(/[^a-z0-9-]/g, "")}-${randomUUID()}.${fileExtension}`;
    const avatarDir = join(process.cwd(), "public", "avatars");
    const filePath = join(avatarDir, fileName);

    await mkdir(avatarDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const avatarUrl = `/avatars/${fileName}`;

    await db
      .update(users)
      .set({
        avatar: avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      avatar: avatarUrl,
    });
  } catch (error) {
    console.error("[Avatar API] Unexpected error:", error);
    const response: ErrorResponse = {
      error: "Failed to upload avatar",
      details: error instanceof Error ? error.message : "Unknown error",
    };
    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      response.stack = error.stack;
    }
    return NextResponse.json(response, { status: 500 });
  }
}
