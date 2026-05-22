import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messagingSettings, users, userRoles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Verify user is hospital admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: { userRoles: { with: { role: true } } }
    });

    if (user?.userRoles?.[0]?.role?.name !== "hospital_admin") {
      return NextResponse.json({ error: "Only hospital admins can access messaging settings" }, { status: 403 });
    }

    // Get or create settings
    const settings = await db.query.messagingSettings.findFirst({
      where: eq(messagingSettings.tenantId, user.tenantId!)
    });

    return NextResponse.json({
      settings: settings || {
        tenantId: user.tenantId,
        allowAllStaffMessaging: false,
        allowPatientMessaging: false,
        allowGuardianMessaging: false,
      }
    });
  } catch (error) {
    console.error("Error fetching messaging settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, allowAllStaffMessaging, allowPatientMessaging, allowGuardianMessaging } = z.object({
      userId: z.string().uuid(),
      allowAllStaffMessaging: z.boolean().optional(),
      allowPatientMessaging: z.boolean().optional(),
      allowGuardianMessaging: z.boolean().optional(),
    }).parse(await request.json());

    // Verify user is hospital admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: { userRoles: { with: { role: true } } }
    });

    if (user?.userRoles?.[0]?.role?.name !== "hospital_admin") {
      return NextResponse.json({ error: "Only hospital admins can update messaging settings" }, { status: 403 });
    }

    // Upsert settings
    const existingSettings = await db.query.messagingSettings.findFirst({
      where: eq(messagingSettings.tenantId, user.tenantId!)
    });

    if (existingSettings) {
      const updated = await db.update(messagingSettings)
        .set({
          allowAllStaffMessaging: allowAllStaffMessaging ?? existingSettings.allowAllStaffMessaging,
          allowPatientMessaging: allowPatientMessaging ?? existingSettings.allowPatientMessaging,
          allowGuardianMessaging: allowGuardianMessaging ?? existingSettings.allowGuardianMessaging,
        })
        .where(eq(messagingSettings.tenantId, user.tenantId!))
        .returning();
      return NextResponse.json({ settings: updated[0] });
    } else {
      const created = await db.insert(messagingSettings).values({
        tenantId: user.tenantId!,
        allowAllStaffMessaging: allowAllStaffMessaging ?? false,
        allowPatientMessaging: allowPatientMessaging ?? false,
        allowGuardianMessaging: allowGuardianMessaging ?? false,
      }).returning();
      return NextResponse.json({ settings: created[0] });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating messaging settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

