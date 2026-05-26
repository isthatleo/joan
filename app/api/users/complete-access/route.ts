import bcrypt from "bcryptjs";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSettings, users } from "@/lib/db/schema";
import * as authSchema from "@/lib/auth-schema";
import { mergeUserSettings } from "@/lib/user-settings";
import { drizzle as drizzleAuth } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const authSql = neon(process.env.DATABASE_URL, { fullResults: false });
const authDb = drizzleAuth(authSql, { schema: authSchema });

function validatePassword(password: string) {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include uppercase, lowercase, and a number.";
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!password || !confirmPassword) {
      return NextResponse.json({ error: "Password and confirmation are required." }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const appUser = await db.query.users.findFirst({
      where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    });

    if (!appUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const settingsRecord = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, appUser.id),
    });

    const mergedSettings = mergeUserSettings(settingsRecord?.settings ?? {});
    if (!mergedSettings.security.forcePasswordChange) {
      return NextResponse.json({ error: "Password activation is not required for this account." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, appUser.id));

    await authDb
      .update(authSchema.account)
      .set({
        password: passwordHash,
        updatedAt: new Date(),
      })
      .where(and(eq(authSchema.account.userId, session.user.id), eq(authSchema.account.providerId, "credential")));

    const nextSettings = mergeUserSettings({
      ...settingsRecord?.settings,
      security: {
        ...(mergedSettings.security ?? {}),
        forcePasswordChange: false,
      },
    });

    await db
      .insert(userSettings)
      .values({
        userId: appUser.id,
        settings: nextSettings,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          settings: nextSettings,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Complete access password update failed:", error);
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
  }
}
