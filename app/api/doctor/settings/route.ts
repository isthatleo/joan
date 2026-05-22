import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { users, doctorSettings } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Get user record and verify access
    const doctorUser = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!doctorUser.length) {
      return NextResponse.json({ error: "User not found" }, { status: 403 });
    }

    // Get or create doctor settings
    let settings = await db
      .select()
      .from(doctorSettings)
      .where(eq(doctorSettings.userId, session.user.id))
      .limit(1);

    if (!settings.length) {
      // Create default settings
      const defaultSettings = {
        userId: session.user.id,
        displayName: doctorUser[0].fullName || "",
        title: "Dr.",
        specialty: "",
        licenseNumber: "",
        phone: doctorUser[0].phone || "",
        email: doctorUser[0].email || "",
        bio: "",

        emailNotifications: true,
        smsNotifications: true,
        appointmentReminders: true,
        labResultAlerts: true,
        prescriptionAlerts: true,
        systemUpdates: false,

        twoFactorEnabled: false,
        sessionTimeout: 30,
        passwordLastChanged: new Date().toISOString(),

        theme: "system",
        language: "en",
        timezone: "UTC",
        dateFormat: "MM/dd/yyyy",
        timeFormat: "12h",

        defaultAppointmentDuration: 30,
        workingHours: {
          monday: { start: "09:00", end: "17:00", enabled: true },
          tuesday: { start: "09:00", end: "17:00", enabled: true },
          wednesday: { start: "09:00", end: "17:00", enabled: true },
          thursday: { start: "09:00", end: "17:00", enabled: true },
          friday: { start: "09:00", end: "17:00", enabled: true },
          saturday: { start: "09:00", end: "12:00", enabled: false },
          sunday: { start: "09:00", end: "12:00", enabled: false },
        },

        defaultView: "dashboard",
        itemsPerPage: 10,
        autoRefresh: true,
        refreshInterval: 30,

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newSettings = await db
        .insert(doctorSettings)
        .values(defaultSettings)
        .returning();

      settings = newSettings;
    }

    return NextResponse.json(settings[0]);

  } catch (error) {
    console.error("Doctor settings GET API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { slug, ...updates } = body;

    if (!slug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Verify user exists
    const doctorUser = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!doctorUser.length) {
      return NextResponse.json({ error: "User not found" }, { status: 403 });
    }

    // Update settings
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };

    const updatedSettings = await db
      .update(doctorSettings)
      .set(updateData)
      .where(eq(doctorSettings.userId, session.user.id))
      .returning();

    if (!updatedSettings.length) {
      return NextResponse.json({ error: "Settings not found" }, { status: 404 });
    }

    return NextResponse.json(updatedSettings[0]);

  } catch (error) {
    console.error("Doctor settings PATCH API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}