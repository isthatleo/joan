import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSettings, users } from "@/lib/db/schema";
import { mergeUserSettings } from "@/lib/user-settings";

async function resolveCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) {
    return { session, appUser: null };
  }

  const appUser = await db.query.users.findFirst({
    where: and(ilike(users.email, session.user.email), isNull(users.deletedAt)),
    columns: {
      id: true,
      email: true,
      role: true,
      tenantId: true,
    },
  });

  return { session, appUser };
}

export async function GET(request: NextRequest) {
  try {
    const { session, appUser } = await resolveCurrentUser(request);
    if (!session?.user?.email || !appUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestedUserId = new URL(request.url).searchParams.get("userId");
    if (requestedUserId && requestedUserId !== appUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settingsRecord = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, appUser.id),
    });

    return NextResponse.json(
      mergeUserSettings(settingsRecord?.settings || {})
    );
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, appUser } = await resolveCurrentUser(request);
    if (!session?.user?.email || !appUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestedUserId = new URL(request.url).searchParams.get("userId");
    if (requestedUserId && requestedUserId !== appUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = await request.json();
    const mergedSettings = mergeUserSettings(payload);

    await db
      .insert(userSettings)
      .values({
        userId: appUser.id,
        settings: mergedSettings,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          settings: mergedSettings,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      success: true,
      settings: mergedSettings,
    });
  } catch (error) {
    console.error("Error updating user settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
