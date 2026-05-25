import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { resolveNurseContext } from "@/lib/nurse/server";

export const dynamic = "force-dynamic";

const defaults = {
  displayName: "",
  license: "",
  specialty: "",
  phone: "",
  email: "",
  bio: "",
  emailNotifications: true,
  smsNotifications: false,
  taskAlerts: true,
  vitalsAlerts: true,
  medicationReminders: true,
  twoFactorEnabled: false,
  sessionTimeout: 30,
  passwordLastChanged: new Date().toISOString(),
  theme: "system",
  language: "en",
  timezone: "UTC",
  timeFormat: "24h",
  defaultShiftDuration: 8,
  workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  defaultView: "dashboard",
  autoRefresh: true,
  refreshInterval: 30,
};

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const context = await resolveNurseContext(request.headers, slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, context.nurse.id)).limit(1);
  const stored = (row?.settings as any)?.nurseDashboard || {};
  return NextResponse.json({ ...defaults, ...stored, displayName: stored.displayName || context.nurse.fullName || "", email: stored.email || context.nurse.email });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const context = await resolveNurseContext(request.headers, body.slug);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, context.nurse.id)).limit(1);
  const nextSettings = {
    ...(existing?.settings as Record<string, unknown> || {}),
    nurseDashboard: { ...defaults, ...(existing?.settings as any)?.nurseDashboard, ...body },
  };

  if (existing) {
    await db.update(userSettings).set({ settings: nextSettings, updatedAt: new Date() }).where(eq(userSettings.userId, context.nurse.id));
  } else {
    await db.insert(userSettings).values({ userId: context.nurse.id, settings: nextSettings });
  }

  return NextResponse.json({ success: true });
}
