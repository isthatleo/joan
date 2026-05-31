import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { users, doctorSettings } from "@/lib/db/schema";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { slug, currentPassword, newPassword } = body;

    if (!slug || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    // Verify doctor role
    const doctorUser = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.user.id), eq(users.role, "doctor")))
      .limit(1);

    if (!doctorUser.length) {
      return NextResponse.json({ error: "Doctor access required" }, { status: 403 });
    }

    const user = doctorUser[0];

    // Verify current password
    if (!user.passwordHash) {
      return NextResponse.json({ error: "Password login is not configured for this account" }, { status: 400 });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    // Update password last changed in settings
    const existingSettings = await db.query.doctorSettings.findFirst({
      where: eq(doctorSettings.userId, session.user.id),
    });

    await db
      .insert(doctorSettings)
      .values({
        userId: session.user.id,
        settings: {
          ...((existingSettings?.settings as Record<string, any> | undefined) || {}),
          passwordLastChanged: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: doctorSettings.userId,
        set: {
          settings: {
            ...((existingSettings?.settings as Record<string, any> | undefined) || {}),
            passwordLastChanged: new Date().toISOString(),
          },
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ message: "Password changed successfully" });

  } catch (error) {
    console.error("Change password API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

