import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_LAB_SETTINGS = {
  displayName: "",
  emailNotifications: true,
  labOrderAlerts: true,
  resultReadyAlerts: true,
  inventoryAlerts: true,
  theme: "light",
  itemsPerPage: 25,
  autoRefresh: true,
  refreshInterval: 30,
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const row = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.user.id),
    });

    return NextResponse.json({
      ...DEFAULT_LAB_SETTINGS,
      displayName: session.user.name || DEFAULT_LAB_SETTINGS.displayName,
      ...((row?.settings as Record<string, any> | undefined)?.labTechnician || {}),
    });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const row = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.user.id),
    });
    const existing = (row?.settings as Record<string, any> | undefined) || {};
    const nextSettings = {
      ...existing,
      labTechnician: {
        ...DEFAULT_LAB_SETTINGS,
        ...((existing.labTechnician as Record<string, any> | undefined) || {}),
        ...data,
      },
    };

    if (row) {
      await db.update(userSettings).set({ settings: nextSettings, updatedAt: new Date() }).where(eq(userSettings.id, row.id));
    } else {
      await db.insert(userSettings).values({ userId: session.user.id, settings: nextSettings });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

