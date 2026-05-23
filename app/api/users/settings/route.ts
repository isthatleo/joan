import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSettings, users } from "@/lib/db/schema";

const defaultUserSettings = {
  notifications: {
    email: true,
    push: true,
    sms: false,
    marketing: false,
    desktop: true,
    digests: true,
    digestFrequency: "daily",
    reportReady: true,
    billingAlerts: true,
    securityAlerts: true,
    scheduleFailures: true,
  },
  privacy: {
    profileVisibility: "private",
    dataSharing: false,
    analytics: true,
    readReceipts: true,
    activityStatus: true,
  },
  appearance: {
    theme: "system",
    language: "en",
    timezone: "UTC",
    density: "comfortable",
    calendarStart: "monday",
    reduceMotion: false,
    highContrast: false,
    fontScale: "default",
  },
  security: {
    twoFactorEnabled: false,
    sessionTimeout: 30,
    loginAlerts: true,
    deviceTrust: true,
    passwordlessSignin: false,
    biometricPrompt: false,
  },
  communication: {
    messageSettings: {
      allowMessagesFrom: "care-team",
      autoReply: "",
      signature: "",
      defaultChannel: "inbox",
      workingHours: {
        enabled: false,
        start: "09:00",
        end: "17:00",
        timezone: "UTC",
      },
    },
  },
  workflow: {
    defaultLandingPage: "dashboard",
    quickActions: true,
    confirmDestructive: true,
    autoSaveDrafts: true,
    preferredExportFormat: "pdf",
    compactTables: false,
  },
};

function mergeUserSettings(settings: any) {
  return {
    ...defaultUserSettings,
    ...settings,
    notifications: {
      ...defaultUserSettings.notifications,
      ...(settings?.notifications || {}),
    },
    privacy: {
      ...defaultUserSettings.privacy,
      ...(settings?.privacy || {}),
    },
    appearance: {
      ...defaultUserSettings.appearance,
      ...(settings?.appearance || {}),
    },
    security: {
      ...defaultUserSettings.security,
      ...(settings?.security || {}),
    },
    workflow: {
      ...defaultUserSettings.workflow,
      ...(settings?.workflow || {}),
    },
    communication: {
      ...defaultUserSettings.communication,
      ...(settings?.communication || {}),
      messageSettings: {
        ...defaultUserSettings.communication.messageSettings,
        ...(settings?.communication?.messageSettings || {}),
        workingHours: {
          ...defaultUserSettings.communication.messageSettings.workingHours,
          ...(settings?.communication?.messageSettings?.workingHours || {}),
        },
      },
    },
  };
}

async function resolveCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) {
    return { session, appUser: null };
  }

  const appUser = await db.query.users.findFirst({
    where: ilike(users.email, session.user.email),
    columns: {
      id: true,
      email: true,
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
